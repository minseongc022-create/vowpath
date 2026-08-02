"""Persistent timestamped activity feed (survives browser close / restart)."""

from __future__ import annotations

import json
import sqlite3
import threading
from datetime import UTC, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from oracle.config import get_settings

# Korea Standard Time for user-facing clocks
KST = timezone(timedelta(hours=9))

_lock = threading.Lock()


def _now_utc() -> str:
    return datetime.now(UTC).isoformat()


def format_clock(ts: str | None, *, with_date: bool = False) -> str:
    """Format ISO ts as HH:MM:SS (KST)."""
    if not ts:
        return "--:--:--"
    try:
        raw = str(ts).replace("Z", "+00:00")
        dt = datetime.fromisoformat(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        local = dt.astimezone(KST)
        if with_date:
            return local.strftime("%m-%d %H:%M:%S")
        return local.strftime("%H:%M:%S")
    except Exception:
        # Fallback: slice common ISO shapes
        s = str(ts)
        if "T" in s and len(s) >= 19:
            return s[11:19]
        return s[:8]


class ActivityLog:
    """Append-only activity events for exploration / AI / trades."""

    def __init__(self, db_path: str | Path | None = None) -> None:
        settings = get_settings()
        self.path = Path(db_path or Path(settings.data_dir) / "activity.db")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._init()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    def _init(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS activity (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    title TEXT NOT NULL,
                    detail TEXT,
                    symbol TEXT,
                    meta TEXT
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_activity_ts ON activity(ts DESC)"
            )

    def add(
        self,
        kind: str,
        title: str,
        *,
        detail: str = "",
        symbol: str | None = None,
        meta: dict[str, Any] | None = None,
        ts: str | None = None,
    ) -> int:
        kind = (kind or "info").strip()[:40]
        title = (title or "").strip()[:240]
        if not title:
            return 0
        detail = (detail or "").strip()[:800]
        symbol = (symbol or "").strip().upper()[:16] or None
        row_ts = ts or _now_utc()
        meta_s = json.dumps(meta or {}, ensure_ascii=False)
        with _lock:
            with self._connect() as conn:
                cur = conn.execute(
                    """
                    INSERT INTO activity (ts, kind, title, detail, symbol, meta)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (row_ts, kind, title, detail, symbol, meta_s),
                )
                return int(cur.lastrowid or 0)

    def recent(self, limit: int = 80) -> list[dict[str, Any]]:
        limit = max(1, min(int(limit), 300))
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, ts, kind, title, detail, symbol, meta
                FROM activity
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        out: list[dict[str, Any]] = []
        for r in rows:
            meta: dict[str, Any] = {}
            try:
                meta = json.loads(r["meta"] or "{}")
            except Exception:
                meta = {}
            ts = r["ts"]
            out.append(
                {
                    "id": r["id"],
                    "ts": ts,
                    "clock": format_clock(ts),
                    "clock_full": format_clock(ts, with_date=True),
                    "kind": r["kind"],
                    "title": r["title"],
                    "detail": r["detail"] or "",
                    "symbol": r["symbol"],
                    "meta": meta,
                }
            )
        return out


def log_activity(
    kind: str,
    title: str,
    *,
    detail: str = "",
    symbol: str | None = None,
    meta: dict[str, Any] | None = None,
) -> int:
    return ActivityLog().add(kind, title, detail=detail, symbol=symbol, meta=meta)
