"""Decision Agent — synthesizes specialist opinions; Risk veto wins."""

from __future__ import annotations

import logging

from oracle.config import Settings, get_settings
from oracle.core.types import (
    Action,
    AgentName,
    AgentOpinion,
    DecisionResult,
    PortfolioState,
    RiskVeto,
)

logger = logging.getLogger("oracle.agents.decision")


class DecisionAgent:
    name = AgentName.DECISION.value

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def decide(
        self,
        symbol: str,
        opinions: list[AgentOpinion],
        risk_veto: RiskVeto,
        portfolio: PortfolioState,
    ) -> DecisionResult:
        weights = self.settings.agent_weights
        held = symbol in portfolio.held_symbols()

        weighted_sum = 0.0
        weight_total = 0.0
        conf_sum = 0.0
        lines: list[str] = []

        for op in opinions:
            if op.agent == AgentName.RISK_MANAGER:
                # Risk opinion informs score lightly; hard control is veto
                w = 0.15
            else:
                w = float(weights.get(op.agent.value, 0.1))
            weighted_sum += op.score * op.confidence * w
            weight_total += op.confidence * w
            conf_sum += op.confidence
            lines.append(
                f"- {op.agent.value}: score={op.score:+.2f}, conf={op.confidence:.2f} — {op.summary}"
            )

        composite = weighted_sum / weight_total if weight_total > 0 else 0.0
        avg_conf = conf_sum / len(opinions) if opinions else 0.35

        action = self._map_action(composite, held)
        rationale_parts = [
            (
                f"Composite score={composite:+.3f} (confidence-weighted). "
                f"Preliminary action={action.value}."
            ),
            "Specialist inputs:",
            *lines,
        ]

        if risk_veto.active and action in risk_veto.blocked_actions:
            prior = action
            action = Action.HOLD if held else Action.DO_NOTHING
            rationale_parts.append(
                f"RISK VETO engaged (conf={risk_veto.confidence:.2f}): {risk_veto.reason}. "
                f"Overrode {prior.value} → {action.value}. Risk Manager outranks all other agents."
            )
            # Decision confidence reflects veto certainty, still < 1
            decision_conf = min(0.9, max(avg_conf, risk_veto.confidence))
        else:
            if risk_veto.active:
                rationale_parts.append(
                    f"Risk notes (no override needed for {action.value}): {risk_veto.reason}"
                )
            else:
                rationale_parts.append(f"Risk check clear: {risk_veto.reason}")
            decision_conf = min(0.88, max(0.2, avg_conf))

        # Explicit principle: inaction is a valid decision near zero edge
        dc = self.settings.decision
        if abs(composite) < 0.12 and action in (Action.HOLD, Action.DO_NOTHING, Action.BUY, Action.ADD):
            if not held:
                action = Action.DO_NOTHING
            elif action in (Action.BUY, Action.ADD):
                action = Action.HOLD
            rationale_parts.append(
                "Edge near zero — preferring inaction over low-conviction risk (risk-first mandate)."
            )

        # Threshold documentation in rationale
        rationale_parts.append(
            f"Thresholds: Buy≥{dc.buy_threshold}, Add≥{dc.add_threshold}, "
            f"Reduce≤{dc.reduce_threshold}, Sell≤{dc.sell_threshold}."
        )
        rationale_parts.append(
            "This is not financial certainty. All figures are estimates conditional on available data."
        )

        return DecisionResult(
            symbol=symbol,
            action=action,
            confidence=decision_conf,
            composite_score=max(-1.0, min(1.0, composite)),
            rationale="\n".join(rationale_parts),
            agent_opinions=opinions,
            risk_veto=risk_veto,
        )

    def _map_action(self, score: float, held: bool) -> Action:
        d = self.settings.decision
        if score >= d.buy_threshold:
            return Action.ADD if held else Action.BUY
        if score >= d.add_threshold:
            return Action.ADD if held else Action.DO_NOTHING
        if score <= d.sell_threshold:
            return Action.SELL if held else Action.DO_NOTHING
        if score <= d.reduce_threshold:
            return Action.REDUCE if held else Action.DO_NOTHING
        if held:
            return Action.HOLD
        return Action.DO_NOTHING
