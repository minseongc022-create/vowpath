"""Walk-forward + coverage confidence tests."""

from __future__ import annotations

from unittest.mock import patch

import numpy as np
import pandas as pd

from oracle.agents.base import coverage_adjusted_confidence
from oracle.backtest.walk_forward import run_walk_forward


def test_coverage_adjusted_confidence_penalizes_thin_evidence():
    rich = coverage_adjusted_confidence(0.8, n_evidence=6, expected_evidence=4)
    thin = coverage_adjusted_confidence(0.8, n_evidence=0, expected_evidence=4)
    stale = coverage_adjusted_confidence(0.8, n_evidence=6, expected_evidence=4, stale=True)
    assert rich > thin
    assert stale < rich
    assert thin < 0.3


def test_walk_forward_with_synthetic_prices():
    rng = np.random.default_rng(1)
    n = 800
    rets = rng.normal(0.0004, 0.01, size=n)
    close = 100 * np.cumprod(1 + rets)
    df = pd.DataFrame(
        {
            "open": close,
            "high": close * 1.01,
            "low": close * 0.99,
            "close": close,
            "volume": np.full(n, 1e6),
        },
        index=pd.date_range("2020-01-01", periods=n, freq="B"),
    )
    with patch("oracle.backtest.walk_forward.fetch_history", return_value=df):
        result = run_walk_forward("TEST", days=800, train_bars=252, test_bars=63, step_bars=63)
    assert result.n_folds >= 1
    assert len(result.equity_curve) > 0
