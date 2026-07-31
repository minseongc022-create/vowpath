"""Session helpers — pre-market / open / post-market labels.

MVP: caller chooses session. Phase 2: APScheduler / cron with exchange calendar.
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo


def infer_session(now: datetime | None = None, tz_name: str = "America/New_York") -> str:
    tz = ZoneInfo(tz_name)
    now = now or datetime.now(tz)
    now = now.replace(tzinfo=tz) if now.tzinfo is None else now.astimezone(tz)

    minutes = now.hour * 60 + now.minute
    # Rough US equity session
    if minutes < 9 * 60 + 30:
        return "pre_market"
    if minutes < 16 * 60:
        return "market_open"
    return "post_market"
