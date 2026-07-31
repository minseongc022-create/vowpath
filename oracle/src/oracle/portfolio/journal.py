"""Paper trade journal — planned / filled / rejected with idempotency keys."""

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
    client_order_id: str | None = None


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
                    payload TEXT,
                    client_order_id TEXT
                )
                """
            )
            cols = {r[1] for r in conn.execute("PRAGMA table_info(journal)").fetchall()}
            if "client_order_id" not in cols:
                conn.execute("ALTER TABLE journal ADD COLUMN client_order_id TEXT")

    def add(self, entry: JournalEntry) -> int:
        with self._connect() as conn:
            if entry.client_order_id:
                existing = conn.execute(
                    "SELECT id FROM journal WHERE client_order_id=? LIMIT 1",
                    (entry.client_order_id,),
                ).fetchone()
                if existing:
                    return int(existing["id"])
            cur = conn.execute(
                """
                INSERT INTO journal
                (ts, symbol, action, shares, price, rationale, run_id, status, pnl_pct, payload, client_order_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    entry.client_order_id,
                ),
            )
            return int(cur.lastrowid)

    def get(self, entry_id: int) -> dict | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM journal WHERE id=?", (entry_id,)).fetchone()
        return dict(row) if row else None

    def list_recent(self, limit: int = 50, status: str | None = None) -> list[dict]:
        with self._connect() as conn:
            if status:
                rows = conn.execute(
                    "SELECT * FROM journal WHERE status=? ORDER BY id DESC LIMIT ?",
                    (status, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM journal ORDER BY id DESC LIMIT ?", (limit,)
                ).fetchall()
        return [dict(r) for r in rows]

    def update_status(self, entry_id: int, status: str) -> None:
        with self._connect() as conn:
            conn.execute("UPDATE journal SET status=? WHERE id=?", (status, entry_id))


def now_iso() -> str:
    return datetime.now(UTC).isoformat()
