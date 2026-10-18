"""Telegram update loop and handlers."""

import asyncio
import logging
from collections import OrderedDict
from html import escape

import aiohttp

from .analyze import analyze
from .config import Config
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
    "/id — показать ваш Telegram ID"
)


class GeoBot:
    def __init__(self, cfg: Config, http: aiohttp.ClientSession, tg: Telegram | None = None, svc: Services | None = None):
        self.cfg = cfg
        self.http = http
        self.tg = tg or Telegram(http, cfg.bot_token)
        self.svc = svc or Services(http, cfg.contact, cfg.ocr_space_key, cfg.ocr_language)
        self.busy = asyncio.Semaphore(2)  # free hosting has a fraction of one CPU
        self.dossiers: OrderedDict[str, str] = OrderedDict()
        self.tasks: set[asyncio.Task] = set()

    async def run(self) -> None:
        await self.tg.call("deleteWebhook", drop_pending_updates=True)
        log.info("bot started; allowed users: %s; gemini: %s", sorted(self.cfg.allowed_users) or "nobody",
                 "on" if self.cfg.gemini_enabled else "off")
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
        status = await self.tg.send(chat, "🔍 Анализирую фото, это займёт до минуты…")
        async with self.busy:
            try:
                data = await self.tg.download(file_id)
                rep = await analyze(data, compressed, self.cfg, self.http, self.svc)
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


async def run(cfg: Config) -> None:
    async with aiohttp.ClientSession(trust_env=True) as http:
        await GeoBot(cfg, http).run()
