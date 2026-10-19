"""Free external services. Every call fails soft: it returns None/[] and logs."""

import asyncio
import base64
import html
import json
import logging
import re
import time
from dataclasses import dataclass, field
from urllib.parse import quote

import aiohttp

log = logging.getLogger(__name__)
TIMEOUT = aiohttp.ClientTimeout(total=40)
BROWSER_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")
YANDEX = "https://yandex.ru/images/search"


@dataclass
class YandexResult:
    page_url: str  # results page the user can open
    image_url: str = ""  # public copy of the photo on Yandex's CDN
    tags: list[str] = field(default_factory=list)  # "Похоже на …" labels
    sites: list[dict] = field(default_factory=list)  # pages with this image: title, description, url, domain
    ocr_text: str = ""  # text Yandex read on the photo


class Services:
    def __init__(self, session: aiohttp.ClientSession, contact: str, ocr_key: str = "", ocr_language: str = "rus"):
        self.http = session
        self.ua = {"User-Agent": f"geobot/1.0 ({contact})"}
        self.ocr_key = ocr_key
        self.ocr_language = ocr_language
        self._osm_lock = asyncio.Lock()
        self._osm_last = 0.0

    # --- OCR.space -------------------------------------------------------
    async def ocr(self, jpeg: bytes) -> str:
        if not self.ocr_key:
            return ""
        form = {
            "apikey": self.ocr_key,
            "language": self.ocr_language,
            "OCREngine": "1",
            "scale": "true",
            "detectOrientation": "true",
            "base64Image": "data:image/jpeg;base64," + base64.b64encode(jpeg).decode(),
        }
        try:
            async with self.http.post("https://api.ocr.space/parse/image", data=form, timeout=TIMEOUT) as r:
                data = await r.json(content_type=None)
        except Exception as e:
            log.warning("ocr failed: %s", e)
            return ""
        if not isinstance(data, dict) or data.get("IsErroredOnProcessing"):
            log.warning("ocr error: %s", data.get("ErrorMessage") if isinstance(data, dict) else data)
            return ""
        return "\n".join(p.get("ParsedText", "") for p in data.get("ParsedResults") or []).strip()

    # --- Yandex reverse image search (upload, no public link needed) ------
    async def yandex(self, jpeg: bytes) -> YandexResult | None:
        headers = {"User-Agent": BROWSER_UA, "Accept-Language": "ru-RU,ru;q=0.9"}
        form = aiohttp.FormData()
        form.add_field("upfile", jpeg, filename="photo.jpg", content_type="image/jpeg")
        params = {"rpt": "imageview", "format": "json",
                  "request": '{"blocks":[{"block":"b-page_type_search-by-image__link"}]}'}
        try:
            async with self.http.post(YANDEX, params=params, data=form, headers=headers, timeout=TIMEOUT) as r:
                data = await r.json(content_type=None)
            p = data["blocks"][0]["params"]
            res = YandexResult(page_url=f"{YANDEX}?rpt=imageview&cbir_id={quote(p['cbirId'], safe='')}",
                               image_url=p.get("originalImageUrl", ""))
        except Exception as e:
            log.warning("yandex upload failed: %s", e)
            return None
        try:
            async with self.http.get(res.page_url + "&cbir_page=sites", headers=headers, timeout=TIMEOUT) as r:
                page = await r.text()
            parse_yandex(page, res)
        except Exception as e:  # results page may show a captcha; the link still works for the user
            log.warning("yandex results failed: %s", e)
        return res

    # --- temporary public link for reverse image search -------------------
    async def temp_upload(self, jpeg: bytes) -> str | None:
        """Litterbox (deleted after 1 h), then tmpfiles.org (60 min) as fallback."""
        try:
            form = aiohttp.FormData()
            form.add_field("reqtype", "fileupload")
            form.add_field("time", "1h")
            form.add_field("fileToUpload", jpeg, filename="photo.jpg", content_type="image/jpeg")
            async with self.http.post("https://litterbox.catbox.moe/resources/internals/api.php",
                                      data=form, headers=self.ua, timeout=TIMEOUT) as r:
                url = (await r.text()).strip()
                if r.status == 200 and url.startswith("https://"):
                    return url
        except Exception as e:
            log.warning("litterbox failed: %s", e)
        try:
            form = aiohttp.FormData()
            form.add_field("file", jpeg, filename="photo.jpg", content_type="image/jpeg")
            async with self.http.post("https://tmpfiles.org/api/v1/upload", data=form,
                                      headers=self.ua, timeout=TIMEOUT) as r:
                data = await r.json(content_type=None)
                url = (data.get("data") or {}).get("url", "")
                if url.startswith("http"):
                    # page link -> direct file link
                    return url.replace("http://", "https://").replace("tmpfiles.org/", "tmpfiles.org/dl/", 1)
        except Exception as e:
            log.warning("tmpfiles failed: %s", e)
        return None

    # --- OpenStreetMap Nominatim (max 1 request per second) ---------------
    async def _nominatim(self, path: str, params: dict) -> list | dict | None:
        async with self._osm_lock:
            wait = 1.1 - (time.monotonic() - self._osm_last)
            if wait > 0:
                await asyncio.sleep(wait)
            try:
                async with self.http.get(f"https://nominatim.openstreetmap.org/{path}",
                                         params={**params, "format": "jsonv2", "accept-language": "ru"},
                                         headers=self.ua, timeout=TIMEOUT) as r:
                    return await r.json(content_type=None)
            except Exception as e:
                log.warning("nominatim failed: %s", e)
                return None
            finally:
                self._osm_last = time.monotonic()

    async def geocode(self, query: str, country_codes: str = "") -> list[dict]:
        params = {"q": query, "limit": 3, "addressdetails": 1}
        if country_codes:
            params["countrycodes"] = country_codes
        res = await self._nominatim("search", params)
        return res if isinstance(res, list) else []

    async def reverse(self, lat: float, lon: float) -> str | None:
        res = await self._nominatim("reverse", {"lat": lat, "lon": lon, "zoom": 16})
        return res.get("display_name") if isinstance(res, dict) else None

    # --- Wikimedia Commons photos near a point ---------------------------
    async def commons_nearby(self, lat: float, lon: float, radius_m: int = 800, limit: int = 3) -> list[dict]:
        params = {
            "action": "query", "format": "json", "generator": "geosearch",
            "ggscoord": f"{lat}|{lon}", "ggsradius": min(max(radius_m, 10), 10000),
            "ggsnamespace": 6, "ggslimit": 10, "prop": "imageinfo",
            "iiprop": "url", "iiurlwidth": 800,
        }
        try:
            async with self.http.get("https://commons.wikimedia.org/w/api.php", params=params,
                                     headers=self.ua, timeout=TIMEOUT) as r:
                data = await r.json(content_type=None)
        except Exception as e:
            log.warning("commons failed: %s", e)
            return []
        pages = sorted((data.get("query") or {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))
        out = []
        for p in pages:
            info = (p.get("imageinfo") or [{}])[0]
            thumb = info.get("thumburl")
            if thumb and thumb.lower().endswith((".jpg", ".jpeg", ".png")):
                out.append({"title": p.get("title", "").removeprefix("File:"), "thumb": thumb,
                            "page": info.get("descriptionurl", "")})
            if len(out) >= limit:
                break
        return out


def parse_yandex(page: str, res: YandexResult) -> None:
    """Pull tags and matching sites out of the results page's embedded JSON state."""
    for raw in re.findall(r'data-state="([^"]+)"', page):
        if "cbirSites" not in raw and "cbirTags" not in raw:
            continue
        try:
            state = json.loads(html.unescape(raw)).get("initialState", {})
        except (ValueError, AttributeError):
            continue
        res.tags = [t["text"] for t in (state.get("cbirTags") or {}).get("tags", []) if t.get("text")][:8]
        res.ocr_text = ((state.get("cbirOcr") or {}).get("plainText") or "").strip()
        for s in (state.get("cbirSites") or {}).get("sites", [])[:12]:
            if s.get("title"):
                res.sites.append({"title": s["title"], "description": s.get("description", ""),
                                  "url": s.get("url", ""), "domain": s.get("domain", "")})
        return


def search_links(image_url: str | None, yandex_page: str | None = None) -> dict[str, str]:
    links = {}
    if yandex_page:
        links["Яндекс"] = yandex_page
    if image_url:
        u = quote(image_url, safe="")
        links.setdefault("Яндекс", f"{YANDEX}?rpt=imageview&url={u}")
        links["Google Lens"] = f"https://lens.google.com/uploadbyurl?url={u}"
        links["Bing"] = f"https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:{u}"
    return links
