"""Journal + oversell guard tests."""

from __future__ import annotations

import pytest

from oracle.core.types import PortfolioPosition, PortfolioState
from oracle.execution.engine import apply_paper_fill
from oracle.portfolio.journal import JournalEntry, TradeJournal, now_iso


def test_oversell_blocked():
    state = PortfolioState(
        cash=1000,
        positions=[PortfolioPosition(symbol="AAA", shares=5, avg_cost=10, market_price=10)],
    )
    with pytest.raises(ValueError, match="Oversell"):
        apply_paper_fill(state, "AAA", -10, 10)


def test_journal_idempotent_client_order_id(tmp_path, monkeypatch):
    monkeypatch.setenv("ORACLE_DATA_DIR", str(tmp_path))
    from oracle.config import clear_settings_cache

    clear_settings_cache()
    j = TradeJournal(tmp_path / "journal.db")
    e = JournalEntry(
        ts=now_iso(),
        symbol="SPY",
        action="Buy",
        shares=1,
        price=100,
        rationale="t",
        status="planned",
        client_order_id="oracle-test-1",
    )
    a = j.add(e)
    b = j.add(e)
    assert a == b
    row = j.get(a)
    assert row is not None
    assert row["client_order_id"] == "oracle-test-1"
    clear_settings_cache()
