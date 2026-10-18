import asyncio
import io

from PIL import Image

from geobot.analyze import Report, _country_code, _pick_best, analyze
from geobot.config import Config
from geobot.exif import read_meta
from geobot.report import dossier, summary
from geobot.services import search_links
from geobot.textclues import find_clues, geocode_queries


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


class FakeSvc:
    def __init__(self, ocr_text="", geo=None):
        self.ocr_text, self.geo, self.queries = ocr_text, geo or {}, []

    async def ocr(self, jpeg):
        return self.ocr_text

    async def temp_upload(self, jpeg):
        return "https://litter.catbox.moe/x.jpg"

    async def geocode(self, q, cc=""):
        self.queries.append((q, cc))
        hit = self.geo.get(q)
        return [{"lat": str(hit[0]), "lon": str(hit[1]), "display_name": q}] if hit else []

    async def reverse(self, lat, lon):
        return "где-то рядом"

    async def commons_nearby(self, lat, lon, radius_m=800, limit=3):
        return [{"title": "x", "thumb": "https://upload.wikimedia.org/x.jpg", "page": ""}]


CFG = Config(bot_token="1:x", allowed_users={1}, ocr_space_key="k")


def test_analyze_uses_gps_first():
    rep = asyncio.run(analyze(jpeg_with_gps(), False, CFG, None, FakeSvc()))
    assert rep.best.source == "GPS в файле" and rep.best.confidence == "high"
    assert rep.links and rep.commons and rep.address
    text = summary(rep)
    assert "55.79" in text and "азимут 270" in text


def test_analyze_geocodes_ocr_address_in_agreed_country():
    svc = FakeSvc("ул. Баумана, 15\nтел. 8 (843) 123-45-67", geo={"ул. Баумана, 15": (55.79, 49.11)})
    rep = asyncio.run(analyze(plain_jpeg(), True, CFG, None, svc))
    assert rep.best and rep.best.source.startswith("текст на фото")
    assert ("ул. Баумана, 15", "ru") in svc.queries
    assert "файлом" in summary(rep)  # compressed photo -> hint to send as file
    assert "Казань" in dossier(rep)


def test_city_clue_fallback_and_nothing_found():
    svc = FakeSvc("тел. 8 (843) 123-45-67", geo={"Казань": (55.79, 49.12)})
    rep = asyncio.run(analyze(plain_jpeg(), True, CFG, None, svc))
    assert rep.best.label == "Казань" and rep.best.confidence == "low"
    rep2 = asyncio.run(analyze(plain_jpeg(), True, CFG, None, FakeSvc()))
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


def test_bot_flow_photo_and_access():
    from geobot.bot import GeoBot

    tg = FakeTG(jpeg_with_gps())
    bot = GeoBot(CFG, None, tg=tg, svc=FakeSvc())
    asyncio.run(bot.handle({"update_id": 1, "message": {"message_id": 5, "chat": {"id": 1}, "from": {"id": 1},
                                                         "document": {"file_id": "f", "mime_type": "image/jpeg"}}}))
    methods = [m for m, _ in tg.calls]
    assert methods[:2] == ["sendMessage", "editMessageText"]
    assert "sendLocation" in methods and "sendPhoto" in methods
    edit = dict(tg.calls[1][1])
    assert any("Яндекс" in b[0]["text"] for b in edit["buttons"])
    assert edit["buttons"][-1][0]["callback_data"] == "d:1:5"

    asyncio.run(bot.handle({"update_id": 2, "callback_query": {"id": "q", "data": "d:1:5",
                                                               "message": {"chat": {"id": 1}}}}))
    assert "Где снято это фото" in tg.calls[-2][1]["text"]

    tg2 = FakeTG()
    stranger = GeoBot(CFG, None, tg=tg2, svc=FakeSvc())
    asyncio.run(stranger.handle({"update_id": 3, "message": {"message_id": 1, "chat": {"id": 7}, "from": {"id": 7},
                                                              "photo": [{"file_id": "x"}]}}))
    assert len(tg2.calls) == 1 and "закрытый" in tg2.calls[0][1]["text"]


def test_street_is_searched_inside_city_from_phone_code():
    svc = FakeSvc("ул. Баумана, 19\nтел. 8 (843) 292-00-00",
                  geo={"ул. Баумана, 19, Казань": (55.791, 49.114), "ул. Баумана, 19": (1, 1)})
    rep = asyncio.run(analyze(plain_jpeg(), True, CFG, None, svc))
    assert rep.best.label == "ул. Баумана, 19, Казань" and rep.best.confidence == "medium"
    assert svc.queries[0] == ("ул. Баумана, 19, Казань", "ru")
