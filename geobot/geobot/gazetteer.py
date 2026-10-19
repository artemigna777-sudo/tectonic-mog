"""Offline gazetteer of Russian settlements (GeoNames, built by tools/build_gazetteer.py)."""

import logging
import re
import sqlite3
from pathlib import Path

from .data.ru_regions import EXTRA_ALIASES, GEONAMES_ADMIN1

log = logging.getLogger(__name__)
DB_PATH = Path(__file__).parent / "data" / "ru_places.sqlite"
REGIONS = sorted(set(GEONAMES_ADMIN1.values()))


def norm(name: str) -> str:
    return re.sub(r"\s+", " ", name.lower().replace("ё", "е")).strip()


def _aliases() -> dict[str, list[str]]:
    """Stems that identify a region in free text: «Татарстан», «Нижегородская обл.», «Москва»."""
    skip = {"республика", "область", "край", "автономный", "округ", "—"}
    out: dict[str, list[str]] = {}
    for region in REGIONS:
        words = [w for w in re.split(r"[\s()]+", region.lower()) if w and w not in skip]
        stems = []
        for w in words:
            # adjectives keep their «-ск-» so «Новгородская» ≠ «Нижний Новгород»
            stems.append(w[:-2] if w.endswith(("ая", "ий", "ой")) else w)
        out[region] = stems[:1] + EXTRA_ALIASES.get(region, [])
    return out


ALIASES = _aliases()


def regions_in(text: str) -> list[str]:
    """Canonical regions mentioned in a piece of text, e.g. a Gemini candidate or a map label."""
    low = norm(text)
    found = [r for r, stems in ALIASES.items() if any(s and s in low for s in stems)]
    # «Москва» inside «Московская область» is not the city
    if "Московская область" in found and "Москва" in found and "москва" not in low:
        found.remove("Москва")
    return found


class Gazetteer:
    def __init__(self, path: Path = DB_PATH):
        self.path = Path(path)
        self.db: sqlite3.Connection | None = None
        if self.path.is_file():
            self.db = sqlite3.connect(f"file:{self.path}?mode=ro", uri=True, check_same_thread=False)

    @property
    def ready(self) -> bool:
        return self.db is not None

    def lookup(self, name: str) -> list[dict]:
        if not self.db:
            return []
        rows = self.db.execute(
            "SELECT p.name, p.lat, p.lon, p.region, p.code, p.pop FROM names n JOIN places p ON p.id = n.place "
            "WHERE n.norm = ? ORDER BY p.pop DESC", (norm(name),)).fetchall()
        return [{"name": r[0], "lat": r[1], "lon": r[2], "region": r[3], "code": r[4], "pop": r[5]} for r in rows]

    def biggest(self, name: str) -> dict | None:
        hits = self.lookup(name)
        return hits[0] if hits else None

    def nearest(self, lat: float, lon: float, box: float = 0.5) -> dict | None:
        """Closest settlement, mainly to tell which region a point is in."""
        if not self.db:
            return None
        rows = self.db.execute(
            "SELECT name, lat, lon, region, pop FROM places WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?",
            (lat - box, lat + box, lon - box * 2, lon + box * 2)).fetchall()
        if not rows:
            return None
        r = min(rows, key=lambda r: (r[1] - lat) ** 2 + ((r[2] - lon) * 0.55) ** 2)
        return {"name": r[0], "lat": r[1], "lon": r[2], "region": r[3], "pop": r[4]}
