"""Remember predictions and the true answers the user gives, to measure accuracy."""

import json
import logging
import math
import os
import time
from collections import Counter
from pathlib import Path

log = logging.getLogger(__name__)

# GeoGuessr-style buckets: street, city, region, country
THRESHOLDS = [(1, "до 1 км (улица)"), (25, "до 25 км (город)"), (200, "до 200 км (регион)"),
              (750, "до 750 км (страна)")]


def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(min(1.0, a)))


class History:
    def __init__(self, path: str | Path, limit: int = 3000):
        self.path = Path(path)
        self.limit = limit
        self.items: dict[str, dict] = {}
        try:
            self.items = json.loads(self.path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            pass
        except Exception as e:
            log.warning("history unreadable, starting empty: %s", e)

    def _save(self) -> None:
        tmp = self.path.with_suffix(".tmp")
        try:
            tmp.write_text(json.dumps(self.items, ensure_ascii=False), encoding="utf-8")
            os.replace(tmp, self.path)
        except OSError as e:
            log.warning("history not saved: %s", e)

    def add(self, key: str, record: dict) -> None:
        self.items[key] = {**record, "ts": time.time()}
        if len(self.items) > self.limit:
            for old in sorted(self.items, key=lambda k: self.items[k].get("ts", 0))[: len(self.items) - self.limit]:
                del self.items[old]
        self._save()

    def find(self, chat: int, reply_to: int | None = None) -> tuple[str, dict] | None:
        """The analysis the user is answering: the one replied to, else the latest in this chat."""
        mine = [(k, v) for k, v in self.items.items() if v.get("chat") == chat]
        if reply_to is not None:
            for k, v in mine:
                if reply_to in (v.get("result_msg"), v.get("photo_msg")):
                    return k, v
        return max(mine, key=lambda kv: kv[1].get("ts", 0)) if mine else None

    def set_truth(self, key: str, lat: float, lon: float, label: str, region: str | None = None) -> dict:
        rec = self.items[key]
        rec["truth"] = {"lat": lat, "lon": lon, "label": label, "region": region}
        best = rec.get("best")
        rec["error_km"] = distance_km(best["lat"], best["lon"], lat, lon) if best else None
        dists = [distance_km(c["lat"], c["lon"], lat, lon) for c in rec.get("candidates") or []
                 if c.get("lat") is not None and c.get("lon") is not None]
        rec["candidate_errors"] = dists
        self._save()
        return rec

    def region_counts(self, chat: int) -> Counter:
        """Where this user's photos turned out to be, by region of the true answers."""
        return Counter(v["truth"]["region"] for v in self.items.values()
                       if v.get("chat") == chat and (v.get("truth") or {}).get("region"))

    def prior_hint(self, chat: int, minimum: int = 3) -> str:
        counts = self.region_counts(chat)
        total = sum(counts.values())
        if total < minimum:
            return ""
        top = ", ".join(f"{r} — {n} из {total}" for r, n in counts.most_common(3))
        return (f"Подсказка из истории: раньше фото этого пользователя с известным ответом оказывались здесь: {top}. "
                "Это лишь вероятность заранее — фото может быть из поездки; улики в кадре важнее.")

    def stats(self, chat: int | None = None) -> dict:
        """Accuracy over this chat's answered photos, or over everyone's when chat is None."""
        done = [v for v in self.items.values() if v.get("truth") and (chat is None or v.get("chat") == chat)]
        errors = sorted(v["error_km"] for v in done if v.get("error_km") is not None)
        top5 = [min(v["candidate_errors"]) for v in done if v.get("candidate_errors")]
        return {
            "answered": len(done),
            "no_point": sum(1 for v in done if v.get("error_km") is None),
            "median_km": errors[len(errors) // 2] if errors else None,
            "buckets": [(label, sum(1 for e in errors if e <= km)) for km, label in THRESHOLDS],
            "with_point": len(errors),
            "top5_region": sum(1 for d in top5 if d <= 200),
            "top5_total": len(top5),
        }
