"""Run every check on a photo and pick the best-supported location."""

import asyncio
import logging
from dataclasses import dataclass, field

import aiohttp

from .config import Config
from .exif import PhotoMeta, jpeg_for_upload, read_meta
from .gemini import ask_gemini
from .services import Services, YandexResult, search_links
from .textclues import Clue, find_clues, geocode_queries, is_landmark, place_phrases

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
    yandex: YandexResult | None = None
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


def _hints(meta: PhotoMeta, ocr_text: str, clues: list[Clue], ya: YandexResult | None = None) -> str:
    lines = []
    if meta.taken_at:
        lines.append(f"Время съёмки по метаданным: {meta.taken_at} {meta.utc_offset or ''}".strip())
    if meta.direction is not None:
        lines.append(f"Камера смотрела на азимут {meta.direction}°")
    if ocr_text:
        lines.append("Текст на фото (OCR): " + ocr_text.replace("\n", " | ")[:800])
    for c in clues:
        lines.append(f"Признак: {c.text} → {c.place}")
    if ya and (ya.tags or ya.sites):
        lines.append("Поиск по картинке в Яндексе (страницы с этим или очень похожим фото; "
                     "совпадения названий на нескольких страницах — сильная улика, единичные могут быть ошибкой):")
        if ya.tags:
            lines.append("  теги Яндекса: " + "; ".join(ya.tags))
        for site in ya.sites[:10]:
            lines.append(f"  - {site['title']} {site['description'][:160]}".rstrip())
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
    yandex_task = asyncio.create_task(svc.yandex(jpeg))
    rep.ocr_text = await ocr_task
    rep.yandex = await yandex_task
    if rep.yandex and rep.yandex.ocr_text and rep.yandex.ocr_text not in rep.ocr_text:
        rep.ocr_text = (rep.ocr_text + "\n" + rep.yandex.ocr_text).strip()  # Yandex reads text on the photo too
    rep.clues = find_clues(rep.ocr_text)
    if rep.yandex and rep.yandex.image_url:
        rep.image_url = rep.yandex.image_url  # public copy on Yandex's CDN works for Google Lens and Bing too
    else:
        rep.image_url = await svc.temp_upload(jpeg)
    rep.links = search_links(rep.image_url, rep.yandex.page_url if rep.yandex else None)
    if not rep.links:
        rep.notes.append("Не удалось загрузить фото в поиск по картинке.")

    if cfg.gemini_enabled:
        hints = _hints(meta, rep.ocr_text, rep.clues, rep.yandex)
        g = await ask_gemini(session, cfg.gemini_api_key, cfg.gemini_model, jpeg, hints)
        if g and g.get("error"):
            rep.notes.append("Gemini: закончился бесплатный лимит, попробуйте позже." if g["error"] == "quota"
                             else f"Gemini: ошибка {g['error']}")
        elif g:
            rep.gemini = g
        else:
            rep.notes.append("Gemini не ответил.")


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

    # 1) Gemini saw the photo and the Yandex matches and is reasonably sure
    if g and g_conf in ("high", "medium"):
        best = await _gemini_place(rep, svc, g, g_conf, country)
        if best:
            return best

    # 2) The same landmark name on several independent websites with photos like this one (Yandex)
    ya_best = await _yandex_place(rep, svc, country)
    if ya_best:
        return ya_best

    # 3) Gemini's less certain guess of a concrete place
    if g and g_conf == "low":
        best = await _gemini_place(rep, svc, g, g_conf, country)
        if best:
            return best

    # 4) An address or name read from the photo, searched inside the agreed country
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

    # 5) Gemini's own coordinates
    lat, lon = _float(g.get("lat")), _float(g.get("lon"))
    if lat is not None and lon is not None and -90 <= lat <= 90 and -180 <= lon <= 180:
        return Best(lat, lon, _gemini_query(g) or "оценка Gemini", _float(g.get("radius_km")) or 50, g_conf, "оценка Gemini")

    # 6) Strongest table clue (city / region), centre of that area
    for c in sorted(rep.clues, key=lambda c: (-c.weight, c.level != "city")):
        if c.level in ("city", "region") and "/" not in c.place:
            hits = await svc.geocode(c.place, country)
            if hits:
                h = hits[0]
                return Best(float(h["lat"]), float(h["lon"]), c.place, 15 if c.level == "city" else 150, "low",
                            f"справочник: {c.text}")
    return None


def _matches_context(display_name: str, phrase: str, context: str) -> bool:
    """True when the hit's district/region is also mentioned on the result pages."""
    skip = {"россия", "russia"}
    for part in display_name.split(","):
        part = part.strip().lower()
        if not part or part in skip or part in phrase.lower() or "федеральный округ" in part or part.isdigit():
            continue
        for word in part.replace("(", " ").split():
            # compare stems so «Татарстан» matches «Республика Татарстан», «Арский район» matches «Арском»;
            # words built from the name itself («Выборгский район» for «Выборг») prove nothing
            if word[:5] in phrase.lower():
                continue
            if len(word) >= 5 and word not in ("район", "область", "округ", "поселение", "сельское", "городской",
                                               "муниципальный", "республика", "улица") and word[:5] in context:
                return True
    return False


async def _gemini_place(rep: Report, svc: Services, g: dict, g_conf: str, country: str) -> Best | None:
    q = _gemini_query(g)
    if not q or not (g.get("place") or g.get("city")):
        return None
    for query in ([q, ", ".join(x for x in q.split(", ")[1:])] if g.get("place") else [q]):
        hits = await svc.geocode(query, country) if query else []
        if hits:
            h = hits[0]
            rep.geocoded.append({"query": query, "name": h.get("display_name"), "from": "gemini"})
            exact = g.get("place") and query == q
            radius = 0.5 if exact else max(_float(g.get("radius_km")) or 10, 3)
            return Best(float(h["lat"]), float(h["lon"]), q, radius, g_conf if exact else "low", "Gemini + OpenStreetMap")
    return None


async def _yandex_place(rep: Report, svc: Services, country: str) -> Best | None:
    ya = rep.yandex
    if not ya or not ya.sites:
        return None
    candidates = place_phrases(ya.sites)[:4]
    if candidates and not is_landmark(ya.tags):
        # reverse search recognises landmarks; for houses and streets it returns lookalikes elsewhere
        names = ", ".join(c[0] for c in candidates[:3])
        rep.notes.append(f"Яндекс нашёл похожие, но не обязательно те же места: {names}.")
        return None
    context = " ".join(f"{s['title']}. {s['description']}" for s in ya.sites).lower()
    found = []
    for phrase, sources, pages in candidates:
        for h in (await svc.geocode(phrase, country))[:3]:
            # a name alone is not enough: «Ах, Катя!» is a café, not the village Катя in Karelia
            if _matches_context(h.get("display_name") or "", phrase, context):
                found.append((phrase, sources, pages, h))
                break
    if not found:
        return None
    # most independent sites first; among equals prefer the more specific place (village beats region)
    phrase, sources, pages, h = max(found, key=lambda f: (f[1], f[2], int(f[3].get("place_rank") or 0)))
    lat, lon, radius, label = float(h["lat"]), float(h["lon"]), 3.0, phrase
    rep.geocoded.append({"query": phrase, "name": h.get("display_name"), "from": "yandex"})
    # try to pin the object itself, e.g. "церковь казанской иконы божией матери, Старое Чурилино"
    for tag in ya.tags[:2]:
        q = f"{tag}, {phrase}"
        obj = await svc.geocode(q, country)
        if obj and abs(float(obj[0]["lat"]) - lat) < 0.05 and abs(float(obj[0]["lon"]) - lon) < 0.08:
            lat, lon, radius, label = float(obj[0]["lat"]), float(obj[0]["lon"]), 0.2, q
            rep.geocoded.append({"query": q, "name": obj[0].get("display_name"), "from": "yandex"})
            break
    conf = "high" if sources >= 3 else "medium" if sources == 2 else "low"
    return Best(lat, lon, label, radius, conf, f"поиск Яндекса: «{phrase}» на {sources} разных сайтах с фото этого места")
