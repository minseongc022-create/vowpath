"""24h session runner — pre-market / open / post-market loops."""

from __future__ import annotations

import logging
import time
from datetime import datetime
from zoneinfo import ZoneInfo

from oracle.config import get_settings
from oracle.orchestration.pipeline import OraclePipeline
from oracle.reports.daily import write_daily_report

logger = logging.getLogger("oracle.scheduler")


def infer_session(now: datetime | None = None, tz_name: str = "America/New_York") -> str:
    tz = ZoneInfo(tz_name)
    now = now or datetime.now(tz)
    now = now.replace(tzinfo=tz) if now.tzinfo is None else now.astimezone(tz)
    minutes = now.hour * 60 + now.minute
    if minutes < 9 * 60 + 30:
        return "pre_market"
    if minutes < 16 * 60:
        return "market_open"
    return "post_market"


def run_session_once(session: str | None = None, write_report: bool = True) -> str:
    settings = get_settings()
    session = session or infer_session(tz_name=settings.timezone)
    result = OraclePipeline(settings).run(session=session)
    path = ""
    if write_report:
        path = str(write_daily_report(result))
        try:
            from pathlib import Path

            from oracle.notify import notify_report

            notify_report(Path(path))
        except Exception as exc:
            logger.debug("notify skipped: %s", exc)
    logger.info("session=%s run_id=%s report=%s", session, result.run_id, path)
    return result.run_id


def run_forever(poll_seconds: int = 3600) -> None:
    """Blocking loop for 24h operation (Docker / local daemon).

    Default: wake hourly, run the session appropriate for US equity clock.
    For denser monitoring set ORACLE_POLL_SECONDS lower (e.g. 900).
    """
    settings = get_settings()
    logger.info("Oracle daemon starting poll=%ss tz=%s", poll_seconds, settings.timezone)
    last_key = ""
    while True:
        session = infer_session(tz_name=settings.timezone)
        # Run at most once per session bucket per calendar day
        day = datetime.now(ZoneInfo(settings.timezone)).strftime("%Y-%m-%d")
        key = f"{day}:{session}"
        # Also allow market_open refreshes every poll
        should_run = key != last_key or session == "market_open"
        if should_run:
            try:
                run_session_once(session=session, write_report=True)
                last_key = key
            except Exception:
                logger.exception("session run failed")
        time.sleep(max(60, poll_seconds))
