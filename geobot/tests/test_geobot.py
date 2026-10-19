import asyncio
import io
import time

from PIL import Image

from geobot.analyze import Report, _country_code, _pick_best, analyze
from geobot.config import Config
from geobot.exif import read_meta
from geobot.gemini import Gemini, normalize, parse_json
from geobot.history import History, distance_km
from geobot.imaging import crop_boxes
from geobot.report import dossier, summary
from geobot.services import YandexResult, parse_yandex, search_links
from geobot.textclues import find_clues, geocode_queries, place_phrases


def jpeg_with_gps(lat=(55, 47, 30.0), lon=(49, 7, 12.0), direction=270.0) -> bytes:
    img = Image.new("RGB", (64, 48), "white")
    exif = Image.Exif()
    exif[0x010F] = "Apple"
    exif[0x0110] = "iPhone 15"
    exif.get_ifd(0x8769).update({0x9003: "2026:10:12 14:30:00", 0x9011: "+03:00"})
    exif.get_ifd(0x8825).update({1: "N", 2: lat, 3: "E", 4: lon, 16: "T", 17: direction})
    buf = io.BytesIO()
    img.save(buf, "JPEG", exif=exif)
    return buf.getvalue()


def plain_jpeg() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 48), "gray").save(buf, "JPEG")
    return buf.getvalue()


def test_exif_gps_direction_time():
    m = read_meta(jpeg_with_gps())
    assert round(m.lat, 4) == 55.7917 and round(m.lon, 4) == 49.12
    assert m.direction == 270.0
    assert m.taken_at == "2026:10:12 14:30:00" and m.utc_offset == "+03:00"
    assert m.camera == "Apple iPhone 15"


def test_exif_missing():
    m = read_meta(plain_jpeg())
    assert not m.has_gps and m.taken_at is None
    assert not read_meta(b"not an image").has_gps


def places(text):
    return [(c.place, c.level) for c in find_clues(text)]


def test_alphabets():
    assert places("Казан шәһәре, җомга")[0] == ("Татарстан (Россия)", "region")
    assert places("Ұлттық банк")[0][0] == "Казахстан"
    assert places("Ласкава запрашаем, вуліца Ўзгорак")[0][0] == "Беларусь"
    assert places("Ласкаво просимо, вулиця Шевченка, їжа")[0][0] == "Україна".replace("Україна", "Украина")
    assert places("Добро пожаловать") == []


def test_phones_plates_domains():
    p = places("Звоните 8 (843) 123-45-67, сайт shop.ru, машина А123ВС116")
    assert ("Казань", "city") in p
    assert ("Россия", "country") in p
    assert ("Республика Татарстан", "region") in p
    assert ("Россия (регион по мобильному не определить)", "country") in places("+7 912 345-67-89")
    assert any("Беларусь" in pl for pl, _ in places("+375 29 123 45 67"))


def test_geocode_queries_prefers_addresses():
    q = geocode_queries("ООО Ромашка\nул. Баумана, 15\n12345\nok")
    assert q[0] == "ул. Баумана, 15"
    assert "12345" not in q and "ok" not in q


def test_search_links_encode_url():
    links = search_links("https://litter.catbox.moe/abc.jpg")
    assert "url=https%3A%2F%2Flitter.catbox.moe%2Fabc.jpg" in links["Яндекс"]
    assert set(links) == {"Яндекс", "Google Lens", "Bing"}
    links = search_links("https://avatars.mds.yandex.net/x/orig", "https://yandex.ru/images/search?cbir_id=1")
    assert links["Яндекс"].endswith("cbir_id=1") and "avatars.mds.yandex.net" in links["Google Lens"]
    assert search_links(None) == {}


YANDEX_PAGE = """<div data-state="{&quot;initialState&quot;:{&quot;cbirTags&quot;:{&quot;tags&quot;:[{&quot;text&quot;:&quot;церковь казанской иконы&quot;}]},
&quot;cbirSites&quot;:{&quot;sites&quot;:[
{&quot;title&quot;:&quot;Церковь Казанской иконы Божией Матери, Старое Чурилино (Арский район), фотография&quot;,&quot;description&quot;:&quot;Республика Татарстан, Арский район, Старое Чурилино&quot;,&quot;url&quot;:&quot;https://sobory.ru/photo/1&quot;},
{&quot;title&quot;:&quot;Старое Чурилино, Церковь Казанской иконы Божией Матери&quot;,&quot;description&quot;:&quot;&quot;,&quot;url&quot;:&quot;https://sobory.ru/article/2&quot;},
{&quot;title&quot;:&quot;Category:Church of the Theotokos of Kazan (Staroye Churilino) - Wikimedia Commons&quot;,&quot;description&quot;:&quot;&quot;,&quot;url&quot;:&quot;https://commons.wikimedia.org/wiki/x&quot;},
{&quot;title&quot;:&quot;Храм в селе Старое Чурилино — Новости&quot;,&quot;description&quot;:&quot;&quot;,&quot;url&quot;:&quot;https://tatmitropolia.ru/n/3&quot;}]}}}"></div>"""


def test_parse_yandex_and_place_phrases():
    r = YandexResult(page_url="p")
    parse_yandex(YANDEX_PAGE, r)
    assert r.tags == ["церковь казанской иконы"] and len(r.sites) == 4
    phrases = place_phrases(r.sites)
    # sobory.ru twice counts once; the Latin «Staroye Churilino» on Commons counts as the same name
    assert phrases[0] == ("Старое Чурилино", 3, 3)
    assert all(p[0] not in ("Казанской", "Новости", "Божией Матери") for p in phrases)


def test_one_listing_copied_across_yandex_domains_counts_once():
    sites = [{"title": "Ах, Катя! - 30 отзывов", "url": f"https://yandex.{tld}/maps/user/1"} for tld in ("ru", "com", "kz")]
    assert place_phrases(sites) == [("Катя", 1, 3)]


def test_lookalike_houses_are_not_an_answer():
    page = YANDEX_PAGE.replace("церковь казанской иконы", "коттедж")
    svc = FakeSvc(ya_page=page, geo={"Старое Чурилино": (56.0272, 49.7291, "Старое Чурилино, Арский район, Татарстан")})
    rep = asyncio.run(analyze(plain_jpeg(), True, svc))
    assert rep.best is None and any("похожие" in n for n in rep.notes)


class FakeSvc:
    def __init__(self, ocr_text="", geo=None, ya_page=""):
        self.ocr_text, self.geo, self.queries, self.ya_page = ocr_text, geo or {}, [], ya_page

    async def ocr(self, jpeg):
        return self.ocr_text

    async def temp_upload(self, jpeg):
        return "https://litter.catbox.moe/x.jpg"

    async def yandex(self, jpeg):
        self.yandex_calls = getattr(self, "yandex_calls", 0) + 1
        if not self.ya_page:
            return None
        r = YandexResult(page_url="https://yandex.ru/images/search?cbir_id=1", image_url="https://avatars.mds.yandex.net/o")
        parse_yandex(self.ya_page, r)
        return r

    async def geocode(self, q, cc=""):
        self.queries.append((q, cc))
        hit = self.geo.get(q)
        if not hit:
            return []
        name = hit[2] if len(hit) > 2 else q
        return [{"lat": str(hit[0]), "lon": str(hit[1]), "display_name": name}]

    async def reverse(self, lat, lon):
        return "где-то рядом"

    async def commons_nearby(self, lat, lon, radius_m=800, limit=3):
        return [{"title": "x", "thumb": "https://upload.wikimedia.org/x.jpg", "page": ""}]


CFG = Config(bot_token="1:x", allowed_users={1}, ocr_space_key="k")


def test_analyze_uses_gps_first():
    rep = asyncio.run(analyze(jpeg_with_gps(), False, FakeSvc()))
    assert rep.best.source == "GPS в файле" and rep.best.confidence == "high"
    assert rep.links and rep.commons and rep.address
    text = summary(rep)
    assert "55.79" in text and "азимут 270" in text


def test_analyze_geocodes_ocr_address_in_agreed_country():
    svc = FakeSvc("ул. Баумана, 15\nтел. 8 (843) 123-45-67", geo={"ул. Баумана, 15": (55.79, 49.11)})
    rep = asyncio.run(analyze(plain_jpeg(), True, svc))
    assert rep.best and rep.best.source.startswith("текст на фото")
    assert ("ул. Баумана, 15", "ru") in svc.queries
    assert "файлом" in summary(rep)  # compressed photo -> hint to send as file
    assert "Казань" in dossier(rep)


def test_city_clue_fallback_and_nothing_found():
    svc = FakeSvc("тел. 8 (843) 123-45-67", geo={"Казань": (55.79, 49.12)})
    rep = asyncio.run(analyze(plain_jpeg(), True, svc))
    assert rep.best.label == "Казань" and rep.best.confidence == "low"
    rep2 = asyncio.run(analyze(plain_jpeg(), True, FakeSvc()))
    assert rep2.best is None and "не удалось" in summary(rep2).lower()


def test_gemini_place_is_geocoded():
    rep = Report(meta=read_meta(plain_jpeg()), compressed=True)
    rep.gemini = {"place": "Церковь Казанской иконы", "city": "Старое Чурилино", "country": "Россия",
                  "confidence": "medium", "radius_km": 5}
    q = "Церковь Казанской иконы, Старое Чурилино, Россия"
    svc = FakeSvc(geo={q: (56.027, 49.729)})
    best = asyncio.run(_pick_best(rep, svc))
    assert best.lat == 56.027 and best.confidence == "medium" and svc.queries == [(q, "ru")]


def test_country_code_needs_agreement():
    assert _country_code(find_clues("сайт a.ru"), None) == "ru"
    assert _country_code(find_clues("сайт a.ru, b.kz"), None) == ""


class FakeTG:
    def __init__(self, file=b""):
        self.calls, self.file = [], file

    async def call(self, method, **params):
        self.calls.append((method, params))
        return {"message_id": 99}

    async def send(self, chat_id, text, buttons=None):
        return await self.call("sendMessage", chat_id=chat_id, text=text, buttons=buttons)

    async def edit(self, chat_id, message_id, text, buttons=None):
        return await self.call("editMessageText", chat_id=chat_id, text=text, buttons=buttons)

    async def download(self, file_id):
        return self.file


def test_bot_flow_photo_and_access(tmp_path):
    from geobot.bot import GeoBot

    tg = FakeTG(jpeg_with_gps())
    bot = GeoBot(CFG, None, tg=tg, svc=FakeSvc(), history=History(tmp_path / "h.json"))
    asyncio.run(bot.handle({"update_id": 1, "message": {"message_id": 5, "chat": {"id": 1}, "from": {"id": 1},
                                                         "document": {"file_id": "f", "mime_type": "image/jpeg"}}}))
    methods = [m for m, _ in tg.calls]
    assert methods[0] == "sendMessage" and "sendLocation" in methods and "sendPhoto" in methods
    edit = [params for m, params in tg.calls if m == "editMessageText" and params.get("buttons")][0]
    assert any("Яндекс" in b[0]["text"] for b in edit["buttons"])
    assert edit["buttons"][-1][0]["callback_data"] == "d:1:5"

    asyncio.run(bot.handle({"update_id": 2, "callback_query": {"id": "q", "data": "d:1:5",
                                                               "message": {"chat": {"id": 1}}}}))
    assert "Где снято это фото" in tg.calls[-2][1]["text"]

    tg2 = FakeTG()
    stranger = GeoBot(CFG, None, tg=tg2, svc=FakeSvc(), history=History(tmp_path / "h2.json"))
    asyncio.run(stranger.handle({"update_id": 3, "message": {"message_id": 1, "chat": {"id": 7}, "from": {"id": 7},
                                                              "photo": [{"file_id": "x"}]}}))
    assert len(tg2.calls) == 1 and "закрытый" in tg2.calls[0][1]["text"]


def test_street_is_searched_inside_city_from_phone_code():
    svc = FakeSvc("ул. Баумана, 19\nтел. 8 (843) 292-00-00",
                  geo={"ул. Баумана, 19, Казань": (55.791, 49.114), "ул. Баумана, 19": (1, 1)})
    rep = asyncio.run(analyze(plain_jpeg(), True, svc))
    assert rep.best.label == "ул. Баумана, 19, Казань" and rep.best.confidence == "medium"
    assert svc.queries[0] == ("ул. Баумана, 19, Казань", "ru")


def test_yandex_matches_pin_the_place_and_object():
    svc = FakeSvc(ya_page=YANDEX_PAGE, geo={"Старое Чурилино": (56.0272, 49.7291, "Старое Чурилино, Арский район, Татарстан, Россия"),
                                             "церковь казанской иконы, Старое Чурилино": (56.0281, 49.7302)})
    rep = asyncio.run(analyze(plain_jpeg(), True, svc))
    assert rep.best.confidence == "high" and rep.best.radius_km == 0.2
    assert (rep.best.lat, rep.best.lon) == (56.0281, 49.7302)
    assert "Яндекс" in rep.links and rep.links["Яндекс"].endswith("cbir_id=1")
    text = summary(rep)
    assert "Яндекс нашёл" in text and "Старое Чурилино" in text


def test_yandex_name_without_matching_region_is_ignored():
    page = YANDEX_PAGE.replace("Старое Чурилино", "Ах Катя").replace("Арский район", "Ярославский район") \
                      .replace("Республика Татарстан", "Ярославская область")
    svc = FakeSvc(ya_page=page, geo={"Ах Катя": (61.8, 30.7, "Катя, Сортавальский округ, Карелия, Россия")})
    rep = asyncio.run(analyze(plain_jpeg(), True, svc))
    assert rep.best is None


class FakeGemini:
    def __init__(self, answer, boxes=()):
        self.answer, self.boxes, self.seen, self.last_error = answer, list(boxes), {}, ""

    async def locate_details(self, jpeg):
        return self.boxes

    async def analyze(self, jpeg, crops, hints):
        self.seen.update(hints=hints, crops=crops)
        return normalize(dict(self.answer)) if self.answer else None


def run_with_gemini(answer, svc, boxes=()):
    gem = FakeGemini(answer, boxes)
    return asyncio.run(analyze(plain_jpeg(), True, svc, gem)), gem.seen


LOOKALIKE_PAGE = YANDEX_PAGE.replace("церковь казанской иконы", "коттедж").replace("Старое Чурилино", "Лесная сказка")


def test_unsupported_confident_gemini_is_downgraded_to_region():
    answer = {"place": "ЖК «Лесная сказка»", "city": "Красный Бор", "region": "Ярославская область",
              "country": "Россия", "confidence": "high", "radius_km": 0.5}
    svc = FakeSvc(ya_page=LOOKALIKE_PAGE, geo={"Ярославская область, Россия": (57.8, 39.5),
                                                "ЖК «Лесная сказка», Красный Бор, Ярославская область, Россия": (57.6, 40.0)})
    rep, seen = run_with_gemini(answer, svc)
    # lookalike pages are not shown to Gemini at all
    assert "Лесная сказка" not in seen["hints"] and "похожие дома" in seen["hints"]
    assert rep.gemini["confidence"] == "low" and rep.gemini["confidence_claimed"] == "high"
    assert rep.best.label == "Ярославская область, Россия" and rep.best.radius_km >= 100
    assert rep.best.confidence == "low"
    assert "точный адрес не ставлю" in summary(rep)


def test_gemini_backed_by_landmark_matches_keeps_its_confidence():
    answer = {"place": "Церковь Казанской иконы", "city": "Старое Чурилино", "region": "Татарстан",
              "country": "Россия", "confidence": "high"}
    q = "Церковь Казанской иконы, Старое Чурилино, Татарстан, Россия"
    svc = FakeSvc(ya_page=YANDEX_PAGE, geo={q: (56.028, 49.730)})
    rep, seen = run_with_gemini(answer, svc)
    assert "Старое Чурилино" in seen["hints"]
    assert rep.gemini["confidence"] == "high" and rep.best.confidence == "high" and rep.best.radius_km == 0.5


def test_noise_words_are_not_places():
    sites = [{"title": "Продажа двухкомнатной квартиры, Быково", "url": f"https://s{i}.ru/x"} for i in range(3)]
    assert all(p[0] != "Продажа" for p in place_phrases(sites))


# --- stage 1: zoomed details, model fallback, candidates, accuracy tracking ---------------------

def test_crop_boxes_cut_sharp_details_from_original():
    img = Image.new("RGB", (4000, 3000), "white")
    img.paste((255, 0, 0), (1000, 1000, 1400, 1200))  # a small red "sign"
    buf = io.BytesIO()
    img.save(buf, "JPEG")
    crops = crop_boxes(buf.getvalue(), [{"box_2d": [333, 250, 400, 350], "label": "вывеска"},
                                        {"box_2d": [500, 500, 500, 600], "label": "пусто"}])
    assert [label for label, _ in crops] == ["вывеска"]
    piece = Image.open(io.BytesIO(crops[0][1]))
    assert max(piece.size) == 768
    r, g, b = piece.getpixel((piece.width // 2, piece.height // 2))
    assert r > 200 and g < 60


def test_normalize_sorts_candidates_and_flattens_top():
    g = normalize({"observations": ["бетонный столб → СНГ"], "confidence": "medium", "candidates": [
        {"region": "Чувашия", "country": "Россия", "lat": 55.5, "lon": 47.2, "probability": 20},
        {"region": "Татарстан", "country": "Россия", "city": "null", "lat": 55.8, "lon": 49.1, "probability": "45"}]})
    assert [c["region"] for c in g["candidates"]] == ["Татарстан", "Чувашия"]
    assert g["region"] == "Татарстан" and g["city"] is None and g["lat"] == 55.8
    assert g["clues"] == ["бетонный столб → СНГ"]
    assert parse_json('Вот ответ: {"a": 1} — готово') == {"a": 1}


class FakeResp:
    def __init__(self, status, data):
        self.status, self.data = status, data

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def json(self, content_type=None):
        return self.data


class FakeHTTP:
    """Scripted Gemini endpoint: script maps model -> list of (status, payload) per call."""

    def __init__(self, script):
        self.script, self.calls, self.prompts = script, [], []

    def post(self, url, json=None, headers=None, timeout=None):
        model = url.split("/models/")[1].split(":")[0]
        self.calls.append((model, "tools" in json))
        self.prompts.append(json["contents"][0]["parts"][0].get("text", ""))
        return FakeResp(*self.script[model].pop(0))


def ok(text, chunks=()):
    return 200, {"candidates": [{"content": {"parts": [{"text": text}]},
                                 "groundingMetadata": {"groundingChunks": [{"web": c} for c in chunks]}}]}


def test_gemini_falls_back_to_next_model_and_drops_search_when_refused():
    http = FakeHTTP({
        "m1": [(429, {"error": {"message": "Quota exceeded for metric: free_tier_requests, limit: 20", "details": [
            {"@type": "type.googleapis.com/google.rpc.QuotaFailure",
             "violations": [{"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]},
            {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "41s"}]}})],
        "m2": [(400, {"error": {"message": "Search grounding is not supported"}}),
               ok('{"candidates": [{"region": "Татарстан", "country": "Россия", "probability": 60}], "confidence": "low"}')],
    })
    gem = Gemini(http, "k", ["m1", "m2"], ["lite"], search=True)
    g = asyncio.run(gem.analyze(b"jpeg", [("столб", b"crop")], "нет"))
    assert g["region"] == "Татарстан" and g["model"] == "m2"
    assert http.calls == [("m1", True), ("m2", True), ("m2", False)]
    assert "поиск Google" in http.prompts[0] and "поиск Google" not in http.prompts[2]
    assert gem.search_ok is False and gem.blocked["m1"] - time.time() > 3600  # daily quota: blocked till reset
    # m1 stays blocked until the daily reset, so the next photo goes straight to m2
    http.script["m2"] = [ok('{"candidates": [], "confidence": "low"}')]
    asyncio.run(gem.analyze(b"jpeg", [], "нет"))
    assert http.calls[-1] == ("m2", False)


def test_gemini_keeps_google_sources_when_search_works():
    http = FakeHTTP({"m1": [ok('```json\n{"candidates": [{"region": "Татарстан", "probability": 50}]}\n```',
                               chunks=[{"title": "Дубровка — Википедия", "uri": "https://x"}])]})
    g = asyncio.run(Gemini(http, "k", ["m1"], []).analyze(b"jpeg", [], "нет"))
    assert g["sources"][0]["title"].startswith("Дубровка")


def test_locate_details_uses_lite_then_bigger_models():
    http = FakeHTTP({"lite": [(429, {"error": {"message": "limit", "details": [{"retryDelay": "20s"}]}})],
                     "m1": [ok('[{"box_2d": [10, 20, 300, 400], "label": "столб"}, {"box_2d": "bad"}]')]})
    gem = Gemini(http, "k", ["m1"], ["lite"])
    boxes = asyncio.run(gem.locate_details(b"jpeg"))
    assert boxes == [{"box_2d": [10.0, 20.0, 300.0, 400.0], "label": "столб"}]
    assert [c[0] for c in http.calls] == ["lite", "m1"]
    assert 20 < gem.blocked["lite"] - time.time() < 30  # per-minute limit: short pause from retryDelay


def test_analyze_zooms_details_and_searches_them_in_yandex():
    big = io.BytesIO()
    Image.new("RGB", (2000, 1500), "gray").save(big, "JPEG")
    svc = FakeSvc(ya_page=LOOKALIKE_PAGE, geo={"Татарстан, Россия": (55.5, 50.5)})
    answer = {"candidates": [{"region": "Татарстан", "country": "Россия", "probability": 40, "lat": 55.8, "lon": 49.1},
                             {"region": "Чувашия", "country": "Россия", "probability": 25}], "confidence": "low"}
    gem = FakeGemini(answer, boxes=[{"box_2d": [100, 100, 400, 400], "label": "фасад"},
                                    {"box_2d": [500, 500, 900, 900], "label": "столб"}])
    rep = asyncio.run(analyze(big.getvalue(), True, svc, gem))
    assert [label for label, _ in gem.seen["crops"]] == ["фасад", "столб"]
    assert svc.yandex_calls == 3  # whole photo + two crops (no landmark recognised on the whole photo)
    assert rep.best.label == "Татарстан, Россия" and rep.best.radius_km >= 100 and "40%" in rep.best.source
    text = summary(rep)
    assert "1. Татарстан, Россия — <b>40%</b>" in text and "Рассмотрел крупно: фасад, столб" in text


def test_history_measures_error_and_stats(tmp_path):
    h = History(tmp_path / "h.json")
    h.add("1:5", {"chat": 1, "photo_msg": 5, "result_msg": 6, "best": {"lat": 55.79, "lon": 49.12, "label": "Казань"},
                  "candidates": [{"lat": 56.0, "lon": 49.0}, {"lat": 55.85, "lon": 48.52}]})
    assert h.find(1, reply_to=6)[0] == "1:5" and h.find(1)[0] == "1:5" and h.find(2) is None
    rec = h.set_truth("1:5", 55.85, 48.52, "Дубровка")
    assert 35 < rec["error_km"] < 45 and min(rec["candidate_errors"]) < 0.1
    st = History(tmp_path / "h.json").stats()  # reloaded from disk
    assert st["answered"] == 1 and st["buckets"][1] == ("до 25 км (город)", 0) and st["buckets"][2][1] == 1
    assert st["top5_region"] == 1
    assert abs(distance_km(55.75, 37.62, 59.94, 30.31) - 634) < 5  # Moscow - St Petersburg


def test_bot_answer_command_location_and_stats(tmp_path):
    from geobot.bot import GeoBot

    tg = FakeTG(jpeg_with_gps())
    svc = FakeSvc(geo={"Дубровка, Зеленодольский район": (55.85, 48.52, "Дубровка, Зеленодольский район, Татарстан")})
    bot = GeoBot(CFG, None, tg=tg, svc=svc, history=History(tmp_path / "h.json"))
    msg = {"message_id": 5, "chat": {"id": 1}, "from": {"id": 1}}
    asyncio.run(bot.handle({"update_id": 1, "message": {**msg, "document": {"file_id": "f", "mime_type": "image/jpeg"}}}))
    asyncio.run(bot.handle({"update_id": 2, "message": {**msg, "message_id": 8, "text": "/ответ Дубровка, Зеленодольский район",
                                                         "reply_to_message": {"message_id": 99}}}))
    reply = tg.calls[-1][1]["text"]
    assert "Записал правильный ответ" in reply and "Ошибка бота" in reply and "Точность" in reply
    asyncio.run(bot.handle({"update_id": 3, "message": {**msg, "message_id": 9,
                                                         "location": {"latitude": 55.7917, "longitude": 49.12}}}))
    assert "Ошибка бота: <b>" in tg.calls[-1][1]["text"]
    asyncio.run(bot.handle({"update_id": 4, "message": {**msg, "message_id": 10, "text": "/answer 55.79, 49.12"}}))
    asyncio.run(bot.handle({"update_id": 5, "message": {**msg, "message_id": 11, "text": "/stats"}}))
    assert "по 1 фото" in tg.calls[-1][1]["text"]
