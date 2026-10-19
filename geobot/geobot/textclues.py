"""Turn text read from the photo into location clues using lookup tables."""

import json
import re
from dataclasses import dataclass
from pathlib import Path

from .data.ru_tables import AREA_CODES, PLATE_REGIONS

DATA = Path(__file__).parent / "data"


@dataclass
class Clue:
    text: str  # what was found, human readable (Russian)
    place: str  # what it points to
    level: str  # "country" | "region" | "city"
    weight: int  # 1 weak … 3 strong
    country: str = ""  # country the clue implies, when it implies exactly one


# Letters that only a few alphabets use. Order matters: more specific first.
ALPHABETS: list[tuple[str, str, str, str]] = [
    # (letters, language, place, level)
    ("җ", "татарский", "Татарстан (Россия)", "region"),
    ("ҙҡҫ", "башкирский", "Башкортостан (Россия)", "region"),
    ("ӑӗӳ", "чувашский", "Чувашия (Россия)", "region"),
    ("ҕҥ", "якутский", "Якутия (Россия)", "region"),
    ("ұ", "казахский", "Казахстан", "country"),
    ("ҷӣӯ", "таджикский", "Таджикистан", "country"),
    ("ҳ", "узбекский (кириллица) или таджикский", "Узбекистан / Таджикистан", "country"),
    ("қ", "казахский или узбекский", "Казахстан / Узбекистан", "country"),
    ("ґєї", "украинский", "Украина", "country"),
    ("ђћџ", "сербский", "Сербия / Черногория / Босния", "country"),
    ("ѓќѕ", "македонский", "Северная Македония", "country"),
    ("ә", "татарский, башкирский или казахский", "Татарстан / Башкортостан / Казахстан", "region"),
    ("ңөү", "тюркский (кириллица)", "Татарстан / Башкортостан / Казахстан / Киргизия / Якутия", "region"),
    ("ў", "белорусский (реже узбекский)", "Беларусь", "country"),
    ("ə", "азербайджанский", "Азербайджан", "country"),
    ("ğış", "турецкий или азербайджанский", "Турция / Азербайджан", "country"),
    ("łńśźż", "польский", "Польша", "country"),
    ("řůě", "чешский", "Чехия", "country"),
    ("őű", "венгерский", "Венгрия", "country"),
    ("șț", "румынский", "Румыния / Молдова", "country"),
    ("ėįų", "литовский", "Литва", "country"),
    ("āēīķļņģ", "латышский", "Латвия", "country"),
    ("õ", "эстонский (или португальский)", "Эстония", "country"),
]

# Georgian and Armenian scripts are checked by Unicode block instead.
SCRIPTS = [
    (re.compile(r"[Ⴀ-ჿ]"), "грузинское письмо", "Грузия"),
    (re.compile(r"[԰-֏]"), "армянское письмо", "Армения"),
]

TLDS = {
    "ru": "Россия", "рф": "Россия", "su": "Россия", "by": "Беларусь", "kz": "Казахстан",
    "ua": "Украина", "uz": "Узбекистан", "kg": "Киргизия", "tj": "Таджикистан",
    "am": "Армения", "ge": "Грузия", "az": "Азербайджан", "md": "Молдова",
    "lv": "Латвия", "lt": "Литва", "ee": "Эстония", "tr": "Турция", "rs": "Сербия",
}

PLATE_RE = re.compile(
    r"(?<![A-ZА-Я0-9])([АВЕКМНОРСТУХABEKMHOPCTYX])\s?(\d{3})\s?([АВЕКМНОРСТУХABEKMHOPCTYX]{2})\s?(?:RUS\s?)?(\d{2,3})(?!\d)",
    re.IGNORECASE,
)
PHONE_RE = re.compile(r"(?:\+\s?\d[\d\s()\-]{8,16}\d|\b8\s?\(?\d{3,5}\)?[\s\-]?\d[\d\s\-]{4,9}\d)")
DOMAIN_RE = re.compile(r"\b[\w\-]+\.(" + "|".join(TLDS) + r")\b", re.IGNORECASE)

RU_NAMES = {
    "Russia": "Россия", "Kazakhstan": "Казахстан", "Belarus": "Беларусь", "Ukraine": "Украина",
    "Uzbekistan": "Узбекистан", "Kyrgyzstan": "Киргизия", "Tajikistan": "Таджикистан",
    "Turkmenistan": "Туркменистан", "Armenia": "Армения", "Georgia": "Грузия", "Azerbaijan": "Азербайджан",
    "Moldova": "Молдова", "Latvia": "Латвия", "Lithuania": "Литва", "Estonia": "Эстония",
    "Turkey": "Турция", "Serbia": "Сербия", "Poland": "Польша", "Czech Republic": "Чехия",
    "Hungary": "Венгрия", "Romania": "Румыния", "Germany": "Германия", "Finland": "Финляндия",
    "China": "Китай", "Mongolia": "Монголия", "United Arab Emirates": "ОАЭ", "Egypt": "Египет",
    "Thailand": "Таиланд", "Abkhazia": "Абхазия",
}

_calling: dict[str, list[dict]] | None = None


def _calling_codes() -> dict[str, list[dict]]:
    global _calling
    if _calling is None:
        raw = json.loads((DATA / "calling_codes.json").read_text(encoding="utf-8"))
        _calling = {k.replace("-", ""): v for k, v in raw.items() if not k.startswith("_")}
    return _calling


def _phone_clue(raw: str) -> Clue | None:
    digits = re.sub(r"\D", "", raw)
    if raw.strip().startswith("8") and len(digits) == 11:
        digits = "7" + digits[1:]
    elif not raw.strip().startswith("+"):
        return None
    if digits.startswith("7") and len(digits) == 11:
        rest = digits[1:]
        if rest.startswith("9"):
            return Clue(f"мобильный номер {raw.strip()}", "Россия (регион по мобильному не определить)", "country", 1, "Россия")
        for n in (5, 4, 3):
            city = AREA_CODES.get(rest[:n])
            if city:
                return Clue(f"телефон {raw.strip()} (код {rest[:n]})", city, "city", 3, "Россия")
        if rest.startswith(("6", "7")):
            return Clue(f"телефон {raw.strip()}", "Казахстан", "country", 2, "Казахстан")
        return Clue(f"телефон {raw.strip()}", "Россия", "country", 2, "Россия")
    codes = _calling_codes()
    for n in (6, 5, 4, 3, 2, 1):
        hit = codes.get(digits[:n])
        if hit:
            names = sorted({RU_NAMES.get(h["country"], h["country"]) for h in hit})
            return Clue(f"телефон {raw.strip()} (код +{digits[:n]})", " / ".join(names), "country", 2,
                        names[0] if len(names) == 1 else "")
    return None


def find_clues(text: str) -> list[Clue]:
    if not text or not text.strip():
        return []
    clues: list[Clue] = []
    low = text.lower()

    for letters, lang, place, level in ALPHABETS:
        found = sorted({ch for ch in letters if ch in low})
        if found:
            country = "Россия" if "(Россия)" in place else ("" if "/" in place else place)
            clues.append(Clue(f"буквы {' '.join(found)} — {lang} язык", place, level, 2, country))
            break  # one alphabet verdict is enough; the list is ordered by specificity
    for rx, name, place in SCRIPTS:
        if rx.search(text):
            clues.append(Clue(name, place, "country", 3, place))

    seen: set[str] = set()
    for m in PLATE_RE.finditer(text.upper()):
        region = PLATE_REGIONS.get(m.group(4))
        key = "plate" + m.group(0)
        if region and key not in seen:
            seen.add(key)
            clues.append(Clue(f"номер машины {m.group(0).strip()} (код {m.group(4)})", region, "region", 2, "Россия"))
    for m in PHONE_RE.finditer(text):
        clue = _phone_clue(m.group(0))
        if clue and clue.text not in seen:
            seen.add(clue.text)
            clues.append(clue)
    for m in DOMAIN_RE.finditer(text):
        tld = m.group(1).lower()
        key = "tld" + tld
        if key not in seen:
            seen.add(key)
            clues.append(Clue(f"сайт {m.group(0)}", TLDS[tld], "country", 1, TLDS[tld]))
    return clues


def geocode_queries(text: str, limit: int = 4) -> list[str]:
    """Pick lines that look like names or addresses worth geocoding."""
    out: list[str] = []
    for line in text.splitlines():
        line = re.sub(r"\s+", " ", line).strip(" .,;:-–—\"'«»")
        if len(line) < 5 or len(line) > 80:
            continue
        letters = sum(ch.isalpha() for ch in line)
        if letters < 4 or letters / len(line) < 0.5:
            continue
        address_like = re.search(r"\b(ул|улица|пр|проспект|пер|переулок|ш|шоссе|пл|площадь|наб|бульвар|д|дом)\b\.?", line, re.I)
        if address_like or line[0].isupper():
            out.append(line)
    out.sort(key=lambda s: (not re.search(r"\b(ул|улица|проспект|пр|шоссе|площадь)\b", s, re.I), -len(s)))
    return out[:limit]


# Words that start with a capital letter in page titles but are not place names.
TITLE_STOP = {
    "церковь", "храм", "собор", "часовня", "монастырь", "мечеть", "икона", "иконы", "казанской", "божией",
    "матери", "господня", "святого", "святой", "фотография", "фото", "фасады", "category", "wikimedia",
    "commons", "church", "of", "the", "theotokos", "russia", "russian", "heritage", "photographs", "taken",
    "telegram", "view", "без", "заголовка", "обсуждение", "яндекс", "карты", "картинки", "праздник",
    "портал", "православие", "в", "на", "и", "сайт", "главная", "официальный", "купить", "отзывы", "цена",
    "википедия", "wikipedia", "file", "файл", "jpg", "png", "life", "pinterest", "vk", "вконтакте",
    "новости", "news", "media", "медиа", "сотрудники", "рождества", "христова", "пасха", "блог", "фотобанк",
    "стоковые", "изображения", "обои", "home", "photo", "stock", "images", "дзен", "dzen", "youtube", "rutube",
    "продажа", "аренда", "купить", "снять", "квартира", "квартиры", "двухкомнатной", "однокомнатной", "дом",
    "дома", "коттедж", "участок", "отель", "гостиница", "бронирование", "жильё", "жилье", "посуточно", "частный",
    "панорама", "panorama", "resort", "hotel", "booking", "reviews", "отзывов", "лайков", "просмотров",
}
_CAPS = re.compile(r"[A-ZА-ЯЁ][a-zа-яё\-]+(?:\s+[A-ZА-ЯЁ][a-zа-яё\-]+){0,3}")
_ADJ_END = ("ой", "ий", "ый", "ая", "ого", "его", "ей", "ых", "их", "ом")


TRANSLIT = dict(zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
                    ["a", "b", "v", "g", "d", "e", "e", "zh", "z", "i", "y", "k", "l", "m", "n", "o", "p", "r",
                     "s", "t", "u", "f", "kh", "ts", "ch", "sh", "shch", "", "y", "", "e", "yu", "ya"]))
LANDMARK_WORDS = ("церк", "храм", "собор", "часовн", "монастыр", "мечет", "синагог", "костел", "костёл", "кирх",
                  "памятник", "монумент", "мемориал", "статуя", "скульптур", "мост", "вокзал", "башн", "кремл",
                  "крепост", "замок", "дворец", "усадьб", "музей", "театр", "стадион", "маяк", "фонтан", "арка",
                  "ратуш", "колокольн", "минарет", "пагод", "обелиск", "телебашн")


def norm_latin(text: str) -> str:
    """Lowercase transliteration so «Старое Чурилино» and «Staroye Churilino» compare equal."""
    out = "".join(TRANSLIT.get(ch, ch) for ch in text.lower())
    for a, b in (("ye", "e"), ("yo", "o"), ("iy", "i"), ("yy", "y"), ("kh", "h"), ("j", "y"), ("'", "")):
        out = out.replace(a, b)
    return re.sub(r"[^a-z0-9]+", " ", out).strip()


def site_key(domain: str) -> str:
    """yandex.ru / yandex.com / yandex.kz count as one source; news.myseldon.com == myseldon.com."""
    parts = domain.lower().removeprefix("www.").split(".")
    if "yandex" in parts or "ya" in parts:
        return "yandex"
    return ".".join(parts[-2:])


def _domain(site: dict) -> str:
    if site.get("domain"):
        return site["domain"]
    url = site.get("url", "")
    return url.split("/")[2] if url.count("/") >= 2 else ""


def is_landmark(tags: list[str]) -> bool:
    return any(w in t.lower() for t in tags for w in LANDMARK_WORDS)


def place_phrases(sites: list[dict], min_sources: int = 1) -> list[tuple[str, int, int]]:
    """Capitalised phrases repeated across result pages — likely the place's name.

    `sites` are dicts with title/description/domain. Returns (phrase, independent sites, pages),
    best first: a name on three different websites beats one listing copied onto three pages.
    """
    texts = [f"{s.get('title', '')}. {s.get('description', '')}" for s in sites]
    norms = [norm_latin(t) for t in texts]
    pages: dict[str, int] = {}
    for text in texts:
        seen: set[str] = set()
        for m in _CAPS.finditer(text):
            words = m.group(0).split()
            while words and words[0].lower() in TITLE_STOP:
                words.pop(0)
            while words and words[-1].lower() in TITLE_STOP:
                words.pop()
            if not words or any(w.lower() in TITLE_STOP for w in words):
                continue
            if len(words) == 1 and (len(words[0]) < 4 or words[0].lower().endswith(_ADJ_END)):
                continue
            phrase = " ".join(words)
            if phrase not in seen:
                seen.add(phrase)
                pages[phrase] = pages.get(phrase, 0) + 1
    ranked = []
    for phrase, n in pages.items():
        key = f" {norm_latin(phrase)} "
        sources = {site_key(_domain(s)) for s, nt in zip(sites, norms) if key in f" {nt} "}
        sources.discard("")
        if len(sources) >= min_sources and (n >= 2 or len(sources) >= 2):
            ranked.append((phrase, len(sources), n))
    ranked.sort(key=lambda r: (-r[1], -r[2], -len(r[0].split())))
    return ranked
