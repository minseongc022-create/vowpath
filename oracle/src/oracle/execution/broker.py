"""Broker protocol — paper YAML vs Alpaca paper/live."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass
class BrokerOrder:
    symbol: str
    qty: float  # signed: +buy / -sell
    side: str  # buy | sell
    order_type: str = "market"
    client_order_id: str | None = None


@dataclass
class BrokerFill:
    symbol: str
    qty: float
    price: float
    order_id: str
    status: str
    raw: dict | None = None


@dataclass
class BrokerAccount:
    equity: float
    cash: float
    buying_power: float
    day_pnl_pct: float
    positions: dict[str, float]  # symbol -> qty
    status: str | None = None


@runtime_checkable
class Broker(Protocol):
    name: str

    def get_account(self) -> BrokerAccount: ...

    def submit_market_order(self, order: BrokerOrder) -> BrokerFill: ...

    def cancel_all(self) -> None: ...
