"""Fact-based edge helpers: regime VIX level, ATR stops, earnings gate."""

from __future__ import annotations

from datetime import date, timedelta
from types import SimpleNamespace

from oracle.data.regime import build_regime
from oracle.portfolio.stops import atr_stop_exits


def test_regime_uses_vix_level_not_day_pct(monkeypatch):
    # Day change tiny (±2%) must NOT trigger risk_on via old buggy threshold
    monkeypatch.setattr(
        "oracle.data.regime.index_overview",
        lambda: {"SPY": 0.5, "QQQ": 0.4, "^VIX": -2.1},
    )
    monkeypatch.setattr(
        "oracle.data.regime.fetch_macro_snapshot",
        lambda: SimpleNamespace(levels={"vix": 28.5}, day_change_pct={}, notes=[]),
    )
    r = build_regime()
    assert r["vix_level"] == 28.5
    assert r["risk_off"] is True
    assert r["label"] == "risk_off"


def test_regime_risk_on_needs_low_vix_level(monkeypatch):
    monkeypatch.setattr(
        "oracle.data.regime.index_overview",
        lambda: {"SPY": 0.8, "QQQ": 0.6, "^VIX": 1.2},
    )
    monkeypatch.setattr(
        "oracle.data.regime.fetch_macro_snapshot",
        lambda: SimpleNamespace(levels={"vix": 14.0}, day_change_pct={}, notes=[]),
    )
    r = build_regime()
    assert r["risk_on"] is True
    assert r["label"] == "risk_on"


def test_atr_stop_triggers_on_hard_loss(monkeypatch):
    import pandas as pd
    import numpy as np

    # Synthetic downtrend OHLCV so ATR > 0 and price << cost
    idx = pd.date_range("2026-01-01", periods=40, freq="D")
    close = pd.Series(np.linspace(100, 85, 40), index=idx)
    df = pd.DataFrame(
        {
            "open": close,
            "high": close + 1,
            "low": close - 1,
            "close": close,
            "volume": 1_000_000,
        },
        index=idx,
    )
    monkeypatch.setattr("oracle.portfolio.stops.cached_history", lambda *a, **k: df)
    monkeypatch.setattr(
        "oracle.portfolio.stops.fetch_snapshot",
        lambda s: SimpleNamespace(price=85.0),
    )
    port = SimpleNamespace(
        positions=[
            SimpleNamespace(symbol="TEST", shares=10, avg_cost=100.0, market_price=85.0)
        ]
    )
    exits = atr_stop_exits(port)
    assert exits and exits[0].symbol == "TEST"
    assert exits[0].action.value in {"Sell", "Reduce"}


def test_earnings_blackout_yaml(monkeypatch):
    from oracle.data import earnings as eg

    today = date.today()
    monkeypatch.setattr(
        eg,
        "events_for_symbol",
        lambda symbol, days=21: [
            SimpleNamespace(
                date=today,
                title="Earnings",
                category="earnings",
                symbols=[symbol],
                importance="high",
                notes="",
            )
        ],
    )
    monkeypatch.setattr(eg, "_yf_next_earnings", lambda s: None)
    blocked, why = eg.earnings_blackout("AAPL", days=1)
    assert blocked is True
    assert "실적" in why


def test_us_session_has_buy_ok_keys():
    from oracle.execution.autopilot import us_equity_session

    s = us_equity_session()
    assert "buy_ok" in s
    assert "open" in s
