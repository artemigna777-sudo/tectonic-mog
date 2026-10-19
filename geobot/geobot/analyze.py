"""Run every check on a photo and pick the best-supported location."""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field

from .exif import PhotoMeta, jpeg_for_upload, read_meta
from .gemini import Gemini
from .imaging import crop_boxes
from .services import Services, YandexResult, search_links
from .textclues import Clue, find_clues, geocode_queries, is_landmark, norm_latin, place_phrases

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
    details: list[str] = field(default_factory=list)  # labels of the zoomed-in crops Gemini looked at
    notes: list[str] = field(default_factory=list)


def merge_yandex(base: YandexResult | None, extra: YandexResult | None) -> YandexResult | None:
    """Fold results of searching a crop into the full-photo search."""
    if not extra:
        return base
    if not base:
        return extra
    seen = {s["url"] for s in base.sites}
    base.sites += [s for s in extra.sites if s["url"] not in seen]
    base.tags += [t for t in extra.tags if t not in base.tags]
    if extra.ocr_text and extra.ocr_text not in base.ocr_text:
        base.ocr_text = (base.ocr_text + "\n" + extra.ocr_text).strip()
    return base


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
    if ya and ya.tags and not is_landmark(ya.tags):
        # lookalike houses elsewhere only mislead the model, so their pages are not passed on
        lines.append("Поиск по картинке в Яндексе не узнал достопримечательность (теги: " + "; ".join(ya.tags) +
                     "). Найденные им страницы — похожие дома в других местах, они не указывают на место съёмки.")
    elif ya and (ya.tags or ya.sites):
        lines.append("Поиск по картинке в Яндексе (заголовки страниц с фото этого или похожего объекта; "
                     "название, повторяющееся на нескольких разных сайтах, — сильная улика, единичное может быть ошибкой):")
        if ya.tags:
            lines.append("  теги Яндекса: " + "; ".join(ya.tags))
        for site in ya.sites[:10]:
            lines.append(f"  - {site['title']} {site['description'][:160]}".rstrip())
    return "\n".join(lines)


def _gemini_supported(rep: "Report", g: dict) -> bool:
    """Is Gemini's named place backed by something other than its own impression of the scene?"""
    if rep.clues or sum(ch.isalpha() for ch in rep.ocr_text) >= 6:
        return True  # text on the photo
    ya = rep.yandex
    if ya and ya.sites and is_landmark(ya.tags):
        context = " " + norm_latin(" ".join(f"{s['title']} {s['description']}" for s in ya.sites)) + " "
        for key in ("place", "city"):
            name = norm_latin(str(g.get(key) or ""))
            if len(name) >= 4 and f" {name} " in context:
                return True
    return False


def _gemini_query(g: dict) -> str:
    parts = [g.get(k) for k in ("place", "city", "region", "country")]
    return ", ".join(str(p) for p in parts if p and str(p).lower() != "null")


def _float(v) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


Progress = Callable[[str], Awaitable[None]]


async def analyze(data: bytes, compressed: bool, svc: Services, gemini: Gemini | None = None,
                  progress: Progress | None = None) -> Report:
    async def say(text: str) -> None:
        if progress:
            try:
                await progress(text)
            except Exception:  # a status update must never break the analysis
                pass

    meta = read_meta(data)
    rep = Report(meta=meta, compressed=compressed)
    try:
        jpeg = await asyncio.to_thread(jpeg_for_upload, data)
    except Exception as e:
        log.warning("cannot decode image: %s", e)
        rep.notes.append("Не удалось открыть изображение.")
        return rep

    await say("🔍 Читаю текст на фото и ищу его в Яндексе…")
    ocr_task = asyncio.create_task(svc.ocr(jpeg))
    yandex_task = asyncio.create_task(svc.yandex(jpeg))
    boxes_task = asyncio.create_task(gemini.locate_details(jpeg)) if gemini else None
    rep.ocr_text = await ocr_task
    rep.yandex = await yandex_task
    boxes = await boxes_task if boxes_task else []

    crops = await asyncio.to_thread(crop_boxes, data, boxes) if boxes else []
    rep.details = [label for label, _ in crops]
    if crops and not (rep.yandex and is_landmark(rep.yandex.tags)):
        # a facade or a sign searched on its own often finds what the whole frame does not
        await say("🔍 Ищу в Яндексе отдельные детали фото…")
        for extra in await asyncio.gather(*(svc.yandex(c) for _, c in crops[:2])):
            rep.yandex = merge_yandex(rep.yandex, extra)

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

    if gemini:
        await say("🤖 Gemini рассматривает фото и детали…")
        g = await gemini.analyze(jpeg, crops, _hints(meta, rep.ocr_text, rep.clues, rep.yandex))
        if g:
            rep.gemini = g
            if g.get("confidence") in ("high", "medium") and not _gemini_supported(rep, g):
                g["confidence_claimed"], g["confidence"] = g["confidence"], "low"
        else:
            rep.notes.append(f"Gemini: {gemini.last_error or 'не ответил'}.")

    await say("🗺 Проверяю место по карте…")
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

    # 3) An address or name read from the photo, searched inside the agreed country
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

    # 4) Strongest table clue (city / region), centre of that area
    for c in sorted(rep.clues, key=lambda c: (-c.weight, c.level != "city")):
        if c.level in ("city", "region") and "/" not in c.place:
            hits = await svc.geocode(c.place, country)
            if hits:
                h = hits[0]
                return Best(float(h["lat"]), float(h["lon"]), c.place, 15 if c.level == "city" else 150, "low",
                            f"справочник: {c.text}")

    # 5) Gemini's unconfirmed guess: only the region, never a made-up street address
    if g:
        return await _gemini_region(svc, g, country)
    return None


async def _gemini_region(svc: Services, g: dict, country: str) -> Best | None:
    """Gemini's most likely candidate at region level: no invented street, honest radius."""
    region, ctry = g.get("region"), g.get("country")
    query = ", ".join(str(x) for x in (region, ctry) if x)
    lat, lon = _float(g.get("lat")), _float(g.get("lon"))
    if query:
        hits = await svc.geocode(query, country)
        if hits:
            lat, lon = float(hits[0]["lat"]), float(hits[0]["lon"])
    if lat is None or lon is None or not query:
        return None
    radius = max(_float(g.get("radius_km")) or 0, 100 if region else 500)
    prob = (g.get("candidates") or [{}])[0].get("probability")
    source = f"самый вероятный кандидат Gemini ({prob:g}%)" if prob else "догадка Gemini"
    return Best(lat, lon, query, radius, "low", source + ", без подтверждений")


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
