"""Paper trade journal — record planned vs filled decisions."""

from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

from oracle.config import get_settings


@dataclass
class JournalEntry:
    ts: str
    symbol: str
    action: str
    shares: float
    price: float
    rationale: str
    run_id: str | None = None
    status: str = "planned"  # planned | filled | cancelled | rejected
    pnl_pct: float | None = None


class TradeJournal:
    def __init__(self, db_path: str | Path | None = None) -> None:
        settings = get_settings()
        self.path = Path(db_path or Path(settings.data_dir) / "journal.db")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._init()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS journal (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    action TEXT NOT NULL,
                    shares REAL NOT NULL,
                    price REAL NOT NULL,
                    rationale TEXT,
                    run_id TEXT,
                    status TEXT NOT NULL,
                    pnl_pct REAL,
                    payload TEXT
                )
                """
            )

    def add(self, entry: JournalEntry) -> int:
        with self._connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO journal
                (ts, symbol, action, shares, price, rationale, run_id, status, pnl_pct, payload)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    entry.ts,
                    entry.symbol,
                    entry.action,
                    entry.shares,
                    entry.price,
                    entry.rationale,
                    entry.run_id,
                    entry.status,
                    entry.pnl_pct,
                    json.dumps(asdict(entry)),
                ),
            )
            return int(cur.lastrowid)

    def list_recent(self, limit: int = 50) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM journal ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
        return [dict(r) for r in rows]

    def update_status(self, entry_id: int, status: str) -> None:
        with self._connect() as conn:
            conn.execute("UPDATE journal SET status=? WHERE id=?", (status, entry_id))


def now_iso() -> str:
    return datetime.now(UTC).isoformat()
