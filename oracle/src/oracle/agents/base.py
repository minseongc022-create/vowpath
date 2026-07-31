"""Shared helpers for specialist agents."""

from __future__ import annotations

from oracle.core.types import Action, AgentOpinion, Evidence, SignalDirection


def score_to_direction(score: float, deadband: float = 0.15) -> SignalDirection:
    if score > deadband:
        return SignalDirection.BULLISH
    if score < -deadband:
        return SignalDirection.BEARISH
    return SignalDirection.NEUTRAL


def score_to_action(score: float, held: bool) -> Action:
    if score >= 0.55:
        return Action.ADD if held else Action.BUY
    if score >= 0.25:
        return Action.HOLD if held else Action.DO_NOTHING
    if score <= -0.55:
        return Action.SELL if held else Action.DO_NOTHING
    if score <= -0.25:
        return Action.REDUCE if held else Action.DO_NOTHING
    return Action.HOLD if held else Action.DO_NOTHING


def clamp(x: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def conf_from_agreement(parts: list[float], base: float = 0.45) -> float:
    """More consistent signed evidence → higher confidence (never certainty)."""
    if not parts:
        return 0.35
    mean = sum(parts) / len(parts)
    var = sum((p - mean) ** 2 for p in parts) / len(parts)
    # lower variance → higher confidence
    conf = base + 0.35 * (1.0 / (1.0 + 5.0 * var)) + 0.1 * min(abs(mean), 1.0)
    return clamp(conf, 0.05, 0.92)


def opinion(
    agent,
    symbol: str,
    score: float,
    confidence: float,
    summary: str,
    evidence: list[Evidence],
    held: bool,
    metadata: dict | None = None,
) -> AgentOpinion:
    score = clamp(score)
    confidence = clamp(confidence, 0.01, 0.99)
    return AgentOpinion(
        agent=agent,
        symbol=symbol,
        direction=score_to_direction(score),
        score=score,
        confidence=confidence,
        summary=summary,
        evidence=evidence,
        suggested_action=score_to_action(score, held),
        metadata=metadata or {},
    )
