"""Backtest engine smoke test with synthetic prices."""

from __future__ import annotations

from unittest.mock import patch

import numpy as np
import pandas as pd

from oracle.backtest.engine import run_sma_backtest


def test_sma_backtest_runs():
    rng = np.random.default_rng(0)
    n = 300
    rets = rng.normal(0.0005, 0.01, size=n)
    close = 100 * np.cumprod(1 + rets)
    df = pd.DataFrame(
        {
            "open": close,
            "high": close * 1.01,
            "low": close * 0.99,
            "close": close,
            "volume": np.full(n, 1e6),
        }
    )
    with patch("oracle.backtest.engine.fetch_history", return_value=df):
        result = run_sma_backtest("TEST", days=300, fast=10, slow=30)
    assert result.symbol == "TEST"
    assert result.n_trades >= 0
    assert 0 <= result.win_rate <= 1
    assert result.max_drawdown >= 0
