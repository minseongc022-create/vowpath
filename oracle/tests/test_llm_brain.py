"""LLM brain unit tests (mocked + live probe)."""

from __future__ import annotations

from oracle.core.types import (
    Action,
    AgentName,
    AgentOpinion,
    DecisionResult,
    RiskVeto,
    SignalDirection,
)
from oracle.llm import brain_health
from oracle.llm.brain import synthesize_portfolio
from oracle.llm.client import LLMResponse


def _draft(symbol: str = "SPY", veto: bool = True) -> DecisionResult:
    return DecisionResult(
        symbol=symbol,
        action=Action.DO_NOTHING,
        confidence=0.55,
        composite_score=0.12,
        rationale="quant draft",
        agent_opinions=[
            AgentOpinion(
                agent=AgentName.TECHNICAL,
                symbol=symbol,
                direction=SignalDirection.BULLISH,
                score=0.2,
                confidence=0.6,
                summary="mild uptrend",
                evidence=[],
            )
        ],
        risk_veto=RiskVeto(
            active=veto,
            reason="test veto",
            confidence=0.7,
            blocked_actions=[Action.BUY, Action.ADD],
        ),
    )


def test_brain_health_shape():
    h = brain_health()
    assert "available" in h
    assert "provider" in h
    assert "model" in h
    assert h.get("intel_level", 0) >= 9


def test_synthesize_respects_risk_veto(monkeypatch):
    from oracle.llm import brain as brain_mod

    class ST:
        available = True
        provider = "mock"
        model = "mock"
        mode_ko = "mock"
        detail = "ok"

    def fake_chat(*args, **kwargs):
        return LLMResponse(
            text=(
                '{"decisions":[{"symbol":"SPY","action":"Buy","confidence":0.9,'
                '"score_adj":0.2,"rationale_ko":"사세요"}],"desk_note_ko":"테스트"}'
            ),
            provider="mock",
            model="mock",
            latency_ms=1,
            ok=True,
        )

    monkeypatch.setattr(brain_mod, "probe_status", lambda: ST())
    monkeypatch.setattr(brain_mod, "chat", fake_chat)

    out, meta = synthesize_portfolio([_draft("SPY", veto=True)], held_symbols=set())
    assert meta["used"] is True
    assert out[0].action != Action.BUY
    assert out[0].action != Action.ADD
