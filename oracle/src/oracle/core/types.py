"""Shared domain types. Agents speak this language — nothing else."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class Action(StrEnum):
    """Final decision actions. Exactly one must be chosen."""

    BUY = "Buy"
    ADD = "Add"
    HOLD = "Hold"
    REDUCE = "Reduce"
    SELL = "Sell"
    DO_NOTHING = "Do Nothing"


class SignalDirection(StrEnum):
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


class AgentName(StrEnum):
    MARKET_INTELLIGENCE = "market_intelligence"
    FUNDAMENTAL = "fundamental"
    TECHNICAL = "technical"
    QUANT = "quant"
    SENTIMENT = "sentiment"
    PORTFOLIO_MANAGER = "portfolio_manager"
    RISK_MANAGER = "risk_manager"
    DECISION = "decision"


class Evidence(BaseModel):
    """A single data-backed claim supporting an opinion."""

    claim: str
    metric: str | None = None
    value: float | str | None = None
    source: str
    as_of: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AgentOpinion(BaseModel):
    """Structured output every specialist agent must produce.

    Rules:
    - Never claim certainty. confidence is always in (0, 1).
    - score in [-1, 1]: negative = bearish / reduce, positive = bullish / add.
    - evidence must not be empty for actionable (non-neutral) opinions.
    """

    agent: AgentName
    symbol: str
    direction: SignalDirection
    score: float = Field(ge=-1.0, le=1.0)
    confidence: float = Field(gt=0.0, lt=1.0)
    summary: str
    evidence: list[Evidence] = Field(default_factory=list)
    suggested_action: Action | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @field_validator("confidence")
    @classmethod
    def no_certainty(cls, v: float) -> float:
        # Soft clamp away from absolute certainty language in scores
        return min(max(v, 0.01), 0.99)


class RiskVeto(BaseModel):
    """Risk Manager override. When active, Decision Agent cannot Buy/Add."""

    active: bool
    reason: str
    confidence: float = Field(gt=0.0, lt=1.0)
    blocked_actions: list[Action] = Field(
        default_factory=lambda: [Action.BUY, Action.ADD]
    )
    metrics: dict[str, float] = Field(default_factory=dict)


class DecisionResult(BaseModel):
    """Final output of the Decision Agent for one symbol."""

    symbol: str
    action: Action
    confidence: float = Field(gt=0.0, lt=1.0)
    composite_score: float = Field(ge=-1.0, le=1.0)
    rationale: str
    agent_opinions: list[AgentOpinion]
    risk_veto: RiskVeto | None = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class MarketSnapshot(BaseModel):
    symbol: str
    price: float
    previous_close: float | None = None
    change_pct: float | None = None
    volume: float | None = None
    as_of: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PortfolioPosition(BaseModel):
    symbol: str
    shares: float
    avg_cost: float
    market_price: float | None = None

    @property
    def market_value(self) -> float | None:
        if self.market_price is None:
            return None
        return self.shares * self.market_price

    @property
    def unrealized_pnl_pct(self) -> float | None:
        if self.market_price is None or self.avg_cost == 0:
            return None
        return (self.market_price - self.avg_cost) / self.avg_cost


class PortfolioState(BaseModel):
    cash: float
    currency: str = "USD"
    positions: list[PortfolioPosition] = Field(default_factory=list)
    targets: dict[str, float] = Field(default_factory=dict)

    def equity(self) -> float:
        invested = sum((p.market_value or 0.0) for p in self.positions)
        return self.cash + invested

    def weight(self, symbol: str) -> float:
        eq = self.equity()
        if eq <= 0:
            return 0.0
        for p in self.positions:
            if p.symbol == symbol and p.market_value is not None:
                return p.market_value / eq
        return 0.0

    def held_symbols(self) -> set[str]:
        return {p.symbol for p in self.positions if p.shares > 0}


class PipelineResult(BaseModel):
    """One full multi-agent run across the universe."""

    run_id: str
    session: str  # pre_market | market_open | post_market | ad_hoc
    decisions: list[DecisionResult]
    market_summary: str
    portfolio_equity: float
    portfolio_risk_score: float = Field(ge=0.0, le=1.0)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
