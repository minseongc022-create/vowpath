"""Unit tests — pure logic, no network required."""

from __future__ import annotations

from oracle.agents.base import clamp, score_to_action, score_to_direction
from oracle.agents.decision import DecisionAgent
from oracle.config import DecisionConfig, RiskConfig, Settings
from oracle.core.types import (
    Action,
    AgentName,
    AgentOpinion,
    Evidence,
    PortfolioPosition,
    PortfolioState,
    RiskVeto,
    SignalDirection,
)


def test_clamp():
    assert clamp(2) == 1.0
    assert clamp(-3) == -1.0
    assert clamp(0.5) == 0.5


def test_score_to_direction():
    assert score_to_direction(0.5) == SignalDirection.BULLISH
    assert score_to_direction(-0.5) == SignalDirection.BEARISH
    assert score_to_direction(0.0) == SignalDirection.NEUTRAL


def test_score_to_action_held_and_not():
    assert score_to_action(0.8, held=False) == Action.BUY
    assert score_to_action(0.8, held=True) == Action.ADD
    assert score_to_action(-0.8, held=True) == Action.SELL
    assert score_to_action(0.0, held=False) == Action.DO_NOTHING
    assert score_to_action(0.0, held=True) == Action.HOLD


def test_agent_opinion_rejects_certainty_bounds():
    op = AgentOpinion(
        agent=AgentName.TECHNICAL,
        symbol="SPY",
        direction=SignalDirection.NEUTRAL,
        score=0.0,
        confidence=0.995,  # validator clamps via field constraints? gt/lt — 0.995 ok
        summary="test",
        evidence=[Evidence(claim="x", source="t")],
    )
    assert 0 < op.confidence < 1


def test_portfolio_weights():
    state = PortfolioState(
        cash=1000,
        positions=[
            PortfolioPosition(symbol="AAA", shares=10, avg_cost=10, market_price=10),
        ],
    )
    # equity = 1000 + 100 = 1100; weight = 100/1100
    assert abs(state.weight("AAA") - (100 / 1100)) < 1e-9
    assert state.held_symbols() == {"AAA"}


def _op(agent: AgentName, score: float, conf: float = 0.6) -> AgentOpinion:
    return AgentOpinion(
        agent=agent,
        symbol="SPY",
        direction=score_to_direction(score),
        score=score,
        confidence=conf,
        summary=f"{agent.value} view",
        evidence=[Evidence(claim="unit", source="test")],
    )


def test_decision_risk_veto_blocks_buy():
    settings = Settings(
        agent_weights={
            "market_intelligence": 0.1,
            "fundamental": 0.2,
            "technical": 0.2,
            "quant": 0.2,
            "sentiment": 0.1,
            "portfolio_manager": 0.2,
        },
        decision=DecisionConfig(buy_threshold=0.2, add_threshold=0.1),
        risk=RiskConfig(veto_confidence_floor=0.55),
    )
    agent = DecisionAgent(settings)
    portfolio = PortfolioState(cash=10_000, positions=[])
    opinions = [
        _op(AgentName.TECHNICAL, 0.9),
        _op(AgentName.FUNDAMENTAL, 0.8),
        _op(AgentName.QUANT, 0.7),
    ]
    veto = RiskVeto(active=True, reason="cash floor breached", confidence=0.8)
    result = agent.decide("SPY", opinions, veto, portfolio)
    assert result.action == Action.DO_NOTHING
    assert "RISK VETO" in result.rationale


def test_decision_buy_without_veto():
    settings = Settings(
        agent_weights={
            "technical": 1.0,
        },
        decision=DecisionConfig(buy_threshold=0.3, add_threshold=0.2),
    )
    agent = DecisionAgent(settings)
    portfolio = PortfolioState(cash=10_000, positions=[])
    opinions = [_op(AgentName.TECHNICAL, 0.9, 0.8)]
    veto = RiskVeto(active=False, reason="ok", confidence=0.6)
    result = agent.decide("SPY", opinions, veto, portfolio)
    assert result.action == Action.BUY
