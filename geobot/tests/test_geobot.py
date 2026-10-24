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
from geobot.users import Users
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

    async def send(self, chat_id, text, buttons=None, keyboard=None):
        return await self.call("sendMessage", chat_id=chat_id, text=text, buttons=buttons, keyboard=keyboard)

    async def edit(self, chat_id, message_id, text, buttons=None):
        return await self.call("editMessageText", chat_id=chat_id, text=text, buttons=buttons)

    async def download(self, file_id):
        return self.file


def test_bot_flow_photo_and_access(tmp_path):
    from geobot.bot import GeoBot

    tg = FakeTG(jpeg_with_gps())
    bot = GeoBot(CFG, None, tg=tg, svc=FakeSvc(), history=History(tmp_path / "h.json"), users=Users(tmp_path / "hu.json"))
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
    stranger = GeoBot(CFG, None, tg=tg2, svc=FakeSvc(), history=History(tmp_path / "h2.json"), users=Users(tmp_path / "h2u.json"))
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


def test_gemini_falls_back_to_next_model_on_daily_quota():
    http = FakeHTTP({
        "m1": [(429, {"error": {"message": "Quota exceeded for metric: free_tier_requests, limit: 20", "details": [
            {"@type": "type.googleapis.com/google.rpc.QuotaFailure",
             "violations": [{"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]},
            {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "41s"}]}})],
        "m2": [ok('{"candidates": [{"region": "Татарстан", "country": "Россия", "probability": 60}], "confidence": "low"}')],
    })
    gem = Gemini(http, "k", ["m1", "m2"], ["lite"])
    g = asyncio.run(gem.analyze(b"jpeg", [("столб", b"crop")], "нет"))
    assert g["region"] == "Татарстан" and g["model"] == "m2"
    assert http.calls == [("m1", False), ("m2", False)]
    assert gem.blocked["m1"] - time.time() > 3600  # daily quota: blocked till the reset
    # so the next photo goes straight to m2
    http.script["m2"] = [ok('{"candidates": [], "confidence": "low"}')]
    asyncio.run(gem.analyze(b"jpeg", [], "нет"))
    assert http.calls[-1] == ("m2", False)


def test_unsupported_search_is_dropped_and_its_prompt_line_removed():
    http = FakeHTTP({"m1": [(400, {"error": {"message": "Search grounding is not supported"}}),
                            ok('{"candidates": [{"region": "Татарстан", "probability": 60}]}')]})
    gem = Gemini(http, "k", ["m1"], [], search=True)
    assert asyncio.run(gem.analyze(b"jpeg", [], "нет"))["region"] == "Татарстан"
    assert http.calls == [("m1", True), ("m1", False)] and gem.search_ok is False
    assert "поиск Google" in http.prompts[0] and "поиск Google" not in http.prompts[1]


def test_gemini_keeps_google_sources_when_search_works():
    http = FakeHTTP({"m1": [ok('```json\n{"candidates": [{"region": "Татарстан", "probability": 50}]}\n```',
                               chunks=[{"title": "Дубровка — Википедия", "uri": "https://x"}])]})
    g = asyncio.run(Gemini(http, "k", ["m1"], [], search=True).analyze(b"jpeg", [], "нет"))
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
    bot = GeoBot(CFG, None, tg=tg, svc=svc, history=History(tmp_path / "h.json"), users=Users(tmp_path / "hu.json"))
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


def test_search_quota_refusal_does_not_block_the_model():
    # free keys answer 429 to Search grounding on Gemini 3: the model itself is fine
    http = FakeHTTP({"m1": [(429, {"error": {"message": "Search grounding quota", "details": [
                                {"violations": [{"quotaId": "SearchGroundingRequestsPerDay-FreeTier"}]}]}}),
                            ok('{"candidates": [{"region": "Татарстан", "probability": 50}]}')]})
    gem = Gemini(http, "k", ["m1"], [], search=True)
    g = asyncio.run(gem.analyze(b"jpeg", [], "нет"))
    assert g["region"] == "Татарстан" and "m1" not in gem.blocked and gem.search_ok is False
    assert http.calls == [("m1", True), ("m1", False)]


def test_all_failures_are_reported_per_model():
    http = FakeHTTP({"a": [(404, {"error": {"message": "not found"}})],
                     "b": [(429, {"error": {"message": "x", "details": [{"quotaId": "PerDay"}]}})]})
    gem = Gemini(http, "k", ["a", "b"], [])
    assert asyncio.run(gem.analyze(b"jpeg", [], "нет")) is None
    assert gem.last_error == "a — нет такой модели или нет доступа; b — дневной лимит"
    assert asyncio.run(gem.analyze(b"jpeg", [], "нет")) is None and "дневной лимит" in gem.last_error
    assert Config(bot_token="1:x").gemini_search is False


def test_crop_search_results_are_kept_only_for_landmarks():
    big = io.BytesIO()
    Image.new("RGB", (1200, 900), "gray").save(big, "JPEG")

    class SignSvc(FakeSvc):
        async def yandex(self, jpeg):
            r = await super().yandex(jpeg)
            if self.yandex_calls > 1:  # crops: a road sign found a music album
                r.tags, r.sites = ["знаки пдд"], [{"title": "Помню в том апреле Вилка", "description": "",
                                                    "url": "https://music.yandex.ru/x", "domain": "music.yandex.ru"}]
            return r

    svc = SignSvc(ya_page=LOOKALIKE_PAGE)
    gem = FakeGemini(None, boxes=[{"box_2d": [100, 100, 400, 400], "label": "знак"}])
    rep = asyncio.run(analyze(big.getvalue(), True, svc, gem))
    assert svc.yandex_calls == 2 and not any("Вилка" in s["title"] for s in rep.yandex.sites)


# --- stage 2: settlement gazetteer, highways, brands, user prior -------------------------------

def tiny_gazetteer(tmp_path):
    from geobot.gazetteer import Gazetteer
    from geobot.gazetteer_build import build

    places = [  # name, ascii, alt names, lat, lon, admin1 (GeoNames), population
        ("Kazan", "Kazan", "Казань,Казан", 55.79, 49.12, "73", 1243500),
        ("Dubrovka", "Dubrovka", "Дубровка", 55.8674, 48.8056, "73", 0),
        ("Dubrovka", "Dubrovka", "Дубровка", 57.1, 34.9, "77", 0),
        ("Dubrovka", "Dubrovka", "Дубровка", 53.69, 33.50, "10", 8427),
        ("Innopolis", "Innopolis", "Иннополис", 55.75, 48.75, "73", 96),
        ("Moskva", "Moscow", "Москва", 55.75, 37.62, "48", 10381222),
        ("Vladimir", "Vladimir", "Владимир", 56.13, 40.40, "83", 357024),
        ("Nizhniy Novgorod", "Nizhniy Novgorod", "Нижний Новгород", 56.33, 44.0, "51", 1259013),
        ("Cheboksary", "Cheboksary", "Чебоксары", 56.13, 47.25, "16", 492331),
        ("Naberezhnye Chelny", "Naberezhnye Chelny", "Набережные Челны", 55.74, 52.41, "73", 509870),
        ("Ufa", "Ufa", "Уфа,Ufа", 54.74, 55.97, "08", 1120547),
        ("Zagorodnaya", "Zagorodnaya", "Загородная", 58.5, 31.3, "52", 0),
    ]
    lines = [f"{i}\t{n}\t{a}\t{alt}\t{lat}\t{lon}\tP\tPPL\tRU\t\t{adm}\t\t\t\t{pop}\t\t\t\t2026-01-01\n"
             for i, (n, a, alt, lat, lon, adm, pop) in enumerate(places)]
    lines.append("99\tVolga\tVolga\tВолга\t55\t49\tH\tSTM\tRU\t\t73\t\t\t\t0\t\t\t\t2026-01-01\n")  # a river: skipped
    path = tmp_path / "places.sqlite"
    assert build(lines, path) == len(places)
    return Gazetteer(path)


def test_gazetteer_lookup_nearest_and_region_aliases(tmp_path):
    from geobot.gazetteer import regions_in

    gaz = tiny_gazetteer(tmp_path)
    assert gaz.biggest("казань")["name"] == "Казань"  # Russian spelling preferred over Tatar «Казан»
    assert gaz.biggest("Уфа")["name"] == "Уфа"  # not the mixed-script «Ufа»
    assert len(gaz.lookup("Дубровка")) == 3 and gaz.lookup("Волга") == []
    assert gaz.nearest(55.85, 48.80)["region"] == "Республика Татарстан"
    assert regions_in("Нижегородская обл.") == ["Нижегородская область"]
    assert regions_in("Новгородская область") == ["Новгородская область"]
    assert regions_in("Московская область") == ["Московская область"]
    assert regions_in("Казань, Республика Татарстан") == ["Республика Татарстан"]


def test_highway_and_brand_clues(tmp_path):
    from geobot.knowledge import brand_clues, road_clues

    gaz = tiny_gazetteer(tmp_path)
    roads = road_clues("Указатель M-7 Казань 120 км, М-55, А-999", gaz)
    assert roads[0].text == "трасса М-7 «Волга» на фото"
    assert "Республика Татарстан" in roads[0].regions and "Чувашская Республика" in roads[0].regions
    assert road_clues("старый знак М-55", gaz)[0].text.startswith("трасса Р-258")  # renumbered road
    brands = brand_clues("АЗС ТАТНЕФТЬ, банкомат Ак Барс, ярче солнца")
    assert [b.text for b in brands] == ["банк «ак барс»", "АЗС «татнефть»"]  # «ярче» without «!» is just a word
    assert brands[0].regions == ["Республика Татарстан"]


def test_settlement_names_intersect_with_other_clues(tmp_path):
    from geobot.knowledge import place_name_clues

    gaz = tiny_gazetteer(tmp_path)
    clues, unique = place_name_clues("Дубровка\nул. Загородная", gaz, ["Республика Татарстан"])
    assert len(clues) == 1 and "1 в регионе по другим уликам" in clues[0].place  # the street is skipped
    assert unique["region"] == "Республика Татарстан" and unique["agreed"]
    clues, unique = place_name_clues("Дубровка", gaz, [])
    assert unique is None and "3" in clues[0].place  # three Dubrovkas, nothing to choose by
    _, unique = place_name_clues("Добро пожаловать в Иннополис", gaz, [])
    assert unique["word"] == "Иннополис" and unique["total"] == 1


def test_analyze_uses_brand_region_to_pick_the_right_village(tmp_path):
    gaz = tiny_gazetteer(tmp_path)
    svc = FakeSvc("Дубровка\nАЗС Татнефть")
    rep = asyncio.run(analyze(plain_jpeg(), True, svc, gaz=gaz))
    assert rep.best.label == "Дубровка, Республика Татарстан" and rep.best.confidence == "medium"
    assert (rep.best.lat, rep.best.lon) == (55.8674, 48.8056)
    assert "справочник населённых пунктов" in rep.best.source
    assert "1 в регионе по другим уликам" in summary(rep)


def test_prior_from_history_reaches_gemini_and_reply(tmp_path):
    h = History(tmp_path / "h.json")
    for i in range(4):
        h.add(f"1:{i}", {"chat": 1, "best": None, "candidates": []})
        h.set_truth(f"1:{i}", 55.8, 48.8, "x", "Республика Татарстан" if i < 3 else "Москва")
    hint = h.prior_hint(1)
    assert "Республика Татарстан — 3 из 4" in hint and h.prior_hint(2) == ""
    gem = FakeGemini({"candidates": [{"region": "Татарстан", "country": "Россия", "probability": 50}]})
    rep = asyncio.run(analyze(plain_jpeg(), True, FakeSvc(), gem, prior=hint))
    assert gem.seen["hints"].startswith("Подсказка из истории")
    assert "Учтены ваши прошлые ответы: Республика Татарстан — 3 из 4, Москва — 1 из 4" in summary(rep)


def test_gemini_prompt_has_highways_and_brands():
    from geobot.gemini import META

    assert "М-7 «Волга»" in META and "«бахетле»" in META and "Калининградская область" in META


def test_public_mode_admins_and_limits(monkeypatch):
    monkeypatch.setenv("BOT_TOKEN", "1:x")
    monkeypatch.setenv("ALLOWED_USERS", "*")
    monkeypatch.setenv("ADMIN_USERS", "42")
    monkeypatch.delenv("DAILY_LIMIT", raising=False)
    cfg = Config.from_env()
    assert cfg.public and cfg.admins == {42} and cfg.daily_limit == 3 and cfg.allowed(7) and not cfg.allowed(None)
    monkeypatch.setenv("ALLOWED_USERS", "1502566438")
    monkeypatch.delenv("ADMIN_USERS")
    cfg = Config.from_env()
    assert not cfg.public and cfg.admins == {1502566438} and not cfg.allowed(7)


def _photo(uid, mid):
    return {"update_id": mid, "message": {"message_id": mid, "chat": {"id": uid}, "from": {"id": uid, "username": "u"},
                                          "document": {"file_id": "f", "mime_type": "image/jpeg"}}}


def _text(uid, text):
    return {"update_id": 1, "message": {"message_id": 1, "chat": {"id": uid}, "from": {"id": uid}, "text": text}}


def test_daily_limit_ban_and_admin_stats(tmp_path):
    from geobot.bot import GeoBot

    cfg = Config(bot_token="1:x", public=True, admins={42}, daily_limit=2)
    tg = FakeTG(jpeg_with_gps())
    users = Users(tmp_path / "u.json")
    bot = GeoBot(cfg, None, tg=tg, svc=FakeSvc(), history=History(tmp_path / "h.json"), users=users)
    for i in range(3):
        asyncio.run(bot.handle(_photo(7, 10 + i)))
    assert "Бесплатные фото на сегодня закончились (2 в день" in tg.calls[-1][1]["text"]
    assert tg.calls[-1][1]["buttons"][0][0]["callback_data"] == "buy:1"
    assert users.used_today(7) == 2 and Users(tmp_path / "u.json").used_today(7) == 2  # saved to disk
    for i in range(3):  # the admin has no limit
        asyncio.run(bot.handle(_photo(42, 20 + i)))
    assert users.used_today(42) == 3

    asyncio.run(bot.handle(_text(7, "/ban 42")))  # not an admin: just help
    assert "Пришлите фото" in tg.calls[-1][1]["text"] and "сегодня осталось 0" in tg.calls[-1][1]["text"]
    asyncio.run(bot.handle(_text(42, "/ban 7")))
    assert "забанен" in tg.calls[-1][1]["text"]
    asyncio.run(bot.handle(_text(7, "/stats")))
    assert tg.calls[-1][1]["text"] == "Доступ к боту закрыт."
    asyncio.run(bot.handle(_text(42, "/admin")))
    text = tg.calls[-1][1]["text"]
    assert "Сегодня: 2 чел., 5 фото" in text and "<code>7</code> @u — 2" in text and "В бане" in text
    asyncio.run(bot.handle(_text(42, "/unban 7")))
    assert not users.is_banned(7)
    asyncio.run(bot.handle(_text(42, "/ban 42")))
    assert "нельзя" in tg.calls[-1][1]["text"]


def test_failed_analysis_is_not_counted_and_queue_position_is_shown(tmp_path):
    from geobot.bot import GeoBot

    class BrokenTG(FakeTG):
        async def download(self, file_id):
            raise RuntimeError("boom")

    cfg = Config(bot_token="1:x", public=True, daily_limit=5)
    tg = BrokenTG()
    bot = GeoBot(cfg, None, tg=tg, svc=FakeSvc(), history=History(tmp_path / "h.json"), users=Users(tmp_path / "u.json"))
    asyncio.run(bot.handle(_photo(7, 1)))
    assert bot.users.used_today(7) == 0 and "не засчитана" in tg.calls[-1][1]["text"] and bot.queued == 0

    tg = FakeTG(jpeg_with_gps())
    bot = GeoBot(cfg, None, tg=tg, svc=FakeSvc(), history=History(tmp_path / "h.json"), users=Users(tmp_path / "u.json"))

    async def two():
        await asyncio.gather(bot.handle(_photo(7, 1)), bot.handle(_photo(8, 2)))

    asyncio.run(two())
    texts = [p["text"] for m, p in tg.calls if m == "sendMessage"]
    assert any("перед вами 1 фото" in t for t in texts) and bot.queued == 0


def test_stats_are_per_user(tmp_path):
    h = History(tmp_path / "h.json")
    h.add("1:1", {"chat": 1, "best": {"lat": 55.79, "lon": 49.12, "label": "Казань"}, "candidates": []})
    h.add("2:1", {"chat": 2, "best": {"lat": 55.79, "lon": 49.12, "label": "Казань"}, "candidates": []})
    h.set_truth("1:1", 55.79, 49.12, "Казань")
    assert h.stats(1)["answered"] == 1 and h.stats(2)["answered"] == 0 and h.stats()["answered"] == 1


class FallbackHTTP(FakeHTTP):
    """Gemini models by name, plus the OpenAI-compatible fallback under the key "fallback"."""

    def post(self, url, json=None, headers=None, timeout=None):
        if "/models/" in url:
            return super().post(url, json, headers, timeout)
        self.calls.append(("fallback", json["model"]))
        self.prompts.append(json["messages"][0]["content"])
        return FakeResp(*self.script["fallback"].pop(0))


def test_fallback_model_answers_when_gemini_quota_is_out():
    answer = '{"candidates": [{"region": "Татарстан", "country": "Россия", "probability": 70}], "confidence": "low"}'
    http = FallbackHTTP({
        "m1": [(429, {"error": {"message": "quota", "details": [{"violations": [{"quotaId": "PerDay"}]}]}})],
        "fallback": [(200, {"choices": [{"message": {"content": "Вот ответ:\n" + answer}}]}),
                     (429, {"error": {"code": 429, "message": "Rate limit exceeded: free-models-per-day"}})],
    })
    gem = Gemini(http, "k", ["m1"], ["lite"], fallback_key="sk-or-x", fallback_model="moonshotai/kimi-k2.6:free")
    g = asyncio.run(gem.analyze(plain_jpeg(), [("знак", plain_jpeg())], "нет"))
    assert g["region"] == "Татарстан" and g["model"] == "moonshotai/kimi-k2.6:free"
    content = http.prompts[-1]
    assert content[0]["type"] == "text" and content[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")
    assert sum(1 for c in content if c["type"] == "image_url") == 2
    rep = Report(meta=read_meta(plain_jpeg()), compressed=True, gemini=g)
    assert "<b>kimi-k2.6</b>" in summary(rep) and "вариант kimi-k2.6" in dossier(rep)

    assert asyncio.run(gem.analyze(plain_jpeg(), [], "нет")) is None  # daily limit of the free model
    assert "дневной лимит" in gem.last_error and gem.blocked["moonshotai/kimi-k2.6:free"] > time.time() + 60
    assert asyncio.run(gem.locate_details(plain_jpeg())) == []  # boxes never go to the fallback
    assert ("fallback", "moonshotai/kimi-k2.6:free") in http.calls and http.calls.count(("fallback", "moonshotai/kimi-k2.6:free")) == 2


def test_fallback_alone_without_gemini_key():
    http = FallbackHTTP({"fallback": [(200, {"choices": [{"message": {"content": '{"candidates": [], "confidence": "low"}'}}]})]})
    gem = Gemini(http, "", [], [], fallback_key="sk-or-x")
    assert asyncio.run(gem.analyze(plain_jpeg(), [], "нет"))["model"] == "moonshotai/kimi-k2.6:free"
    assert Config(bot_token="1:x", fallback_key="k").gemini_enabled



class ScriptedTG(FakeTG):
    """FakeTG with canned answers for some methods (an exception instance is raised)."""

    def __init__(self, file=b"", answers=None):
        super().__init__(file)
        self.answers = answers or {}

    async def call(self, method, **params):
        self.calls.append((method, params))
        ans = self.answers.get(method, {"message_id": 99})
        if isinstance(ans, Exception):
            raise ans
        return ans(params) if callable(ans) else ans


def _cb(uid, data, n=1):
    return {"update_id": n, "callback_query": {"id": f"q{n}", "data": data, "from": {"id": uid},
                                               "message": {"chat": {"id": uid}}}}


def test_channel_join_request_opens_the_bot(tmp_path):
    from geobot.bot import GeoBot

    cfg = Config(bot_token="1:x", public=True, admins={42}, channel_id="-1001")
    tg = ScriptedTG(jpeg_with_gps(), {"createChatInviteLink": {"invite_link": "https://t.me/+abc"},
                                      "getChatMember": {"status": "left"}})
    users = Users(tmp_path / "u.json")
    bot = GeoBot(cfg, None, tg=tg, svc=FakeSvc(), history=History(tmp_path / "h.json"), users=users)
    asyncio.run(bot.handle(_photo(7, 1)))
    gate = tg.calls[-1][1]
    assert "подпишитесь на наш канал" in gate["text"] and gate["buttons"][0][0]["url"] == "https://t.me/+abc"
    assert ("createChatInviteLink", {"chat_id": "-1001", "name": "geobot", "creates_join_request": True}) in tg.calls
    assert users.used_today(7) == 0 and Users(tmp_path / "u.json").data["invite"] == "https://t.me/+abc"

    asyncio.run(bot.handle(_cb(7, "sub")))
    assert tg.calls[-1][0] == "answerCallbackQuery" and "Заявка пока не пришла" in tg.calls[-1][1]["text"]

    asyncio.run(bot.handle({"update_id": 2, "chat_join_request": {"chat": {"id": -1001}, "from": {"id": 7},
                                                                   "user_chat_id": 7}}))
    assert users.joined(7) and "Заявка в канал получена" in tg.calls[-1][1]["text"]
    asyncio.run(bot.handle({"update_id": 3, "chat_join_request": {"chat": {"id": -999}, "from": {"id": 8}}}))
    assert not users.joined(8)  # someone else's channel
    asyncio.run(bot.handle(_photo(7, 4)))
    assert "sendLocation" in [m for m, _ in tg.calls] and users.free_used(7) == 1

    tg.answers["getChatMember"] = {"status": "member"}  # already in the channel before the bot asked
    asyncio.run(bot.handle(_text(9, "/stats")))
    assert users.joined(9) and "Пока нет ни одного фото" in tg.calls[-1][1]["text"]
    tg.answers["getChatMember"] = RuntimeError("must not be asked")
    n = len(tg.calls)
    asyncio.run(bot.handle(_photo(42, 5)))  # the admin is never asked
    assert "getChatMember" not in [m for m, _ in tg.calls[n:]] and "sendLocation" in [m for m, _ in tg.calls[n:]]

    # the bot is not an admin of the channel yet: nobody is locked out
    tg2 = ScriptedTG(jpeg_with_gps(), {"createChatInviteLink": RuntimeError("not enough rights")})
    bot2 = GeoBot(cfg, None, tg=tg2, svc=FakeSvc(), history=History(tmp_path / "h2.json"), users=Users(tmp_path / "u2.json"))
    asyncio.run(bot2.handle(_photo(7, 1)))
    assert "sendLocation" in [m for m, _ in tg2.calls]


def test_stars_paywall_invoice_payment_and_refund(tmp_path):
    from geobot.bot import GeoBot

    cfg = Config(bot_token="1:x", public=True, admins={42}, daily_limit=1)
    tg = ScriptedTG(jpeg_with_gps())
    users = Users(tmp_path / "u.json")
    bot = GeoBot(cfg, None, tg=tg, svc=FakeSvc(), history=History(tmp_path / "h.json"), users=users)
    asyncio.run(bot.handle(_photo(7, 1)))
    asyncio.run(bot.handle(_photo(7, 2)))
    wall = tg.calls[-1][1]
    assert "Бесплатные фото на сегодня закончились" in wall["text"]
    assert [b[0]["text"] for b in wall["buttons"]] == ["1 фото — 5 ⭐", "10 фото — 25 ⭐", "50 фото — 100 ⭐"]

    asyncio.run(bot.handle(_cb(7, "buy:10")))
    inv = tg.calls[-1]
    assert inv[0] == "sendInvoice" and inv[1]["currency"] == "XTR" and inv[1]["prices"] == [{"label": "10 фото", "amount": 25}]
    assert inv[1]["payload"] == "photos:10:25" and "provider_token" not in inv[1]

    asyncio.run(bot.handle({"update_id": 5, "pre_checkout_query": {"id": "p1", "invoice_payload": "photos:10:25",
                                                                    "total_amount": 25, "currency": "XTR"}}))
    assert tg.calls[-1] == ("answerPreCheckoutQuery", {"pre_checkout_query_id": "p1", "ok": True, "error_message": None})
    asyncio.run(bot.handle({"update_id": 6, "pre_checkout_query": {"id": "p2", "invoice_payload": "photos:50:1",
                                                                    "total_amount": 1, "currency": "XTR"}}))
    assert tg.calls[-1][1]["ok"] is False  # a tampered price

    paid = {"message_id": 7, "chat": {"id": 7}, "from": {"id": 7},
            "successful_payment": {"currency": "XTR", "total_amount": 25, "invoice_payload": "photos:10:25",
                                   "telegram_payment_charge_id": "ch1"}}
    asyncio.run(bot.handle({"update_id": 7, "message": paid}))
    asyncio.run(bot.handle({"update_id": 8, "message": paid}))  # resent by Telegram: counted once
    assert users.credits(7) == 10 and "+10 фото" in tg.calls[-1][1]["text"]

    asyncio.run(bot.handle(_photo(7, 9)))  # the free photo is used up: a paid one goes
    assert users.credits(7) == 9 and users.free_used(7) == 1

    class BrokenTG(ScriptedTG):
        async def download(self, file_id):
            raise RuntimeError("boom")

    broken = GeoBot(cfg, None, tg=BrokenTG(), svc=FakeSvc(), history=History(tmp_path / "h.json"), users=users)
    asyncio.run(broken.handle(_photo(7, 10)))
    assert users.credits(7) == 9  # a failed analysis gives the paid photo back

    busy_ai = GeoBot(cfg, None, tg=tg, svc=FakeSvc(), gemini=FakeGemini(None), history=History(tmp_path / "h.json"),
                     users=users)
    asyncio.run(busy_ai.handle(_photo(7, 11)))
    assert users.credits(7) == 9 and "ИИ сейчас перегружен" in tg.calls[-1][1]["text"]

    asyncio.run(bot.handle(_text(7, "/paysupport")))
    assert "Вопросы по оплате" in tg.calls[-1][1]["text"]
    asyncio.run(bot.handle(_text(42, "/admin")))
    assert "всего 25 (1 покупок)" in tg.calls[-1][1]["text"] and "<code>ch1</code>" in tg.calls[-1][1]["text"]
    asyncio.run(bot.handle(_text(42, "/refund ch1")))
    assert ("refundStarPayment", {"user_id": 7, "telegram_payment_charge_id": "ch1"}) in tg.calls
    assert users.credits(7) == 0 and users.stats()["stars_total"] == 0
    asyncio.run(bot.handle(_text(42, "/refund ch1")))
    assert "уже возвращён" in tg.calls[-1][1]["text"]

    off = Config(bot_token="1:x", public=True, daily_limit=1, packs=[])
    tg3 = ScriptedTG(jpeg_with_gps())
    bot3 = GeoBot(off, None, tg=tg3, svc=FakeSvc(), history=History(tmp_path / "h3.json"), users=Users(tmp_path / "u3.json"))
    asyncio.run(bot3.handle(_photo(7, 1)))
    asyncio.run(bot3.handle(_photo(7, 2)))
    assert "Лимит 1 фото в день исчерпан" in tg3.calls[-1][1]["text"]


def test_packs_from_env_and_paid_photos_jump_the_queue():
    from geobot.bot import PhotoQueue
    from geobot.config import _packs

    assert _packs("") == [(1, 5), (10, 25), (50, 100)] and _packs("10:10; 1:2") == [(1, 2), (10, 10)]
    assert _packs("0") == [] and _packs("off") == []

    async def go():
        q, order = PhotoQueue(), []
        await q.acquire(False)  # someone is being analysed

        async def wait(name, paid):
            await q.acquire(paid)
            order.append(name)
            q.release()

        free = asyncio.create_task(wait("free", False))
        await asyncio.sleep(0)
        assert q.ahead(True) == 1 and q.ahead(False) == 2
        paid = asyncio.create_task(wait("paid", True))
        await asyncio.sleep(0)
        q.release()
        await asyncio.gather(free, paid)
        assert order == ["paid", "free"] and not q.busy

    asyncio.run(go())


def test_menu_keyboard_buttons(tmp_path):
    from geobot.bot import B_ADMIN, B_BALANCE, B_BUY, B_FIND, B_HELP, B_STATS, B_SUPPORT, GeoBot
    from geobot.telegram import Telegram

    cfg = Config(bot_token="1:x", public=True, admins={42}, daily_limit=3)
    tg = ScriptedTG(jpeg_with_gps())
    users = Users(tmp_path / "u.json")
    bot = GeoBot(cfg, None, tg=tg, svc=FakeSvc(), history=History(tmp_path / "h.json"), users=users)
    asyncio.run(bot.handle(_text(7, "/start")))
    kb = tg.calls[-1][1]["keyboard"]
    assert kb[0] == [B_FIND] and [B_BUY, B_BALANCE] in kb and B_ADMIN not in sum(kb, [])
    asyncio.run(bot.handle(_text(42, "/start")))
    assert [B_ADMIN] in tg.calls[-1][1]["keyboard"]

    users.use_free(7)
    users.add_credits(7, 4)
    asyncio.run(bot.handle(_text(7, B_BALANCE)))
    bal = tg.calls[-1][1]
    assert "Бесплатно сегодня: 2 из 3" in bal["text"] and "Куплено фото: 4" in bal["text"]
    asyncio.run(bot.handle(_cb(7, "shop")))
    assert tg.calls[-1][1]["buttons"][0][0]["callback_data"] == "buy:1"
    asyncio.run(bot.handle(_text(7, B_BUY)))
    assert "Фото за звёзды" in tg.calls[-1][1]["text"]
    asyncio.run(bot.handle(_text(7, B_FIND)))
    assert "Пришлите фото" in tg.calls[-1][1]["text"]
    asyncio.run(bot.handle(_text(7, B_STATS)))
    assert "Пока нет ни одного фото" in tg.calls[-1][1]["text"]
    asyncio.run(bot.handle(_text(7, B_HELP)))
    assert "/buy" in tg.calls[-1][1]["text"]
    asyncio.run(bot.handle(_text(7, B_SUPPORT)))
    assert "Вопросы по оплате" in tg.calls[-1][1]["text"]
    asyncio.run(bot.handle(_text(7, B_ADMIN)))  # not an admin: just help
    assert "Пришлите фото" in tg.calls[-1][1]["text"] and "Сегодня:" not in tg.calls[-1][1]["text"]
    asyncio.run(bot.handle(_text(42, B_ADMIN)))
    assert "Сегодня:" in tg.calls[-1][1]["text"]

    class Capture:  # the real client turns `keyboard` into a persistent reply keyboard
        def __init__(self):
            self.payload = None

    real = Telegram(None, "1:x")
    seen = Capture()

    async def fake_call(method, **params):
        seen.payload = params
        return {}

    real.call = fake_call
    asyncio.run(real.send(1, "hi", keyboard=[["a", "b"]]))
    assert seen.payload["reply_markup"]["keyboard"] == [[{"text": "a"}, {"text": "b"}]]
    assert seen.payload["reply_markup"]["is_persistent"] and seen.payload["reply_markup"]["resize_keyboard"]


def test_owner_reminders_renew_and_video(tmp_path):
    from datetime import datetime

    from geobot.bot import GeoBot
    from geobot.users import MSK

    cfg = Config(bot_token="1:x", public=True, admins={42}, renew_days=3, video_time="10:30")
    tg = ScriptedTG()
    users = Users(tmp_path / "u.json")
    bot = GeoBot(cfg, None, tg=tg, svc=FakeSvc(), history=History(tmp_path / "h.json"), users=users)
    t0 = datetime(2026, 10, 24, 9, 0, tzinfo=MSK).timestamp()
    users.data["reminders"] = {"renew_at": t0 + 3 * 86400}

    asyncio.run(bot.check_reminders(t0))
    assert not tg.calls  # nothing due yet
    asyncio.run(bot.check_reminders(t0 + 1.6 * 3600))  # 10:36 — video time
    assert tg.calls[-1][1]["chat_id"] == 42 and "выложить видео" in tg.calls[-1][1]["text"]
    n = len(tg.calls)
    asyncio.run(bot.check_reminders(t0 + 2 * 3600))  # once a day
    assert len(tg.calls) == n

    asyncio.run(bot.check_reminders(t0 + 3 * 86400 + 60))
    renew = [c for c in tg.calls if "продлить сервер" in c[1].get("text", "")]
    assert len(renew) == 1 and renew[0][1]["buttons"][1][0]["callback_data"] == "renewed"
    assert users.data["reminders"]["renew_at"] == t0 + 3 * 86400 + 60 + 12 * 3600  # nag again in 12 h

    cb = {"update_id": 9, "callback_query": {"id": "q", "data": "renewed", "from": {"id": 42},
                                             "message": {"chat": {"id": 42}, "message_id": 5}}}
    asyncio.run(bot.handle(cb))
    assert users.data["reminders"]["renew_at"] > time.time() + 2.9 * 86400 and "Сервер продлён" in tg.calls[-1][1]["text"]
