"""Optional: Gemini looks at the photo the way a GeoGuessr player does.

Only used when GEMINI_API_KEY is set. Two steps per photo:
1. a Flash-Lite model (large free quota) points at small details worth zooming into;
2. a Flash model gets the whole photo plus those details in full resolution, a cheat sheet
   of regional clues and everything the bot found, and returns observations and five
   candidate places with probabilities.
Free-tier quotas are per model, so when one model runs out the next one in the list is used.
"""

import base64
import json
import logging
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import aiohttp

log = logging.getLogger(__name__)
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
META = (Path(__file__).parent / "data" / "meta_ru.md").read_text(encoding="utf-8")

LOCATE_PROMPT = """Найди на фото до 4 небольших участков с деталями, полезными для определения места съёмки:
надписи и вывески, дорожные знаки, номера машин, столбы и фонари, бордюры и покрытие дороги, фасады и окна,
ворота и заборы, характерные растения, вершины гор. Не выбирай небо и пустые участки.
Ответь JSON-массивом: [{"box_2d": [ymin, xmin, ymax, xmax], "label": "что это, по-русски"}], координаты 0–1000."""

ANALYZE_PROMPT = """Ты — сильный игрок GeoGuessr и специалист по OSINT-геолокации. Определи, где снято фото.
Первое изображение — фото целиком, следующие — увеличенные фрагменты этого же фото (подписи к ним даны текстом).

Работай по шагам, как игрок:
1. Наблюдения: перечисли, что действительно видно — текст и язык; знаки, разметка, столбики; номера машин;
   столбы и фонари (материал, форма); бордюры, тротуар, асфальт/брусчатка/плитка; заборы, ворота, газовые трубы;
   архитектура и материалы (кирпич, панель, дерево, сайдинг, кровля); породы деревьев, почва, рельеф;
   солнце, тени, сезон; машины. Мелкие детали смотри на увеличенных фрагментах.
2. Для каждого наблюдения — что из него следует и насколько это надёжно.
3. Сверься со шпаргалкой и с данными программы.
4. Дай 5 кандидатов с вероятностями (в сумме около 100).

Правила:
- Не выдумывай: упоминай только то, что видно. Если не уверен, что это за деталь, так и скажи.
- Конкретный адрес или объект — только если есть надпись, вывеска, номер дома, уникальный объект или
  совпадение названия в данных программы. Для типовой застройки и природы кандидаты — регионы и города.
- Ты не видишь картинки из результатов поиска, только их заголовки. Не пиши, что фото «совпадает» с чьей-то карточкой.
- Вероятности честные: если улик мало, распредели их шире, а не ставь 80% на первый вариант.
{search_rule}
Шпаргалка признаков:
{meta}

Данные, найденные программой (могут быть неполными):
{hints}

Ответь строго JSON-объектом без markdown:
{{
  "observations": ["наблюдение → вывод", "..."],
  "candidates": [
    {{"place": "конкретный объект или улица, иначе null", "city": "населённый пункт или null",
      "region": "регион/область", "country": "страна", "lat": число, "lon": число,
      "radius_km": число, "probability": число}}
  ],
  "confidence": "high" | "medium" | "low",
  "search_query": "запрос для поиска этого места или null"
}}
Все строки — на русском."""

SEARCH_RULE = ("- У тебя есть поиск Google. Используй его, чтобы проверить гипотезы (есть ли в этом месте такая "
               "мечеть, магазин, памятник, как выглядит улица), но не пытайся найти само фото.\n")


def _next_pacific_midnight() -> float:
    """Free-tier daily quotas reset at midnight Pacific time."""
    try:
        from zoneinfo import ZoneInfo

        tz = ZoneInfo("America/Los_Angeles")
    except Exception:  # no tz database: assume PST
        tz = timezone(timedelta(hours=-8))
    now = datetime.now(tz)
    reset = (now + timedelta(days=1)).replace(hour=0, minute=5, second=0, microsecond=0)
    return time.time() + (reset - now).total_seconds()


def parse_json(text: str):
    text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"[\[{].*[\]}]", text, re.S)  # model wrapped JSON in prose (happens with search on)
        return json.loads(m.group(0)) if m else None


def _image(jpeg: bytes) -> dict:
    return {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(jpeg).decode()}}


class Gemini:
    def __init__(self, session: aiohttp.ClientSession, api_key: str, models: list[str], lite_models: list[str],
                 search: bool = False):
        self.http = session
        self.key = api_key
        self.models = models
        self.lite_models = lite_models
        self.search_ok = search
        self.blocked: dict[str, float] = {}  # model -> unix time until which it is out of quota / unavailable
        self.last_error = ""  # why the last generate() got no answer, per model

    def _available(self, models: list[str]) -> list[str]:
        now = time.time()
        return [m for m in models if self.blocked.get(m, 0) <= now]

    async def _call(self, model: str, parts: list[dict], json_mode: bool, search: bool) -> tuple[int, dict]:
        body: dict = {"contents": [{"parts": parts}], "generationConfig": {"temperature": 0.2}}
        if search:
            body["tools"] = [{"google_search": {}}]
        elif json_mode:
            body["generationConfig"]["responseMimeType"] = "application/json"
        async with self.http.post(ENDPOINT.format(model=model), json=body, headers={"x-goog-api-key": self.key},
                                  timeout=aiohttp.ClientTimeout(total=120)) as r:
            return r.status, await r.json(content_type=None)

    async def generate(self, parts: list[dict], lite: bool = False, search: bool = False) -> tuple[object, dict]:
        """Returns (parsed JSON or None, info {model, sources}). Walks the model list on quota errors."""
        chain = self._available(self.lite_models if lite else self.models)
        if lite:  # if every Lite model is out, the bigger ones can do the small job too
            chain += [m for m in self._available(self.models) if m not in chain]
        plain = [{"text": p["text"].replace(SEARCH_RULE, "")} if "text" in p else p for p in parts]
        errors: list[str] = []
        if not chain:
            self.last_error = "у всех моделей закончился дневной лимит или они недоступны"
        for model in chain:
            for attempt_search in ([True, False] if search and self.search_ok else [False]):
                try:
                    status, data = await self._call(model, parts if attempt_search else plain, json_mode=True,
                                                    search=attempt_search)
                except Exception as e:
                    log.warning("gemini %s failed: %s", model, e)
                    errors.append(f"{model} — нет связи")
                    break
                if status == 200:
                    try:
                        cand = data["candidates"][0]
                        text = "".join(p.get("text", "") for p in cand["content"]["parts"])
                        parsed = parse_json(text)
                    except (KeyError, IndexError, TypeError, ValueError) as e:
                        log.warning("gemini %s bad response: %s", model, e)
                        parsed, cand = None, {}
                    sources = [{"title": c["web"].get("title", ""), "uri": c["web"].get("uri", "")}
                               for c in (cand.get("groundingMetadata") or {}).get("groundingChunks", []) if c.get("web")]
                    if parsed is not None:
                        return parsed, {"model": model, "sources": sources[:5]}
                    if attempt_search:
                        continue  # retry the same model without search
                    errors.append(f"{model} — непонятный ответ")
                    break
                msg = (data.get("error") or {}).get("message", "") if isinstance(data, dict) else ""
                if attempt_search and status in (400, 403, 429):
                    # free keys may have no Search grounding quota: that refusal says nothing about
                    # the model itself, so switch search off and retry the same model without it
                    log.warning("google search refused for %s (HTTP %s): %s", model, status, msg[:150])
                    self.search_ok = False
                    continue
                if status == 429:
                    # the daily/minute distinction lives in error.details (quotaId "...PerDay...")
                    raw = json.dumps(data, ensure_ascii=False).lower()
                    delay = re.search(r'"retrydelay":\s*"(\d+)', raw)
                    daily = "perday" in raw or "per day" in raw
                    self.blocked[model] = (_next_pacific_midnight() if daily
                                           else time.time() + (int(delay.group(1)) + 5 if delay else 65))
                    errors.append(f"{model} — {'дневной' if daily else 'минутный'} лимит")
                elif status in (403, 404):
                    self.blocked[model] = time.time() + 24 * 3600  # model not available for this key
                    errors.append(f"{model} — нет такой модели или нет доступа")
                else:
                    errors.append(f"{model} — HTTP {status}: {msg[:100]}")
                log.warning("gemini %s HTTP %s: %s", model, status, msg[:300])
                break
        if errors:
            self.last_error = "; ".join(errors)
        return None, {}

    async def locate_details(self, jpeg: bytes) -> list[dict]:
        boxes, _ = await self.generate([{"text": LOCATE_PROMPT}, _image(jpeg)], lite=True)
        if isinstance(boxes, dict):
            boxes = boxes.get("boxes") or boxes.get("items") or []
        out = []
        for b in boxes if isinstance(boxes, list) else []:
            box = b.get("box_2d") if isinstance(b, dict) else None
            if isinstance(box, list) and len(box) == 4 and all(isinstance(v, (int, float)) for v in box):
                out.append({"box_2d": [float(v) for v in box], "label": str(b.get("label") or "деталь")[:60]})
        return out[:4]

    async def analyze(self, jpeg: bytes, crops: list[tuple[str, bytes]], hints: str) -> dict | None:
        prompt = ANALYZE_PROMPT.format(search_rule=SEARCH_RULE if self.search_ok else "", meta=META,
                                       hints=hints or "нет")
        parts: list[dict] = [{"text": prompt}, _image(jpeg)]
        for label, crop in crops:
            parts += [{"text": f"Увеличенный фрагмент: {label}"}, _image(crop)]
        result, info = await self.generate(parts, search=True)
        if not isinstance(result, dict):
            return None
        return normalize(result, info)


def _num(v) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _clean(v):
    return None if v is None or str(v).strip().lower() in ("", "null", "none", "нет") else str(v).strip()


def normalize(result: dict, info: dict | None = None) -> dict:
    """Flatten the answer: top candidate fields at the top level, observations as clues."""
    cands = []
    for c in result.get("candidates") or []:
        if not isinstance(c, dict):
            continue
        cands.append({"place": _clean(c.get("place")), "city": _clean(c.get("city")),
                      "region": _clean(c.get("region")), "country": _clean(c.get("country")),
                      "lat": _num(c.get("lat")), "lon": _num(c.get("lon")),
                      "radius_km": _num(c.get("radius_km")), "probability": _num(c.get("probability")) or 0})
    cands.sort(key=lambda c: -c["probability"])
    g = {"candidates": cands[:5], "clues": [str(o) for o in result.get("observations") or result.get("clues") or []],
         "confidence": result.get("confidence") if result.get("confidence") in ("high", "medium", "low") else "low",
         "search_query": _clean(result.get("search_query"))}
    top = cands[0] if cands else {k: _clean(result.get(k)) for k in ("place", "city", "region", "country")}
    for k in ("place", "city", "region", "country", "lat", "lon", "radius_km"):
        g[k] = top.get(k)
    if info:
        g["model"], g["sources"] = info.get("model"), info.get("sources") or []
    return g
