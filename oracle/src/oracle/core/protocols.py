"""Agent protocol — every specialist implements analyze()."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from oracle.core.types import AgentOpinion, PortfolioState


@runtime_checkable
class Agent(Protocol):
    name: str

    def analyze(self, symbol: str, portfolio: PortfolioState) -> AgentOpinion:
        """Produce a data-backed opinion for one symbol."""
        ...
