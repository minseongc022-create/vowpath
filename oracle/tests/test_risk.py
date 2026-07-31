"""Risk manager unit tests with mocked market data."""

from __future__ import annotations

from unittest.mock import patch

import pandas as pd

from oracle.agents.risk_manager import RiskManagerAgent
from oracle.config import clear_settings_cache
from oracle.core.types import Action, PortfolioPosition, PortfolioState


def _price_df(n: int = 100, start: float = 100.0, shock: bool = False) -> pd.DataFrame:
    prices = [start]
    for i in range(1, n):
        if shock and i > n // 2:
            prices.append(prices[-1] * 0.97)
        else:
            prices.append(prices[-1] * 1.001)
    return pd.DataFrame(
        {
            "open": prices,
            "high": [p * 1.01 for p in prices],
            "low": [p * 0.99 for p in prices],
            "close": prices,
            "volume": [1_000_000] * n,
        }
    )


def test_veto_on_max_position():
    clear_settings_cache()
    portfolio = PortfolioState(
        cash=100,
        positions=[
            PortfolioPosition(symbol="AAPL", shares=100, avg_cost=100, market_price=100),
        ],
    )
    agent = RiskManagerAgent()
    with (
        patch("oracle.agents.risk_manager.cached_history", return_value=_price_df()),
        patch("oracle.agents.risk_manager.correlation", return_value=0.1),
    ):
        veto = agent.veto("AAPL", portfolio)
    assert veto.active is True
    assert Action.BUY in veto.blocked_actions
    clear_settings_cache()


def test_no_veto_healthy_cash_and_size():
    clear_settings_cache()
    portfolio = PortfolioState(
        cash=50_000,
        positions=[
            PortfolioPosition(symbol="SPY", shares=10, avg_cost=400, market_price=400),
        ],
    )
    agent = RiskManagerAgent()
    with (
        patch("oracle.agents.risk_manager.cached_history", return_value=_price_df()),
        patch("oracle.agents.risk_manager.correlation", return_value=0.2),
        patch("oracle.agents.risk_manager.annualized_volatility", return_value=0.12),
        patch("oracle.agents.risk_manager.max_drawdown", return_value=-0.05),
    ):
        veto = agent.veto("AAPL", portfolio)
    assert veto.active is False
    clear_settings_cache()
