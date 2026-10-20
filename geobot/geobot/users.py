"""Who uses the bot: daily photo counters, bans and totals for the admin."""

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

log = logging.getLogger(__name__)
MSK = timezone(timedelta(hours=3))  # the daily limit resets at midnight Moscow time
KEEP_DAYS = 30


def today() -> str:
    return datetime.now(MSK).strftime("%Y-%m-%d")


class Users:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.data: dict = {}
        try:
            self.data = json.loads(self.path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            pass
        except Exception as e:
            log.warning("users file unreadable, starting empty: %s", e)
        self.data.setdefault("banned", [])
        self.data.setdefault("days", {})  # date -> {uid: photos}
        self.data.setdefault("totals", {})  # uid -> photos ever
        self.data.setdefault("names", {})  # uid -> @username or first name, for the admin
        self.data.setdefault("joined", {})  # uid -> when they asked to join the channel
        self.data.setdefault("free", {"day": "", "users": {}})  # free photos used today
        self.data.setdefault("credits", {})  # uid -> paid photos left
        self.data.setdefault("payments", [])  # Telegram Stars purchases

    def _save(self) -> None:
        tmp = self.path.with_suffix(".tmp")
        try:
            tmp.write_text(json.dumps(self.data, ensure_ascii=False), encoding="utf-8")
            os.replace(tmp, self.path)
        except OSError as e:
            log.warning("users not saved: %s", e)

    def is_banned(self, uid: int) -> bool:
        return uid in self.data["banned"]

    def ban(self, uid: int) -> bool:
        if self.is_banned(uid):
            return False
        self.data["banned"].append(uid)
        self._save()
        return True

    def unban(self, uid: int) -> bool:
        if not self.is_banned(uid):
            return False
        self.data["banned"].remove(uid)
        self._save()
        return True

    def used_today(self, uid: int) -> int:
        return self.data["days"].get(today(), {}).get(str(uid), 0)

    def count(self, uid: int, name: str = "", n: int = 1) -> None:
        """Add n photos to today's counter (n=-1 gives one back when the analysis failed)."""
        days = self.data["days"]
        day = days.setdefault(today(), {})
        day[str(uid)] = max(0, day.get(str(uid), 0) + n)
        self.data["totals"][str(uid)] = max(0, self.data["totals"].get(str(uid), 0) + n)
        if name:
            self.data["names"][str(uid)] = name
        for old in sorted(days)[:-KEEP_DAYS]:
            del days[old]
        self._save()

    # ─── Channel ───────────────────────────────────────────────────────────────

    def joined(self, uid: int) -> bool:
        return str(uid) in self.data["joined"]

    def mark_joined(self, uid: int) -> bool:
        if self.joined(uid):
            return False
        self.data["joined"][str(uid)] = datetime.now(MSK).isoformat(timespec="seconds")
        self._save()
        return True

    # ─── Free photos and paid credits ─────────────────────────────────────────

    def free_used(self, uid: int) -> int:
        f = self.data["free"]
        return f["users"].get(str(uid), 0) if f["day"] == today() else 0

    def use_free(self, uid: int, n: int = 1) -> None:
        f = self.data["free"]
        if f["day"] != today():
            f["day"], f["users"] = today(), {}
        f["users"][str(uid)] = max(0, f["users"].get(str(uid), 0) + n)
        self._save()

    def credits(self, uid: int) -> int:
        return self.data["credits"].get(str(uid), 0)

    def add_credits(self, uid: int, n: int) -> int:
        left = max(0, self.credits(uid) + n)
        self.data["credits"][str(uid)] = left
        self._save()
        return left

    def add_payment(self, uid: int, stars: int, photos: int, charge: str) -> None:
        self.data["payments"].append({"uid": uid, "stars": stars, "photos": photos, "charge": charge,
                                      "day": today(), "refunded": False})
        self._save()

    def payment(self, charge: str) -> dict | None:
        return next((p for p in self.data["payments"] if p["charge"] == charge), None)

    def mark_refunded(self, charge: str) -> None:
        p = self.payment(charge)
        if p:
            p["refunded"] = True
            self._save()

    def stats(self) -> dict:
        day = self.data["days"].get(today(), {})
        week = set()
        for d in sorted(self.data["days"])[-7:]:
            week |= {u for u, n in self.data["days"][d].items() if n}
        return {
            "users_total": sum(1 for n in self.data["totals"].values() if n),
            "users_today": sum(1 for n in day.values() if n),
            "users_week": len(week),
            "photos_today": sum(day.values()),
            "photos_total": sum(self.data["totals"].values()),
            "top_today": sorted(((int(u), n) for u, n in day.items() if n), key=lambda x: -x[1])[:10],
            "banned": list(self.data["banned"]),
            "joined": len(self.data["joined"]),
            "stars_total": sum(p["stars"] for p in self.data["payments"] if not p["refunded"]),
            "stars_today": sum(p["stars"] for p in self.data["payments"] if not p["refunded"] and p["day"] == today()),
            "purchases": sum(1 for p in self.data["payments"] if not p["refunded"]),
            "last_payments": self.data["payments"][-5:],
        }

    def name(self, uid: int) -> str:
        return self.data["names"].get(str(uid), "")
