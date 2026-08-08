"""Portfolio load / save and SQLite decision log."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import yaml

from oracle.config import resolve_path
from oracle.core.exceptions import ConfigError
from oracle.core.types import DecisionResult, PortfolioPosition, PortfolioState
from oracle.data.market import fetch_snapshot


def load_portfolio(path: str | Path) -> PortfolioState:
    p = resolve_path(path)
    if not p.exists():
        # Fall back to example so MVP runs out of the box
        example = resolve_path("config/portfolio.example.yaml")
        if example.exists():
            p = example
        else:
            raise ConfigError(f"Portfolio file not found: {path}")

    with p.open("r", encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}

    positions = [
        PortfolioPosition(
            symbol=str(row["symbol"]).upper(),
            shares=float(row["shares"]),
            avg_cost=float(row["avg_cost"]),
        )
        for row in raw.get("positions", [])
    ]
    targets = {str(k).upper(): float(v) for k, v in (raw.get("targets") or {}).items()}
    state = PortfolioState(
        cash=float(raw.get("cash", 0)),
        currency=str(raw.get("currency", "USD")),
        positions=positions,
        targets=targets,
    )
    return mark_to_market(state)


def mark_to_market(state: PortfolioState) -> PortfolioState:
    updated: list[PortfolioPosition] = []
    for pos in state.positions:
        try:
            snap = fetch_snapshot(pos.symbol)
            updated.append(
                PortfolioPosition(
                    symbol=pos.symbol,
                    shares=pos.shares,
                    avg_cost=pos.avg_cost,
                    market_price=snap.price,
                )
            )
        except Exception:
            updated.append(pos)
    return PortfolioState(
        cash=state.cash,
        currency=state.currency,
        positions=updated,
        targets=state.targets,
    )


class DecisionStore:
    """SQLite log of every DecisionResult — audit trail for the AI hedge fund."""

    def __init__(self, db_path: str | Path) -> None:
        self.path = Path(db_path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS decisions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    action TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    composite_score REAL NOT NULL,
                    rationale TEXT NOT NULL,
                    risk_veto INTEGER NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS runs (
                    run_id TEXT PRIMARY KEY,
                    session TEXT NOT NULL,
                    market_summary TEXT,
                    portfolio_equity REAL,
                    portfolio_risk_score REAL,
                    created_at TEXT NOT NULL
                )
                """
            )

    def save_run(
        self,
        run_id: str,
        session: str,
        market_summary: str,
        portfolio_equity: float,
        portfolio_risk_score: float,
        decisions: list[DecisionResult],
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO runs
                (run_id, session, market_summary, portfolio_equity, portfolio_risk_score, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
                """,
                (run_id, session, market_summary, portfolio_equity, portfolio_risk_score),
            )
            for d in decisions:
                conn.execute(
                    """
                    INSERT INTO decisions
                    (run_id, symbol, action, confidence, composite_score, rationale,
                     risk_veto, payload, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    """,
                    (
                        run_id,
                        d.symbol,
                        d.action.value,
                        d.confidence,
                        d.composite_score,
                        d.rationale,
                        1 if d.risk_veto and d.risk_veto.active else 0,
                        d.model_dump_json(),
                    ),
                )

    def recent_decisions(self, limit: int = 50) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT symbol, action, confidence, composite_score, rationale, created_at
                FROM decisions ORDER BY id DESC LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]
