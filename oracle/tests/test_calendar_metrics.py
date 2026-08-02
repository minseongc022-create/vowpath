"""Calendar + metrics tests."""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from oracle.backtest.metrics import compute_metrics
from oracle.data.calendar import load_calendar


def test_compute_metrics_smoke():
    equity = pd.Series([1.0, 1.01, 0.99, 1.02, 1.05])
    rets = equity.pct_change().fillna(0.0)
    m = compute_metrics(equity, rets, n_trades=3)
    assert m.n_bars == 5
    assert m.max_drawdown >= 0
    assert -1 <= m.total_return <= 10


def test_load_calendar(tmp_path: Path):
    p = tmp_path / "cal.yaml"
    future = (date.today() + timedelta(days=3)).isoformat()
    p.write_text(
        f"""
events:
  - date: {future}
    title: Test CPI
    category: cpi
    symbols: [SPY]
    importance: high
""",
        encoding="utf-8",
    )
    events = load_calendar(p)
    assert len(events) == 1
    assert events[0].title == "Test CPI"
