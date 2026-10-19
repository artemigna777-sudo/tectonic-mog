"""Regional knowledge on top of the plain text clues: highways, brands, settlement names.

Every clue here carries the canonical Russian regions it points to, so clues from different
sources (plate code, highway, shop sign, village name) can be intersected.
"""

import re
from collections import Counter

from .data.ru_brands import BRANDS, SIGN_ONLY
from .data.ru_roads import OLD_CODES, ROADS
from .gazetteer import REGIONS, Gazetteer, regions_in
from .textclues import Clue

LOOKALIKE = str.maketrans({"M": "М", "P": "Р", "A": "А", "m": "М", "p": "Р", "a": "А", "м": "М", "р": "Р", "а": "А"})
ROAD_RE = re.compile(r"(?<![\w-])([МРАMPAмра])\s?[-–—]?\s?(\d{1,3})(?![\d\w])")
# «Дубровка», «Старое Чурилино», «Ростов-на-Дону», «Йошкар-Ола»: words of one name stay on one line
WORD_RE = re.compile(r"[А-ЯЁ][а-яё]+(?: [А-ЯЁ][а-яё]+|-[а-яё]+-[А-ЯЁ][а-яё]+|-[А-ЯЁ][а-яё]+){0,2}")
STREET_RE = re.compile(r"(?:\b(?:ул|улица|пр|просп|проспект|пер|переулок|бул|бульвар|ш|шоссе|пл|площадь|наб|"
                       r"набережная|мкр|микрорайон|проезд|тупик)\.?\s*)$", re.I)
# Capitalised words on signs that are also village names somewhere; they prove nothing.
COMMON = {
    "магазин", "аптека", "продукты", "остановка", "улица", "переход", "пешеходный", "стоянка", "запрещена",
    "вход", "выход", "касса", "открыто", "закрыто", "скидки", "акция", "кафе", "бар", "ресторан", "рынок",
    "центр", "школа", "больница", "почта", "банк", "такси", "автобус", "мир", "победа", "заря", "мечта",
    "октябрь", "москва", "россия", "добро", "пожаловать", "лес", "река", "озеро", "поле", "гора", "парк",
    "сад", "дом", "дача", "новый", "новая", "старый", "старая", "красный", "красная", "береговая",
    "садовая", "лесная", "полевая", "советская", "ленина", "мира", "внимание", "осторожно", "стоп",
}


def regions_of_cities(gaz: Gazetteer, cities: list[str]) -> list[str]:
    out: list[str] = []
    for city in cities:
        hit = gaz.biggest(city)
        if hit and hit["region"] not in out:
            out.append(hit["region"])
    return out


def road_clues(text: str, gaz: Gazetteer) -> list[Clue]:
    clues, seen = [], set()
    for m in ROAD_RE.finditer(text):
        code = f"{m.group(1).translate(LOOKALIKE)}-{int(m.group(2))}"
        code = OLD_CODES.get(code, code)
        if code not in ROADS or code in seen:
            continue
        seen.add(code)
        name, cities = ROADS[code]
        label = f"трасса {code}" + (f" «{name}»" if name else "")
        clues.append(Clue(f"{label} на фото", "вдоль трассы: " + " — ".join(cities), "region", 2, "Россия",
                          regions_of_cities(gaz, cities)))
    return clues


def brand_clues(text: str) -> list[Clue]:
    low = text.lower().replace("ё", "е")
    clues = []
    for brand, (kind, where) in BRANDS.items():
        if re.search(rf"(?<![\w-]){re.escape(brand)}(?![\w-])", low):
            russian = [w for w in where if w in REGIONS]
            country = "Россия" if russian else (where[0] if len(where) == 1 else "")
            clues.append(Clue(f"{kind} «{brand}»", " / ".join(where), "region" if russian else "country", 2,
                              country, russian))
    return clues


def add_regions(clues: list[Clue], gaz: Gazetteer) -> None:
    """Fill Clue.regions for the plain text clues (plates, area codes, alphabets)."""
    for c in clues:
        if c.regions:
            continue
        if c.place in REGIONS:
            c.regions = [c.place]
        elif c.level == "city":
            c.regions = regions_of_cities(gaz, [c.place])
        else:
            c.regions = regions_in(c.place)


def region_votes(clues: list[Clue]) -> Counter:
    votes: Counter = Counter()
    for c in clues:
        for r in c.regions:
            votes[r] += c.weight / max(1, len(c.regions))  # a clue pointing at 5 regions is weaker evidence
    return votes


def place_name_clues(text: str, gaz: Gazetteer, agreed: list[str]) -> tuple[list[Clue], dict | None]:
    """Settlement names read on the photo. Returns clues and, when one match is left after
    intersecting with the regions other clues agree on, that settlement."""
    clues, unique, seen = [], None, set()
    for m in WORD_RE.finditer(text):
        line_start = text.rfind("\n", 0, m.start()) + 1
        if STREET_RE.search(text[line_start:m.start()]):
            continue  # «ул. Загородная» is a street, not the village Загородная
        phrase = m.group(0)
        # try the whole phrase, then its words: «Дубровка Магазин» -> «Дубровка»
        for word in dict.fromkeys([phrase] + phrase.split()):
            key = word.lower().replace("ё", "е")
            if key in seen or len(key) < 4 or key in COMMON or any(w in COMMON for w in key.split()):
                continue
            seen.add(key)
            hits = gaz.lookup(word)
            if hits:
                break
        else:
            continue
        inside = [h for h in hits if h["region"] in agreed] if agreed else []
        by_region = Counter(h["region"] for h in hits)
        top = ", ".join(f"{r} — {n}" for r, n in by_region.most_common(3))
        if inside:
            regions = sorted({h["region"] for h in inside})
            place = f"{word}: {len(inside)} в регионе по другим уликам ({', '.join(regions)}), всего в России {len(hits)}"
        else:
            regions = list(by_region)[:5] if len(by_region) <= 5 else []
            place = f"{word}: населённых пунктов с таким названием в России {len(hits)} ({top})"
        clues.append(Clue(f"надпись «{word}»", place, "city", 1, "Россия", regions))
        pick = inside if agreed else hits
        if len(pick) == 1 and unique is None:
            unique = {**pick[0], "word": word, "total": len(hits), "agreed": bool(inside)}
        if len(clues) >= 6:
            break
    return clues, unique


def cheat_sheet() -> str:
    """Highways and brands for the Gemini prompt."""
    roads = [f"- {code}" + (f" «{name}»" if name else "") + ": " + " — ".join(cities)
             for code, (name, cities) in ROADS.items()]
    old = ", ".join(f"{o}={n}" for o, n in OLD_CODES.items())
    brands = [f"- «{b}» ({kind}): {', '.join(where)}" for b, (kind, where) in BRANDS.items()]
    brands += [f"- {b}: {where}" for b, where in SIGN_ONLY.items()]
    return ("\n## Федеральные трассы (номер на знаке или километровом столбе даёт коридор)\n" + "\n".join(roads) +
            f"\nСтарые номера, ещё встречаются на знаках: {old}.\n"
            "\n## Региональные сети, банки, АЗС, связь (национальные — Пятёрочка, Магнит, Сбербанк — регион не дают)\n" +
            "\n".join(brands) + "\n")
