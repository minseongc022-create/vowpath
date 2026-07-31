"""Execution and sizing unit tests."""

from __future__ import annotations

from oracle.core.types import (
    Action,
    AgentName,
    AgentOpinion,
    DecisionResult,
    Evidence,
    PortfolioState,
    RiskVeto,
    SignalDirection,
)
from oracle.execution.engine import KillSwitch, apply_paper_fill


def test_kill_switch_manual(monkeypatch):
    monkeypatch.setenv("ORACLE_KILL_SWITCH", "1")
    ks = KillSwitch(max_daily_loss_pct=0.03).check(0.0)
    assert ks.active is True


def test_kill_switch_daily_loss(monkeypatch):
    monkeypatch.delenv("ORACLE_KILL_SWITCH", raising=False)
    ks = KillSwitch(max_daily_loss_pct=0.03).check(-0.05)
    assert ks.active is True


def test_apply_paper_fill_buy_and_sell():
    state = PortfolioState(cash=10_000, positions=[])
    state = apply_paper_fill(state, "AAA", 10, 100)
    assert state.cash == 9_000
    assert state.positions[0].shares == 10
    state = apply_paper_fill(state, "AAA", -4, 110)
    assert abs(state.positions[0].shares - 6) < 1e-9
    assert abs(state.cash - (9000 + 440)) < 1e-6


def test_decision_result_roundtrip_fields():
    d = DecisionResult(
        symbol="SPY",
        action=Action.HOLD,
        confidence=0.5,
        composite_score=0.0,
        rationale="test",
        agent_opinions=[
            AgentOpinion(
                agent=AgentName.TECHNICAL,
                symbol="SPY",
                direction=SignalDirection.NEUTRAL,
                score=0.0,
                confidence=0.4,
                summary="x",
                evidence=[Evidence(claim="y", source="t")],
            )
        ],
        risk_veto=RiskVeto(active=False, reason="ok", confidence=0.6),
    )
    assert d.action == Action.HOLD
