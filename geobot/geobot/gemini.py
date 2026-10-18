"""Optional: ask a Gemini vision model where the photo was taken.

Only used when GEMINI_API_KEY is set. Uses the REST generateContent endpoint
of the Gemini API (v1beta); the model is configurable via GEMINI_MODEL.
"""

import base64
import json
import logging

import aiohttp

log = logging.getLogger(__name__)
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

PROMPT = """Ты эксперт по геолокации фотографий (как в GeoGuessr). Определи, где снято фото.
Смотри на: надписи и язык, дорожные знаки и разметку, номера машин, архитектуру и материалы,
растительность и почву, рельеф, столбы и фонари, сторону движения, солнце и тени, сезон.
Не выдумывай: если признаков мало, честно снижай уверенность и увеличивай радиус.

Дополнительные данные, найденные программой (могут быть неполными):
{hints}

Ответь строго JSON-объектом без markdown:
{{
  "country": "страна или null",
  "region": "регион/область или null",
  "city": "город/населённый пункт или null",
  "place": "конкретный объект (название храма, улицы, парка) или null",
  "lat": число или null,
  "lon": число или null,
  "radius_km": число — честная оценка погрешности,
  "confidence": "high" | "medium" | "low",
  "clues": ["короткий признак → что из него следует", ...],
  "search_query": "запрос для поиска этого места в Яндекс/Google или null"
}}
Все строки — на русском."""


async def ask_gemini(session: aiohttp.ClientSession, api_key: str, model: str, jpeg: bytes, hints: str) -> dict | None:
    body = {
        "contents": [{
            "parts": [
                {"text": PROMPT.format(hints=hints or "нет")},
                {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(jpeg).decode()}},
            ]
        }],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
    }
    try:
        async with session.post(ENDPOINT.format(model=model), json=body,
                                headers={"x-goog-api-key": api_key},
                                timeout=aiohttp.ClientTimeout(total=90)) as r:
            data = await r.json(content_type=None)
            if r.status != 200:
                msg = (data.get("error") or {}).get("message", "") if isinstance(data, dict) else ""
                log.warning("gemini HTTP %s: %s", r.status, msg)
                return {"error": "quota" if r.status == 429 else f"HTTP {r.status}: {msg[:200]}"}
    except Exception as e:
        log.warning("gemini failed: %s", e)
        return None
    try:
        text = "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"])
        text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        result = json.loads(text)
        return result if isinstance(result, dict) else None
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as e:
        log.warning("gemini bad response: %s", e)
        return None
