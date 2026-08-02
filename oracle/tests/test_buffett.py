"""Buffett owner-desk rule engine tests."""

from __future__ import annotations

from types import SimpleNamespace

from oracle.core.types import AgentName
from oracle.data.fundamentals import FundamentalSnapshot
from oracle.investing.buffett import BUFFETT_PRINCIPLES, evaluate_buffett, principles_as_dicts


def test_principles_catalog_nonempty():
    assert len(BUFFETT_PRINCIPLES) >= 16
    rows = principles_as_dicts()
    assert rows[0]["title_ko"]
    ids = {p["id"] for p in rows}
    assert {"cash_machine", "opportunity_cost", "avoid_speculation"} <= ids


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


def test_market_fear_boosts_quality_buy():
    f = FundamentalSnapshot(
        symbol="QUAL",
        trailing_pe=22.0,
        profit_margins=0.18,
        operating_margins=0.16,
        revenue_growth=0.10,
        free_cashflow=5e9,
        market_cap=1e11,
        debt_to_equity=50.0,
        return_on_equity=0.20,
        current_ratio=1.8,
        sector="Consumer",
    )
    calm = evaluate_buffett("QUAL", fundamentals=f)
    fear = evaluate_buffett("QUAL", fundamentals=f, market_fear=True)
    assert fear.buy_ok is True
    assert fear.score >= calm.score - 0.05
    assert fear.size_hint >= calm.size_hint


def test_review_holdings_prunes_junk(monkeypatch):
    from oracle.core.types import PortfolioPosition, PortfolioState
    from oracle.investing import buffett as bb

    weak = FundamentalSnapshot(
        symbol="JUNK",
        trailing_pe=60.0,
        profit_margins=0.01,
        free_cashflow=-1e8,
        market_cap=2e9,
        debt_to_equity=300.0,
        return_on_equity=0.02,
    )
    monkeypatch.setattr(bb, "fetch_fundamentals", lambda s: weak)
    port = PortfolioState(
        cash=1000,
        positions=[
            PortfolioPosition(symbol="JUNK", shares=10, avg_cost=20, market_price=16)
        ],
    )
    prune, protect = bb.review_holdings(port)
    assert prune and prune[0].symbol == "JUNK"
    assert "JUNK" not in protect
