"""Buffett owner-desk rule engine tests."""

from __future__ import annotations

from types import SimpleNamespace

from oracle.core.types import AgentName
from oracle.data.fundamentals import FundamentalSnapshot
from oracle.investing.buffett import BUFFETT_PRINCIPLES, evaluate_buffett, principles_as_dicts


def test_principles_catalog_nonempty():
    assert len(BUFFETT_PRINCIPLES) >= 8
    rows = principles_as_dicts()
    assert rows[0]["title_ko"]
    assert "원문" not in rows[0]["rule_ko"]


def test_evaluate_rejects_weak_levered_name():
    f = FundamentalSnapshot(
        symbol="WEAK",
        trailing_pe=55.0,
        profit_margins=0.02,
        revenue_growth=0.8,
        free_cashflow=-1e9,
        market_cap=5e9,
        debt_to_equity=250.0,
        return_on_equity=0.04,
        sector="Tech",
    )
    v = evaluate_buffett("WEAK", fundamentals=f, chase=True)
    assert v.buy_ok is False
    assert v.score < 0


def test_evaluate_allows_quality_compounder():
    f = FundamentalSnapshot(
        symbol="QUAL",
        trailing_pe=16.0,
        profit_margins=0.22,
        revenue_growth=0.12,
        free_cashflow=8e9,
        market_cap=1.2e11,
        debt_to_equity=40.0,
        return_on_equity=0.25,
        sector="Consumer",
    )
    v = evaluate_buffett("QUAL", fundamentals=f)
    assert v.buy_ok is True
    assert v.owner_quality >= 0.45
    assert "moat" in v.principles_hit or v.score > 0


def test_buffett_agent_emits_opinion(monkeypatch):
    from oracle.agents.buffett import BuffettOwnerAgent
    from oracle.core.types import PortfolioState

    monkeypatch.setattr(
        "oracle.agents.buffett.evaluate_buffett",
        lambda symbol, **kw: SimpleNamespace(
            score=0.3,
            confidence=0.6,
            owner_quality=0.7,
            margin_of_safety=0.6,
            buy_ok=True,
            summary_ko="ok",
            checks=[],
            principles_hit=["moat"],
            principles_fail=[],
        ),
    )
    op = BuffettOwnerAgent().analyze("AAPL", PortfolioState(cash=10_000, positions=[]))
    assert op.agent == AgentName.BUFFETT
    assert op.score == 0.3
