"""Settings come from environment variables or a .env file next to main.py."""

import os
from dataclasses import dataclass, field
from pathlib import Path


def load_dotenv(path: Path) -> None:
    """Minimal .env reader: KEY=VALUE lines, # comments; real env vars win."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _ids(raw: str) -> set[int]:
    return {int(x) for x in raw.replace(";", ",").split(",") if x.strip().isdigit()}


@dataclass
class Config:
    bot_token: str
    allowed_users: set[int] = field(default_factory=set)
    ocr_space_key: str = ""
    ocr_language: str = "rus"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    contact: str = "geobot"

    @property
    def gemini_enabled(self) -> bool:
        return bool(self.gemini_api_key)

    @classmethod
    def from_env(cls) -> "Config":
        token = os.environ.get("BOT_TOKEN", "").strip()
        if not token:
            raise SystemExit("BOT_TOKEN is not set (see .env.example)")
        return cls(
            bot_token=token,
            allowed_users=_ids(os.environ.get("ALLOWED_USERS", "")),
            ocr_space_key=os.environ.get("OCR_SPACE_KEY", "").strip(),
            ocr_language=os.environ.get("OCR_LANGUAGE", "rus").strip() or "rus",
            gemini_api_key=os.environ.get("GEMINI_API_KEY", "").strip(),
            gemini_model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash",
            contact=os.environ.get("CONTACT", "geobot").strip() or "geobot",
        )
