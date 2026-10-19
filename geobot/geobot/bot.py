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
    "/id — показать ваш Telegram ID"
)
ANSWER_RE = re.compile(r"^/(ответ|answer|otvet)(@\w+)?\s*", re.I)
COORDS_RE = re.compile(r"^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$")


class GeoBot:
    def __init__(self, cfg: Config, http: aiohttp.ClientSession, tg: Telegram | None = None,
                 svc: Services | None = None, gemini: Gemini | None = None, history: History | None = None,
                 gaz: Gazetteer | None = None):
        self.cfg = cfg
        self.http = http
        self.tg = tg or Telegram(http, cfg.bot_token)
        self.svc = svc or Services(http, cfg.contact, cfg.ocr_space_key, cfg.ocr_language)
        self.gemini = gemini if gemini is not None else (
            Gemini(http, cfg.gemini_api_key, cfg.gemini_models, cfg.gemini_lite_models, cfg.gemini_search)
            if cfg.gemini_enabled else None)
        self.history = history or History(cfg.history_file)
        self.gaz = gaz or Gazetteer()
        self.busy = asyncio.Semaphore(1)  # one photo at a time: a 12 MP original needs ~150 MB of the 256 MB
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
        log.info("bot started; allowed users: %s; gemini: %s", sorted(self.cfg.allowed_users) or "nobody",
                 ", ".join(self.cfg.gemini_models) if self.gemini else "off")
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
        except Exception:
            log.exception("update failed")

    async def on_message(self, msg: dict) -> None:
        chat, uid = msg["chat"]["id"], (msg.get("from") or {}).get("id")
        text = msg.get("text") or ""
        if text.startswith("/id"):
            return await self.tg.send(chat, f"Ваш Telegram ID: <code>{uid}</code>")
        if uid not in self.cfg.allowed_users:
            return await self.tg.send(chat, f"Этот бот закрытый. Ваш ID: <code>{uid}</code> — "
                                            "попросите владельца добавить его в ALLOWED_USERS.")
        answer = ANSWER_RE.match(text)
        if answer or msg.get("location"):
            return await self.on_answer(msg, text[answer.end():].strip() if answer else "")
        if text.startswith("/stats"):
            return await self.tg.send(chat, self.stats_text())
        if msg.get("photo"):
            p = msg["photo"][-1]
            return await self.process(msg, p["file_id"], p.get("file_size"), compressed=True)
        doc = msg.get("document")
        if doc:
            name = (doc.get("file_name") or "").lower()
            if (doc.get("mime_type") or "").startswith("image/") or name.endswith(IMAGE_EXT):
                return await self.process(msg, doc["file_id"], doc.get("file_size"), compressed=False)
            return await self.tg.send(chat, "Это не похоже на фото. Пришлите JPG, PNG или HEIC.")
        await self.tg.send(chat, HELP)

    async def process(self, msg: dict, file_id: str, size: int | None, compressed: bool) -> None:
        chat = msg["chat"]["id"]
        if size and size > MAX_FILE:
            return await self.tg.send(chat, "Файл больше 20 МБ — Telegram не даёт ботам скачивать такие. Пришлите поменьше.")
        status = await self.tg.send(chat, "⏳ Анализирую фото, это займёт до минуты…")

        async def progress(text: str) -> None:
            await self.tg.edit(chat, status["message_id"], text)

        prior = self.history.prior_hint(chat) if self.cfg.history_hint else ""
        async with self.busy:
            try:
                data = await self.tg.download(file_id)
                rep = await analyze(data, compressed, self.svc, self.gemini, progress, self.gaz, prior)
                del data
            except Exception:
                log.exception("analysis failed")
                return await self.tg.edit(chat, status["message_id"], "Что-то пошло не так при анализе. Попробуйте ещё раз.")

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
        lines.append("\n" + self.stats_text())
        await self.tg.send(chat, "\n".join(lines))

    def stats_text(self) -> str:
        st = self.history.stats()
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
