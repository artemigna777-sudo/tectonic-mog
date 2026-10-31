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


DEFAULT_MODELS = "gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3-flash-preview"
DEFAULT_LITE_MODELS = "gemini-3.5-flash-lite,gemini-3.1-flash-lite"


def _list(raw: str) -> list[str]:
    out: list[str] = []
    for x in raw.split(","):
        if x.strip() and x.strip() not in out:
            out.append(x.strip())
    return out


def _ids(raw: str) -> set[int]:
    return {int(x) for x in raw.replace(";", ",").split(",") if x.strip().isdigit()}


DEFAULT_PACKS = ((1, 5), (10, 25), (50, 100))


def _packs(raw: str) -> list[tuple[int, int]]:
    """"1:5,10:25" -> [(1, 5), (10, 25)]; "0" or "off" turns paid photos off."""
    raw = raw.strip()
    if not raw:
        return list(DEFAULT_PACKS)
    out = []
    for part in raw.replace(";", ",").split(","):
        n, _, stars = part.partition(":")
        if n.strip().isdigit() and stars.strip().isdigit() and int(n) > 0 and int(stars) > 0:
            out.append((int(n), int(stars)))
    return sorted(out)


def _int(raw: str, default: int) -> int:
    raw = raw.strip()
    return int(raw) if raw.isdigit() else default


@dataclass
class Config:
    bot_token: str
    allowed_users: set[int] = field(default_factory=set)
    ocr_space_key: str = ""
    ocr_language: str = "rus"
    gemini_api_key: str = ""
    gemini_models: list[str] = field(default_factory=lambda: _list(DEFAULT_MODELS))
    gemini_lite_models: list[str] = field(default_factory=lambda: _list(DEFAULT_LITE_MODELS))
    gemini_search: bool = False  # Search grounding is not in the free tier for Gemini 3 models
    fallback_key: str = ""  # OpenAI-compatible API used when Gemini's daily quota is out (OpenRouter by default)
    fallback_model: str = "moonshotai/kimi-k2.6:free"
    fallback_url: str = "https://openrouter.ai/api/v1/chat/completions"
    deepseek_key: str = ""  # DeepSeek's own API, tried after the first fallback
    deepseek_model: str = "deepseek-flash"
    deepseek_url: str = "https://api.deepseek.com/chat/completions"
    contact: str = "geobot"
    history_file: str = "geobot_history.json"
    history_hint: bool = True  # tell Gemini where this user's earlier photos turned out to be
    public: bool = False  # ALLOWED_USERS=* — anyone may use the bot
    admins: set[int] = field(default_factory=set)  # no daily limit, may /ban and see /admin
    daily_limit: int = 3  # free photos per user per day (Moscow time); 0 — unlimited; admins are exempt
    packs: list[tuple[int, int]] = field(default_factory=lambda: list(DEFAULT_PACKS))  # (photos, stars)
    channel_id: str = ""  # users must ask to join this channel first (-100… or @name); empty — off
    channel_link: str = ""  # invite link with join requests; empty — the bot creates one itself
    support: str = ""  # who answers /paysupport, e.g. @username
    renew_days: float = 3  # remind admins to renew the free server this often (Bot-Hosting stops it after 4 days); 0 — off
    panel_url: str = "https://bot-hosting.net/panel"
    video_time: str = "10:30"  # daily «post a TikTok» reminder to admins, Moscow time; empty — off
    users_file: str = "geobot_users.json"
    queue_limit: int = 20  # photos waiting at once; more and new ones are turned away

    def allowed(self, uid: int | None) -> bool:
        return uid is not None and (self.public or uid in self.allowed_users or uid in self.admins)

    @property
    def gemini_enabled(self) -> bool:
        return bool(self.gemini_api_key or self.fallback_key or self.deepseek_key)

    @classmethod
    def from_env(cls) -> "Config":
        token = os.environ.get("BOT_TOKEN", "").strip()
        if not token:
            raise SystemExit("BOT_TOKEN is not set (see .env.example)")
        allowed = os.environ.get("ALLOWED_USERS", "")
        users = _ids(allowed)
        return cls(
            bot_token=token,
            allowed_users=users,
            public="*" in allowed,
            # without ADMIN_USERS the IDs listed in ALLOWED_USERS are the admins (the owner, in private mode)
            admins=_ids(os.environ.get("ADMIN_USERS", "")) or users,
            daily_limit=_int(os.environ.get("DAILY_LIMIT", ""), 3),
            packs=_packs(os.environ.get("PACKS", "")),
            channel_id=os.environ.get("CHANNEL_ID", "").strip(),
            channel_link=os.environ.get("CHANNEL_LINK", "").strip(),
            support=os.environ.get("SUPPORT", "").strip(),
            renew_days=float(os.environ.get("RENEW_DAYS", "3").strip() or 0),
            panel_url=os.environ.get("PANEL_URL", "").strip() or "https://bot-hosting.net/panel",
            video_time=os.environ.get("VIDEO_REMINDER", "10:30").strip(),
            users_file=os.environ.get("USERS_FILE", "").strip() or "geobot_users.json",
            queue_limit=_int(os.environ.get("QUEUE_LIMIT", ""), 20),
            ocr_space_key=os.environ.get("OCR_SPACE_KEY", "").strip(),
            ocr_language=os.environ.get("OCR_LANGUAGE", "rus").strip() or "rus",
            gemini_api_key=os.environ.get("GEMINI_API_KEY", "").strip(),
            # GEMINI_MODEL (one model, older setting) goes first, then the rest of the fallback list
            gemini_models=_list(os.environ.get("GEMINI_MODEL", "") + "," +
                                (os.environ.get("GEMINI_MODELS", "").strip() or DEFAULT_MODELS)),
            gemini_lite_models=_list(os.environ.get("GEMINI_LITE_MODELS", "").strip() or DEFAULT_LITE_MODELS),
            gemini_search=os.environ.get("GEMINI_SEARCH", "0").strip().lower() in ("1", "yes", "on", "true"),
            fallback_key=os.environ.get("FALLBACK_KEY", "").strip(),
            fallback_model=os.environ.get("FALLBACK_MODEL", "").strip() or "moonshotai/kimi-k2.6:free",
            fallback_url=os.environ.get("FALLBACK_URL", "").strip() or "https://openrouter.ai/api/v1/chat/completions",
            deepseek_key=os.environ.get("DEEPSEEK_API_KEY", "").strip(),
            deepseek_model=os.environ.get("DEEPSEEK_MODEL", "").strip() or "deepseek-flash",
            deepseek_url=os.environ.get("DEEPSEEK_URL", "").strip() or "https://api.deepseek.com/chat/completions",
            contact=os.environ.get("CONTACT", "geobot").strip() or "geobot",
            history_file=os.environ.get("HISTORY_FILE", "").strip() or "geobot_history.json",
            history_hint=os.environ.get("HISTORY_HINT", "1").strip().lower() not in ("0", "no", "off", "false"),
        )
