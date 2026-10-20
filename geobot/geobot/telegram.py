"""Tiny Telegram Bot API client on aiohttp (aiogram alone needs ~135 MB of RAM)."""

import aiohttp


class TelegramError(Exception):
    pass


class Telegram:
    def __init__(self, session: aiohttp.ClientSession, token: str):
        self.http = session
        self.base = f"https://api.telegram.org/bot{token}/"
        self.file_base = f"https://api.telegram.org/file/bot{token}/"

    async def call(self, method: str, http_timeout: float = 60, **params):
        payload = {k: v for k, v in params.items() if v is not None}
        async with self.http.post(self.base + method, json=payload,
                                  timeout=aiohttp.ClientTimeout(total=http_timeout)) as r:
            data = await r.json(content_type=None)
        if not data.get("ok"):
            raise TelegramError(f"{method}: {data.get('description')}")
        return data["result"]

    async def get_updates(self, offset: int, poll: int = 50) -> list[dict]:
        return await self.call("getUpdates", http_timeout=poll + 15, offset=offset, timeout=poll,
                               allowed_updates=["message", "callback_query", "chat_join_request", "pre_checkout_query"])

    @staticmethod
    def _markup(buttons: list[list[dict]] | None) -> dict | None:
        return {"inline_keyboard": buttons} if buttons else None

    async def send(self, chat_id: int, text: str, buttons: list[list[dict]] | None = None,
                   keyboard: list[list[str]] | None = None) -> dict:
        """`buttons` — inline buttons under the message; `keyboard` — the menu that replaces the phone keyboard."""
        markup = self._markup(buttons) or ({"keyboard": [[{"text": t} for t in row] for row in keyboard],
                                            "resize_keyboard": True, "is_persistent": True,
                                            "input_field_placeholder": "Пришлите фото…"} if keyboard else None)
        return await self.call("sendMessage", chat_id=chat_id, text=text, parse_mode="HTML",
                               link_preview_options={"is_disabled": True}, reply_markup=markup)

    async def edit(self, chat_id: int, message_id: int, text: str, buttons: list[list[dict]] | None = None) -> None:
        await self.call("editMessageText", chat_id=chat_id, message_id=message_id, text=text, parse_mode="HTML",
                        link_preview_options={"is_disabled": True}, reply_markup=self._markup(buttons))

    async def download(self, file_id: str) -> bytes:
        info = await self.call("getFile", file_id=file_id)
        async with self.http.get(self.file_base + info["file_path"], timeout=aiohttp.ClientTimeout(total=120)) as r:
            r.raise_for_status()
            return await r.read()
