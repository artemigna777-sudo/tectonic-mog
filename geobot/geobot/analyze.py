"""Run every check on a photo and pick the best-supported location."""

import asyncio
import logging
from dataclasses import dataclass, field

import aiohttp

from .config import Config
from .exif import PhotoMeta, jpeg_for_upload, read_meta
from .gemini import ask_gemini
from .services import Services, search_links
from .textclues import Clue, find_clues, geocode_queries

log = logging.getLogger(__name__)

COUNTRY_CODES = {
    "Россия": "ru", "Беларусь": "by", "Казахстан": "kz", "Украина": "ua", "Узбекистан": "uz",
    "Киргизия": "kg", "Таджикистан": "tj", "Армения": "am", "Грузия": "ge", "Азербайджан": "az",
    "Молдова": "md", "Латвия": "lv", "Литва": "lt", "Эстония": "ee", "Турция": "tr", "Сербия": "rs",
    "Польша": "pl", "Чехия": "cz", "Венгрия": "hu", "Румыния": "ro",
}


@dataclass
class Best:
    lat: float
    lon: float
    label: str
    radius_km: float
    confidence: str  # high | medium | low
    source: str


@dataclass
class Report:
    meta: PhotoMeta
    compressed: bool
    ocr_text: str = ""
    clues: list[Clue] = field(default_factory=list)
    gemini: dict | None = None
    geocoded: list[dict] = field(default_factory=list)
    image_url: str | None = None
    links: dict[str, str] = field(default_factory=dict)
    best: Best | None = None
    address: str | None = None
    commons: list[dict] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def _country_code(clues: list[Clue], gemini: dict | None) -> str:
    """ISO code to restrict geocoding to, only when the evidence agrees on one country."""
    votes: dict[str, int] = {}
    for c in clues:
        code = COUNTRY_CODES.get(c.country)
        if code:
            votes[code] = votes.get(code, 0) + c.weight
    if gemini and gemini.get("country") in COUNTRY_CODES and gemini.get("confidence") in ("high", "medium"):
        code = COUNTRY_CODES[gemini["country"]]
        votes[code] = votes.get(code, 0) + 2
    if not votes:
        return ""
    top = sorted(votes.items(), key=lambda kv: -kv[1])
    return top[0][0] if len(top) == 1 or top[0][1] > top[1][1] else ""


def _hints(meta: PhotoMeta, ocr_text: str, clues: list[Clue]) -> str:
    lines = []
    if meta.taken_at:
        lines.append(f"Время съёмки по метаданным: {meta.taken_at} {meta.utc_offset or ''}".strip())
    if meta.direction is not None:
        lines.append(f"Камера смотрела на азимут {meta.direction}°")
    if ocr_text:
        lines.append("Текст на фото (OCR): " + ocr_text.replace("\n", " | ")[:800])
    for c in clues:
        lines.append(f"Признак: {c.text} → {c.place}")
    return "\n".join(lines)


def _gemini_query(g: dict) -> str:
    parts = [g.get(k) for k in ("place", "city", "region", "country")]
    return ", ".join(str(p) for p in parts if p and str(p).lower() != "null")


def _float(v) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


async def analyze(data: bytes, compressed: bool, cfg: Config, session: aiohttp.ClientSession, svc: Services) -> Report:
    meta = read_meta(data)
    rep = Report(meta=meta, compressed=compressed)
    try:
        jpeg = await asyncio.to_thread(jpeg_for_upload, data)
    except Exception as e:
        log.warning("cannot decode image: %s", e)
        rep.notes.append("Не удалось открыть изображение.")
        return rep

    ocr_task = asyncio.create_task(svc.ocr(jpeg))
    upload_task = asyncio.create_task(svc.temp_upload(jpeg))
    rep.ocr_text = await ocr_task
    if not cfg.ocr_space_key:
        rep.notes.append("Распознавание текста выключено (нет OCR_SPACE_KEY).")
    rep.clues = find_clues(rep.ocr_text)

    if cfg.gemini_enabled:
        g = await ask_gemini(session, cfg.gemini_api_key, cfg.gemini_model, jpeg, _hints(meta, rep.ocr_text, rep.clues))
        if g and g.get("error"):
            rep.notes.append("Gemini: закончился бесплатный лимит, попробуйте позже." if g["error"] == "quota"
                             else f"Gemini: ошибка {g['error']}")
        elif g:
            rep.gemini = g
        else:
            rep.notes.append("Gemini не ответил.")

    rep.image_url = await upload_task
    if rep.image_url:
        rep.links = search_links(rep.image_url)
    else:
        rep.notes.append("Не удалось сделать временную ссылку на фото, кнопки поиска недоступны.")

    rep.best = await _pick_best(rep, svc)
    if rep.best:
        rep.address = await svc.reverse(rep.best.lat, rep.best.lon)
        if rep.best.radius_km <= 3:
            rep.commons = await svc.commons_nearby(rep.best.lat, rep.best.lon, int(rep.best.radius_km * 1000) or 300)
    return rep


async def _pick_best(rep: Report, svc: Services) -> Best | None:
    m = rep.meta
    if m.has_gps:
        return Best(m.lat, m.lon, "координаты из метаданных фото", 0.05, "high", "GPS в файле")

    country = _country_code(rep.clues, rep.gemini)
    g = rep.gemini or {}
    g_conf = g.get("confidence") if g.get("confidence") in ("high", "medium", "low") else "low"

    # 1) Gemini named a concrete place -> look it up on the map
    if g:
        q = _gemini_query(g)
        if q and (g.get("place") or g.get("city")):
            hits = await svc.geocode(q, country)
            if hits:
                h = hits[0]
                rep.geocoded.append({"query": q, "name": h.get("display_name"), "from": "gemini"})
                radius = 0.5 if g.get("place") else max(_float(g.get("radius_km")) or 10, 3)
                return Best(float(h["lat"]), float(h["lon"]), q, radius, g_conf, "Gemini + OpenStreetMap")

    # 2) An address or name read from the photo, searched inside the agreed country
    if country:
        cities = [c.place for c in rep.clues if c.level == "city"]
        for q in geocode_queries(rep.ocr_text):
            # the same street name exists in many towns: try inside a city the photo points to first
            for full, conf in [(f"{q}, {city}", "medium") for city in cities[:1] if city not in q] + [(q, None)]:
                hits = await svc.geocode(full, country)
                if hits:
                    h = hits[0]
                    rep.geocoded.append({"query": full, "name": h.get("display_name"), "from": "ocr"})
                    conf = conf or ("medium" if len(hits) == 1 else "low")
                    return Best(float(h["lat"]), float(h["lon"]), full, 1.0, conf, "текст на фото + OpenStreetMap")

    # 3) Gemini's own coordinates
    lat, lon = _float(g.get("lat")), _float(g.get("lon"))
    if lat is not None and lon is not None and -90 <= lat <= 90 and -180 <= lon <= 180:
        return Best(lat, lon, _gemini_query(g) or "оценка Gemini", _float(g.get("radius_km")) or 50, g_conf, "оценка Gemini")

    # 4) Strongest table clue (city / region), centre of that area
    for c in sorted(rep.clues, key=lambda c: (-c.weight, c.level != "city")):
        if c.level in ("city", "region") and "/" not in c.place:
            hits = await svc.geocode(c.place, country)
            if hits:
                h = hits[0]
                return Best(float(h["lat"]), float(h["lon"]), c.place, 15 if c.level == "city" else 150, "low",
                            f"справочник: {c.text}")
    return None
