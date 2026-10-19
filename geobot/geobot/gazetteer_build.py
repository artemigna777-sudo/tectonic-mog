"""Build data/ru_places.sqlite from the GeoNames dump of Russia (GeoNames, CC BY 4.0).

Run `python tools/build_gazetteer.py [RU.txt]`; the bot also does it on start-up when the
database is missing.
"""

import difflib
import io
import re
import sqlite3
import sys
import urllib.request
import zipfile
from pathlib import Path

from .data.ru_regions import GEONAMES_ADMIN1
from .textclues import norm_latin

URL = "https://download.geonames.org/export/dump/RU.zip"
OUT = Path(__file__).parent / "data" / "ru_places.sqlite"
CYR = re.compile(r"[а-яё]", re.I)
NON_RUSSIAN = re.compile(r"[әөүҗңһҙҡҫғқұӑӗӳҕҥіїєўі]", re.I)


def russian_first(names: list[str], ascii_name: str) -> list[str]:
    """Order Cyrillic variants so the Russian spelling comes first (Tatar, Bashkir, abbreviations last)."""
    target = norm_latin(ascii_name)

    def score(n: str) -> tuple[float, int]:
        s = difflib.SequenceMatcher(None, norm_latin(n), target).ratio()
        s -= (1 if NON_RUSSIAN.search(n) else 0) + (0.5 if "." in n else 0)
        s -= 1 if re.search(r"[a-z]", n, re.I) else 0  # mixed scripts like «Ufа»
        return s, len(n)  # on a tie «Казань» beats Tatar «Казан»

    return sorted(names, key=score, reverse=True)


def norm(name: str) -> str:
    return re.sub(r"\s+", " ", name.lower().replace("ё", "е")).strip()


def rows(lines):
    for line in lines:
        f = line.rstrip("\n").split("\t")
        if len(f) < 15 or f[6] != "P" or f[10] not in GEONAMES_ADMIN1:
            continue
        names = [f[1]] + f[3].split(",")
        cyr = []
        for n in names:
            n = n.strip()
            if n and CYR.search(n) and len(n) <= 40 and n not in cyr:
                cyr.append(n)
        if cyr:
            yield russian_first(cyr, f[2]), float(f[4]), float(f[5]), GEONAMES_ADMIN1[f[10]], f[7], int(f[14] or 0)


def build(lines, out: Path = OUT) -> int:
    tmp = out.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    db = sqlite3.connect(tmp)
    db.executescript("""
        CREATE TABLE places (id INTEGER PRIMARY KEY, name TEXT, lat REAL, lon REAL, region TEXT, code TEXT, pop INTEGER);
        CREATE TABLE names (norm TEXT, place INTEGER);
    """)
    n = 0
    for i, (cyr, lat, lon, region, code, pop) in enumerate(rows(lines)):
        db.execute("INSERT INTO places VALUES (?,?,?,?,?,?,?)", (i, cyr[0], lat, lon, region, code, pop))
        db.executemany("INSERT INTO names VALUES (?,?)", [(k, i) for k in dict.fromkeys(norm(c) for c in cyr[:8])])
        n += 1
    db.executescript("""
        CREATE INDEX names_norm ON names(norm);
        CREATE INDEX places_lat ON places(lat);
        VACUUM;
    """)
    db.close()
    tmp.replace(out)
    return n


def build_from(source: str | None = None, out: Path = OUT) -> int:
    """source: path to RU.txt, or None to download RU.zip from GeoNames."""
    if source:
        with open(source, encoding="utf-8") as lines:
            return build(lines, out)
    with urllib.request.urlopen(URL, timeout=300) as r:
        z = zipfile.ZipFile(io.BytesIO(r.read()))
    with io.TextIOWrapper(z.open("RU.txt"), encoding="utf-8") as lines:
        return build(lines, out)


def main() -> None:
    n = build_from(sys.argv[1] if len(sys.argv) > 1 else None)
    print(f"{n} places -> {OUT} ({OUT.stat().st_size // 1024} KB)")
