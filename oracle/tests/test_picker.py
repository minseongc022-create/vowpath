"""Smart picker unit tests."""

from __future__ import annotations

from oracle.core.types import Action, DecisionResult, RiskVeto
from oracle.portfolio import picker as pk


def _dec(
    symbol: str,
    action: Action,
    score: float,
    conf: float = 0.6,
    veto: bool = False,
) -> DecisionResult:
    return DecisionResult(
        symbol=symbol,
        action=action,
        confidence=conf,
        composite_score=score,
        rationale=f"test {symbol}",
        agent_opinions=[],
        risk_veto=RiskVeto(active=veto, reason="test", confidence=0.9),
    )


def test_load_trade_universe_is_broad():
    uni = pk.load_trade_universe()
    assert "SPY" in uni
    assert "NVDA" in uni
    assert len(uni) >= 80


def test_rank_promotes_strong_hold_to_buy(monkeypatch):
    monkeypatch.setattr(
        pk,
        "screen_universe",
        lambda *a, **k: [
            pk.PickScore("NVDA", 0.08, 0.12, 0.05, 0.3, ["hot"], short_score=0.1, long_score=0.05),
            pk.PickScore("WEAK", -0.05, -0.08, -0.04, 0.4, ["cold"], short_score=-0.05, long_score=-0.04),
        ],
    )
    buy, sell = pk.rank_decisions_for_trade(
        [
            _dec("NVDA", Action.HOLD, 0.35, 0.55),
            _dec("WEAK", Action.HOLD, -0.3, 0.5),
        ],
        held={"WEAK"},
    )
    assert buy is not None and buy.symbol == "NVDA" and buy.action == Action.BUY
    assert sell is not None and sell.symbol == "WEAK"
    assert sell.action in (Action.REDUCE, Action.SELL)


def test_risk_veto_blocks_buy(monkeypatch):
    monkeypatch.setattr(
        pk,
        "screen_universe",
        lambda *a, **k: [pk.PickScore("RISKY", 0.1, 0.2, 0.1, 0.5, ["x"])],
    )
    buy, sell = pk.rank_decisions_for_trade(
        [_dec("RISKY", Action.BUY, 0.5, 0.8, veto=True)],
        held=set(),
    )
    assert buy is None
    assert sell is None


def test_autopilot_status_includes_picks():
    from oracle.execution import autopilot as ap

    ap._last["picks"] = [{"symbol": "AAPL", "screen_score": 0.1, "mom_20": 0.02, "rs_spy": 0.01, "price": 100.0}]
    st = ap.status()
    assert st.picks and st.picks[0]["symbol"] == "AAPL"
