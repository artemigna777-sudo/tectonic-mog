"""Telegram update loop and handlers."""

import asyncio
import logging
import re
from collections import OrderedDict
from html import escape

import aiohttp

from .analyze import analyze
from .config import Config
from .gazetteer import Gazetteer
from .gemini import Gemini
from .history import History
from .report import dossier, summary
from .services import Services
from .telegram import Telegram
from .users import Users

log = logging.getLogger(__name__)
MAX_FILE = 20 * 1024 * 1024  # Bot API download limit
IMAGE_EXT = (".heic", ".heif", ".jpg", ".jpeg", ".png", ".webp")

HELP = (
    "Пришлите фото — я попробую определить, где оно снято.\n\n"
    "• Лучше всего отправлять <b>файлом</b> (📎 → Файл): тогда сохраняются GPS и время съёмки.\n"
    "• Обычное фото Telegram сжимает и удаляет метаданные, но я всё равно прочитаю текст, "
    "проверю справочники и дам кнопки поиска по картинке в Яндексе и Google.\n"
    "• Кнопки поиска открываются у вас в браузере — так Яндекс работает лучше всего.\n\n"
    "Знаете правильное место? Ответьте на сообщение бота: <code>/ответ город, улица</code> "
    "(или <code>/answer</code>, можно координаты или геопозицию) — бот посчитает ошибку.\n"
    "/stats — точность бота по вашим ответам\n"
    "/buy — купить фото за звёзды ⭐\n"
    "/paysupport — вопросы по оплате\n"
    "/id — показать ваш Telegram ID"
)
ADMIN_HELP = (
    "\n\nКоманды владельца:\n"
    "/admin — сколько людей и фото, кто сколько прислал сегодня\n"
    "/ban ID — запретить пользоваться ботом, /unban ID — вернуть доступ\n"
    "/refund КОД — вернуть звёзды за покупку (код платежа видно в /admin)"
)
JOINED = ("member", "administrator", "creator", "restricted")
ANSWER_RE = re.compile(r"^/(ответ|answer|otvet)(@\w+)?\s*", re.I)
ADMIN_RE = re.compile(r"^/(admin|ban|unban|refund)(@\w+)?(?:\s+|$)", re.I)
COORDS_RE = re.compile(r"^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$")


class PhotoQueue:
    """One photo at a time (a 12 MP original needs ~150 MB of the 256 MB); paid photos go first."""

    def __init__(self):
        self.busy = False
        self.waiting: list[tuple[int, int, asyncio.Future]] = []
        self.seq = 0

    def ahead(self, paid: bool) -> int:
        prio = 0 if paid else 1
        return int(self.busy) + sum(1 for p, _, _ in self.waiting if p <= prio)

    async def acquire(self, paid: bool) -> None:
        if not self.busy and not self.waiting:
            self.busy = True
            return
        self.seq += 1
        entry = (0 if paid else 1, self.seq, asyncio.get_running_loop().create_future())
        self.waiting.append(entry)
        self.waiting.sort(key=lambda e: e[:2])
        try:
            await entry[2]
        except asyncio.CancelledError:
            if entry in self.waiting:
                self.waiting.remove(entry)
            elif entry[2].done():
                self.release()  # the turn was handed over just as we were cancelled
            raise

    def release(self) -> None:
        while self.waiting:
            _, _, fut = self.waiting.pop(0)
            if not fut.done():
                fut.set_result(None)  # busy stays True: the turn goes straight to the next photo
                return
        self.busy = False


class GeoBot:
    def __init__(self, cfg: Config, http: aiohttp.ClientSession, tg: Telegram | None = None,
                 svc: Services | None = None, gemini: Gemini | None = None, history: History | None = None,
                 gaz: Gazetteer | None = None, users: Users | None = None):
        self.cfg = cfg
        self.http = http
        self.tg = tg or Telegram(http, cfg.bot_token)
        self.svc = svc or Services(http, cfg.contact, cfg.ocr_space_key, cfg.ocr_language)
        self.gemini = gemini if gemini is not None else (
            Gemini(http, cfg.gemini_api_key, cfg.gemini_models, cfg.gemini_lite_models, cfg.gemini_search,
                   cfg.fallback_key, cfg.fallback_model, cfg.fallback_url)
            if cfg.gemini_enabled else None)
        self.history = history or History(cfg.history_file)
        self.users = users or Users(cfg.users_file)
        self.gaz = gaz or Gazetteer()
        self.queue = PhotoQueue()
        self.queued = 0  # photos waiting for or being analysed
        self.dossiers: OrderedDict[str, str] = OrderedDict()
        self.tasks: set[asyncio.Task] = set()

    async def ensure_gazetteer(self) -> None:
        if self.gaz.ready:
            return
        log.info("settlement database missing, downloading GeoNames and building it (about a minute)…")
        try:
            from .gazetteer_build import build_from

            n = await asyncio.to_thread(build_from)
            self.gaz = Gazetteer()
            log.info("settlement database ready: %s places", n)
        except Exception as e:  # the bot works without it, just with fewer clues
            log.warning("could not build settlement database: %s", e)

    async def run(self) -> None:
        await self.tg.call("deleteWebhook", drop_pending_updates=True)
        await self.ensure_gazetteer()
        who = "everyone" if self.cfg.public else sorted(self.cfg.allowed_users | self.cfg.admins) or "nobody"
        log.info("bot started; allowed users: %s; admins: %s; daily limit: %s; gemini: %s; fallback: %s", who,
                 sorted(self.cfg.admins) or "none", self.cfg.daily_limit or "off",
                 ", ".join(self.cfg.gemini_models) if self.cfg.gemini_api_key else "off",
                 self.cfg.fallback_model if self.cfg.fallback_key else "off")
        if self.cfg.channel_id and not await self.invite_link():
            log.warning("channel %s: no invite link — make the bot an admin with 'Invite users'; "
                        "until then the subscription check is off", self.cfg.channel_id)
        if self.cfg.public and not self.cfg.admins:
            log.warning("public mode without ADMIN_USERS: nobody can /ban, and your own photos count against the limit")
        offset = 0
        while True:
            try:
                updates = await self.tg.get_updates(offset)
            except Exception as e:
                log.warning("getUpdates failed: %s", e)
                await asyncio.sleep(5)
                continue
            for upd in updates:
                offset = upd["update_id"] + 1
                task = asyncio.create_task(self.handle(upd))
                self.tasks.add(task)
                task.add_done_callback(self.tasks.discard)

    async def handle(self, upd: dict) -> None:
        try:
            if "callback_query" in upd:
                await self.on_callback(upd["callback_query"])
            elif "message" in upd:
                await self.on_message(upd["message"])
            elif "chat_join_request" in upd:
                await self.on_join_request(upd["chat_join_request"])
            elif "pre_checkout_query" in upd:
                await self.on_pre_checkout(upd["pre_checkout_query"])
        except Exception:
            log.exception("update failed")

    async def on_message(self, msg: dict) -> None:
        chat, uid = msg["chat"]["id"], (msg.get("from") or {}).get("id")
        text = msg.get("text") or ""
        if msg.get("successful_payment"):  # money first: never lose a purchase to a later check
            return await self.on_paid(msg)
        if text.startswith("/paysupport"):
            return await self.tg.send(chat, self.paysupport_text())
        if text.startswith("/id"):
            return await self.tg.send(chat, f"Ваш Telegram ID: <code>{uid}</code>")
        admin = uid in self.cfg.admins
        if not admin and uid is not None and self.users.is_banned(uid):
            return await self.tg.send(chat, "Доступ к боту закрыт.")
        if not self.cfg.allowed(uid):
            return await self.tg.send(chat, f"Этот бот закрытый. Ваш ID: <code>{uid}</code> — "
                                            "попросите владельца добавить его в ALLOWED_USERS.")
        if admin and (cmd := ADMIN_RE.match(text)):
            return await self.on_admin(chat, cmd.group(1).lower(), text[cmd.end():].strip())
        wants = bool(msg.get("photo") or msg.get("document") or msg.get("location") or ANSWER_RE.match(text)
                     or text.startswith(("/stats", "/buy")))
        if wants and not admin and not await self.subscribed(uid):
            return await self.send_gate(chat)
        if text.startswith("/buy"):
            return await self.send_shop(chat, uid)
        answer = ANSWER_RE.match(text)
        if answer or msg.get("location"):
            return await self.on_answer(msg, text[answer.end():].strip() if answer else "")
        if text.startswith("/stats"):
            return await self.tg.send(chat, self.stats_text(chat))
        if msg.get("photo"):
            p = msg["photo"][-1]
            return await self.process(msg, p["file_id"], p.get("file_size"), compressed=True)
        doc = msg.get("document")
        if doc:
            name = (doc.get("file_name") or "").lower()
            if (doc.get("mime_type") or "").startswith("image/") or name.endswith(IMAGE_EXT):
                return await self.process(msg, doc["file_id"], doc.get("file_size"), compressed=False)
            return await self.tg.send(chat, "Это не похоже на фото. Пришлите JPG, PNG или HEIC.")
        await self.tg.send(chat, HELP + self.balance_text(uid, admin) + (ADMIN_HELP if admin else ""),
                           await self.gate_buttons(uid) if not admin else None)

    def _left(self, uid: int) -> int:
        return max(0, self.cfg.daily_limit - self.users.free_used(uid))

    def balance_text(self, uid: int, admin: bool = False) -> str:
        if admin or not self.cfg.daily_limit:
            return ""
        text = f"\n\nБесплатно: {self.cfg.daily_limit} фото в день, сегодня осталось {self._left(uid)}."
        if self.cfg.packs:
            text += f" Куплено фото: {self.users.credits(uid)}."
        return text

    # ─── Channel subscription ────────────────────────────────────────────────

    async def invite_link(self) -> str:
        """Join-request link to the channel: from CHANNEL_LINK, saved earlier, or made by the bot."""
        link = self.cfg.channel_link or self.users.data.get("invite", "")
        if link or not self.cfg.channel_id:
            return link
        try:
            res = await self.tg.call("createChatInviteLink", chat_id=self.cfg.channel_id, name="geobot",
                                     creates_join_request=True)
            link = res["invite_link"]
        except Exception as e:
            log.warning("cannot create channel invite link: %s", e)
            return ""
        self.users.data["invite"] = link
        self.users._save()
        return link

    async def subscribed(self, uid: int | None) -> bool:
        """Asked to join the channel (a join request is enough) or already in it. No channel — always yes."""
        if not self.cfg.channel_id or uid is None or self.users.joined(uid):
            return True
        if not await self.invite_link():
            return True  # the bot cannot invite anyone yet: do not lock everybody out
        try:
            member = await self.tg.call("getChatMember", chat_id=self.cfg.channel_id, user_id=uid)
            if member.get("status") in JOINED:
                self.users.mark_joined(uid)
                return True
        except Exception as e:
            log.warning("getChatMember failed: %s", e)
        return False

    async def gate_buttons(self, uid: int | None) -> list[list[dict]] | None:
        if not self.cfg.channel_id or await self.subscribed(uid):
            return None
        return [[{"text": "📢 Подписаться на канал", "url": await self.invite_link()}],
                [{"text": "✅ Я подписался", "callback_data": "sub"}]]

    async def send_gate(self, chat: int) -> None:
        await self.tg.send(chat, "Чтобы пользоваться ботом, подпишитесь на наш канал 👇\n\n"
                                 "Нажмите «Подписаться» и отправьте заявку — бот откроется сразу, "
                                 f"{self.cfg.daily_limit} фото в день бесплатно.",
                           await self.gate_buttons(chat))

    def _our_channel(self, chat: dict) -> bool:
        cid = self.cfg.channel_id
        return bool(cid) and (str(chat.get("id")) == cid or ("@" + (chat.get("username") or "")).lower() == cid.lower())

    async def on_join_request(self, req: dict) -> None:
        if not self._our_channel(req.get("chat") or {}):
            return
        uid = (req.get("from") or {}).get("id")
        if uid is None or not self.users.mark_joined(uid):
            return
        log.info("join request from %s", uid)
        try:  # the bot may write to someone who asked to join for 5 minutes, even if they never started it
            await self.tg.send(req.get("user_chat_id") or uid,
                               f"✅ Заявка в канал получена — бот открыт! Пришлите фото: {self.cfg.daily_limit} "
                               "в день бесплатно.")
        except Exception as e:
            log.warning("cannot greet %s: %s", uid, e)

    # ─── Telegram Stars ──────────────────────────────────────────────────────

    def _pack_buttons(self) -> list[list[dict]]:
        return [[{"text": f"{n} фото — {stars} ⭐", "callback_data": f"buy:{n}"}] for n, stars in self.cfg.packs]

    async def send_shop(self, chat: int, uid: int) -> None:
        if not self.cfg.packs:
            return await self.tg.send(chat, "Покупка фото выключена." + self.balance_text(uid))
        await self.tg.send(chat, "⭐ <b>Фото за звёзды Telegram</b>\nОплата прямо в Telegram, фото зачисляются сразу. "
                                 "Купленные фото не сгорают и обрабатываются вне очереди." + self.balance_text(uid),
                           self._pack_buttons())

    async def send_paywall(self, chat: int, uid: int) -> None:
        if not self.cfg.packs:
            return await self.tg.send(chat, f"Лимит {self.cfg.daily_limit} фото в день исчерпан. "
                                            "Приходите завтра — счётчик обнуляется в полночь по Москве.")
        await self.tg.send(chat, f"Бесплатные фото на сегодня закончились ({self.cfg.daily_limit} в день, "
                                 "новые — в полночь по Москве).\n\nМожно купить фото за звёзды Telegram ⭐ — "
                                 "они не сгорают и обрабатываются вне очереди:", self._pack_buttons())

    async def send_invoice(self, chat: int, n: int) -> None:
        stars = dict(self.cfg.packs).get(n)
        if not stars:
            return await self.tg.send(chat, "Такого пакета больше нет. Посмотрите /buy")
        await self.tg.call("sendInvoice", chat_id=chat, title=f"{n} фото для поиска места",
                           description=f"{n} фото: бот определит, где они сняты. Не сгорают, обрабатываются вне очереди.",
                           payload=f"photos:{n}:{stars}", currency="XTR",
                           prices=[{"label": f"{n} фото", "amount": stars}])

    async def on_pre_checkout(self, q: dict) -> None:
        kind, _, rest = (q.get("invoice_payload") or "").partition(":")
        n, _, stars = rest.partition(":")
        ok = (kind == "photos" and n.isdigit() and stars.isdigit()
              and dict(self.cfg.packs).get(int(n)) == q.get("total_amount") == int(stars))
        await self.tg.call("answerPreCheckoutQuery", pre_checkout_query_id=q["id"], ok=ok,
                           error_message=None if ok else "Цены изменились — откройте /buy ещё раз.")

    async def on_paid(self, msg: dict) -> None:
        pay, chat = msg["successful_payment"], msg["chat"]["id"]
        uid = (msg.get("from") or {}).get("id")
        n = int((pay.get("invoice_payload") or "photos:0").split(":")[1] or 0)
        charge = pay.get("telegram_payment_charge_id", "")
        if self.users.payment(charge):
            return  # Telegram resent the same payment
        left = self.users.add_credits(uid, n)
        self.users.add_payment(uid, pay.get("total_amount", 0), n, charge)
        log.info("payment from %s: %s stars, %s photos", uid, pay.get("total_amount"), n)
        await self.tg.send(chat, f"✅ Оплата прошла: +{n} фото. На балансе: {left}. Присылайте фото!")

    def paysupport_text(self) -> str:
        who = f"напишите {escape(self.cfg.support)}" if self.cfg.support else "напишите владельцу бота"
        return ("💬 <b>Вопросы по оплате</b>\n"
                "• Если анализ не удался, фото не списывается — оно остаётся на балансе.\n"
                "• Если ИИ перегружен и ответ получился без него, купленное фото тоже не списывается.\n"
                f"• Если что-то пошло не так с оплатой, {who} и приложите время оплаты. "
                "Звёзды возвращаются за фото, которые вы ещё не использовали.")

    async def refund(self, chat: int, charge: str) -> None:
        pay = self.users.payment(charge)
        if not pay:
            return await self.tg.send(chat, "Платёж с таким кодом не найден. Коды последних платежей — в /admin.")
        if pay["refunded"]:
            return await self.tg.send(chat, "Этот платёж уже возвращён.")
        try:
            await self.tg.call("refundStarPayment", user_id=pay["uid"], telegram_payment_charge_id=charge)
        except Exception as e:
            return await self.tg.send(chat, f"Telegram не вернул звёзды: {escape(str(e))}")
        self.users.mark_refunded(charge)
        left = self.users.add_credits(pay["uid"], -pay["photos"])
        await self.tg.send(chat, f"↩️ Возвращено {pay['stars']} ⭐ пользователю <code>{pay['uid']}</code>. "
                                 f"У него на балансе: {left} фото.")

    async def on_admin(self, chat: int, cmd: str, arg: str) -> None:
        if cmd == "admin":
            return await self.tg.send(chat, self.admin_text())
        if cmd == "refund":
            return await self.refund(chat, arg) if arg else await self.tg.send(chat, "Укажите код платежа: /refund КОД")
        target = int(arg) if arg.lstrip("-").isdigit() else None
        if target is None:
            return await self.tg.send(chat, f"Укажите ID: <code>/{cmd} 123456789</code>. "
                                            "ID видно в /admin.")
        if cmd == "ban":
            if target in self.cfg.admins:
                return await self.tg.send(chat, "Это администратор, его нельзя забанить.")
            done = self.users.ban(target)
            return await self.tg.send(chat, f"🚫 {target} забанен." if done else f"{target} уже в бане.")
        done = self.users.unban(target)
        await self.tg.send(chat, f"✅ {target} снова может пользоваться ботом." if done else f"{target} не был забанен.")

    def admin_text(self) -> str:
        st = self.users.stats()
        mode = "открыт для всех" if self.cfg.public else "только для списка ALLOWED_USERS"
        lines = [f"👥 <b>Бот {mode}</b>",
                 f"Сегодня: {st['users_today']} чел., {st['photos_today']} фото",
                 f"За 7 дней: {st['users_week']} чел.",
                 f"Всего: {st['users_total']} чел., {st['photos_total']} фото",
                 f"Бесплатно: {self.cfg.daily_limit or 'без лимита'} фото в день на человека · "
                 f"в очереди сейчас: {self.queued}"]
        if self.cfg.channel_id:
            lines.append(f"📢 Заявок в канал: {st['joined']}")
        if self.cfg.packs or st["purchases"]:
            lines.append(f"⭐ Звёзды: сегодня {st['stars_today']}, всего {st['stars_total']} ({st['purchases']} покупок)")
            for pay in reversed(st["last_payments"]):
                lines.append(f"  • <code>{pay['uid']}</code> {pay['stars']} ⭐ → {pay['photos']} фото, {pay['day']}"
                             f"{' (возврат)' if pay['refunded'] else ''}: <code>{escape(pay['charge'])}</code>")
        if st["top_today"]:
            lines.append("\n<b>Сегодня прислали:</b>")
            for uid, n in st["top_today"]:
                name = self.users.name(uid)
                lines.append(f"• <code>{uid}</code>{' ' + escape(name) if name else ''} — {n}")
        if st["banned"]:
            lines.append("\n🚫 В бане: " + ", ".join(f"<code>{u}</code>" for u in st["banned"]))
        acc = self.history.stats()
        if acc["answered"]:
            lines.append(f"\n📊 Точность по всем пользователям: {acc['answered']} ответов"
                         + (f", медианная ошибка {_fmt_km(acc['median_km'])}" if acc["median_km"] is not None else ""))
        used = getattr(self.gemini, "used", None)
        if used:
            lines.append("\n🤖 Ответы ИИ с запуска: " + ", ".join(f"{escape(m)} — {n}" for m, n in used.most_common()))
        if self.gemini and getattr(self.gemini, "last_error", ""):
            lines.append("⚠️ Последняя ошибка ИИ: " + escape(str(self.gemini.last_error)[:300]))
        return "\n".join(lines)

    async def process(self, msg: dict, file_id: str, size: int | None, compressed: bool) -> None:
        chat = msg["chat"]["id"]
        if size and size > MAX_FILE:
            return await self.tg.send(chat, "Файл больше 20 МБ — Telegram не даёт ботам скачивать такие. Пришлите поменьше.")
        user = msg.get("from") or {}
        uid = user.get("id")
        admin = uid in self.cfg.admins
        kind = "free"
        if not admin and self.cfg.daily_limit > 0 and self._left(uid) <= 0:
            if self.users.credits(uid) <= 0:
                return await self.send_paywall(chat, uid)
            kind = "paid"
        if self.queued >= self.cfg.queue_limit and not admin and kind != "paid":
            return await self.tg.send(chat, "Сейчас слишком много фото в очереди. Попробуйте через несколько минут.")
        name = "@" + user["username"] if user.get("username") else user.get("first_name", "")
        self.users.count(uid, name)
        charge = (lambda n: self.users.add_credits(uid, n)) if kind == "paid" else \
            (lambda n: self.users.use_free(uid, n)) if not admin and self.cfg.daily_limit else (lambda n: None)
        charge(-1 if kind == "paid" else 1)
        log.info("photo from %s (%s), %s", uid, name, kind)
        paid = kind == "paid" or admin
        ahead = self.queue.ahead(paid)
        self.queued += 1
        try:
            result = await self._process(msg, file_id, compressed, chat, ahead, paid)
            if result is None:  # a failed analysis does not use up the limit or a paid photo
                self.users.count(uid, n=-1)
                charge(1 if kind == "paid" else -1)
            elif kind == "paid" and not result:  # paid for the AI, but it had no quota left
                left = self.users.add_credits(uid, 1)
                await self.tg.send(chat, f"🤖 ИИ сейчас перегружен, поэтому ответ без него — это фото не списано. "
                                         f"На балансе: {left}. Попробуйте позже, лимиты ИИ обновляются в 11:00 по Москве.")
        finally:
            self.queued -= 1

    async def _process(self, msg: dict, file_id: str, compressed: bool, chat: int, ahead: int,
                       paid: bool = False) -> bool | None:
        """None — the analysis failed; otherwise whether the AI took part (or there is no AI at all)."""
        if ahead:
            status = await self.tg.send(chat, f"🕒 Вы в очереди: перед вами {ahead} фото "
                                              f"(примерно {ahead} мин.). Начну сам, ничего не нажимайте.")
        else:
            status = await self.tg.send(chat, "⏳ Анализирую фото, это займёт до минуты…")

        async def progress(text: str) -> None:
            await self.tg.edit(chat, status["message_id"], text)

        prior = self.history.prior_hint(chat) if self.cfg.history_hint else ""
        await self.queue.acquire(paid)
        try:
            if ahead:
                await progress("⏳ Ваша очередь, анализирую фото…")
            data = await self.tg.download(file_id)
            rep = await analyze(data, compressed, self.svc, self.gemini, progress, self.gaz, prior)
            del data
        except Exception:
            log.exception("analysis failed")
            await self.tg.edit(chat, status["message_id"], "Что-то пошло не так при анализе. Попробуйте ещё раз — "
                                                           "эта попытка не засчитана.")
            return None
        finally:
            self.queue.release()

        key = f"{chat}:{msg['message_id']}"
        self.dossiers[key] = dossier(rep)
        while len(self.dossiers) > 200:
            self.dossiers.popitem(last=False)
        buttons = [[{"text": f"🔎 {name}", "url": url}] for name, url in rep.links.items()]
        buttons.append([{"text": "📋 Текст для ИИ-чата", "callback_data": f"d:{key}"}])
        await self.tg.edit(chat, status["message_id"], summary(rep), buttons)
        g = rep.gemini or {}
        self.history.add(key, {
            "chat": chat, "photo_msg": msg["message_id"], "result_msg": status["message_id"],
            "best": {"lat": rep.best.lat, "lon": rep.best.lon, "label": rep.best.label,
                     "confidence": rep.best.confidence, "source": rep.best.source} if rep.best else None,
            "candidates": [{k: c.get(k) for k in ("city", "region", "country", "lat", "lon", "probability")}
                           for c in g.get("candidates") or []],
        })

        if rep.best:
            await self.tg.call("sendLocation", chat_id=chat, latitude=rep.best.lat, longitude=rep.best.lon)
        if rep.commons:
            caption = "Фото с Wikimedia Commons рядом с этой точкой — сравните с вашим:"
            try:
                if len(rep.commons) == 1:  # a media group needs at least 2 items
                    await self.tg.call("sendPhoto", chat_id=chat, photo=rep.commons[0]["thumb"], caption=caption)
                else:
                    media = [{"type": "photo", "media": c["thumb"]} for c in rep.commons]
                    media[0]["caption"] = caption
                    await self.tg.call("sendMediaGroup", chat_id=chat, media=media)
            except Exception as e:  # Telegram may refuse to fetch some URLs
                log.warning("commons media failed: %s", e)
        return rep.gemini is not None or self.gemini is None

    async def on_answer(self, msg: dict, text: str) -> None:
        chat = msg["chat"]["id"]
        reply = (msg.get("reply_to_message") or {}).get("message_id")
        found = self.history.find(chat, reply)
        if not found:
            return await self.tg.send(chat, "Сначала пришлите фото — потом можно будет указать правильный ответ.")
        key, rec = found
        loc, label = msg.get("location"), text
        if loc:
            lat, lon, label = loc["latitude"], loc["longitude"], "геопозиция"
        elif m := COORDS_RE.match(text):
            lat, lon = float(m.group(1).replace(",", ".")), float(m.group(2).replace(",", "."))
        elif text:
            hits = await self.svc.geocode(text)
            if not hits:
                return await self.tg.send(chat, f"Не нашёл «{escape(text)}» на карте. Попробуйте точнее "
                                                "(город, улица) или пришлите координаты / геопозицию.")
            lat, lon, label = float(hits[0]["lat"]), float(hits[0]["lon"]), hits[0].get("display_name") or text
        else:
            return await self.tg.send(chat, "Напишите место после команды: <code>/ответ Казань, улица Баумана</code>")
        near = self.gaz.nearest(lat, lon)
        rec = self.history.set_truth(key, lat, lon, label, near["region"] if near else None)
        lines = [f"✅ Записал правильный ответ: {escape(label[:150])}"]
        if rec.get("error_km") is not None:
            lines.append(f"Ошибка бота: <b>{_fmt_km(rec['error_km'])}</b> ({escape(rec['best']['label'][:80])})")
        else:
            lines.append("Бот тогда не поставил точку.")
        errs = rec.get("candidate_errors") or []
        if errs:
            i = min(range(len(errs)), key=errs.__getitem__)
            lines.append(f"Ближайший из кандидатов Gemini — №{i + 1}, в {_fmt_km(errs[i])} от правильного места.")
        lines.append("\n" + self.stats_text(chat))
        await self.tg.send(chat, "\n".join(lines))

    def stats_text(self, chat: int | None = None) -> str:
        st = self.history.stats(chat)
        if not st["answered"]:
            return "📊 Пока нет ни одного фото с правильным ответом. После анализа ответьте: /ответ город, улица"
        lines = [f"📊 <b>Точность</b> по {st['answered']} фото с правильным ответом:"]
        if st["median_km"] is not None:
            lines.append(f"Медианная ошибка: <b>{_fmt_km(st['median_km'])}</b>")
        for label, n in st["buckets"]:
            lines.append(f"• {label}: {n} из {st['with_point']}")
        if st["no_point"]:
            lines.append(f"• без точки: {st['no_point']}")
        if st["top5_total"]:
            lines.append(f"• правильный регион среди 5 кандидатов Gemini: {st['top5_region']} из {st['top5_total']}")
        return "\n".join(lines)

    async def on_callback(self, cb: dict) -> None:
        data = cb.get("data") or ""
        chat, uid = cb["message"]["chat"]["id"], (cb.get("from") or {}).get("id")
        if data == "sub":
            if await self.subscribed(uid):
                await self.tg.call("answerCallbackQuery", callback_query_id=cb["id"])
                return await self.tg.send(chat, "✅ Готово, бот открыт! Пришлите фото." + self.balance_text(uid))
            return await self.tg.call("answerCallbackQuery", callback_query_id=cb["id"], show_alert=True,
                                      text="Заявка пока не пришла. Нажмите «Подписаться на канал» и отправьте заявку.")
        if data.startswith("buy:") and data[4:].isdigit():
            await self.tg.call("answerCallbackQuery", callback_query_id=cb["id"])
            return await self.send_invoice(chat, int(data[4:]))
        text = self.dossiers.get(data[2:]) if data.startswith("d:") else None
        if not text:
            return await self.tg.call("answerCallbackQuery", callback_query_id=cb["id"],
                                      text="Устарело, пришлите фото ещё раз.", show_alert=True)
        await self.tg.send(cb["message"]["chat"]["id"],
                           "Скопируйте и отправьте вместе с фото в Gemini, ChatGPT или Claude:\n\n"
                           f"<pre>{escape(text)}</pre>")
        await self.tg.call("answerCallbackQuery", callback_query_id=cb["id"])


def _fmt_km(km: float) -> str:
    return f"{km * 1000:.0f} м" if km < 1 else f"{km:.0f} км" if km >= 10 else f"{km:.1f} км"


async def run(cfg: Config) -> None:
    async with aiohttp.ClientSession(trust_env=True) as http:
        await GeoBot(cfg, http).run()
