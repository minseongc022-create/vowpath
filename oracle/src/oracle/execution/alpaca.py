"""Alpaca Markets adapter (paper by default).

Requires:
  ALPACA_API_KEY
  ALPACA_SECRET_KEY
Optional:
  ALPACA_BASE_URL=https://paper-api.alpaca.markets
"""

from __future__ import annotations

import logging
import os
import uuid
from typing import Any

import httpx

from oracle.execution.broker import BrokerAccount, BrokerFill, BrokerOrder

logger = logging.getLogger("oracle.execution.alpaca")


class AlpacaBroker:
    name = "alpaca"

    def __init__(
        self,
        api_key: str | None = None,
        secret_key: str | None = None,
        base_url: str | None = None,
    ) -> None:
        self.api_key = (api_key or os.getenv("ALPACA_API_KEY", "")).strip()
        self.secret_key = (secret_key or os.getenv("ALPACA_SECRET_KEY", "")).strip()
        self.base_url = (
            base_url
            or os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets")
        ).rstrip("/")
        if not self.api_key or not self.secret_key:
            raise ValueError("Alpaca credentials missing (ALPACA_API_KEY / ALPACA_SECRET_KEY)")

    def _headers(self) -> dict[str, str]:
        return {
            "APCA-API-KEY-ID": self.api_key,
            "APCA-API-SECRET-KEY": self.secret_key,
            "Content-Type": "application/json",
        }

    def _get(self, path: str) -> Any:
        with httpx.Client(timeout=30.0) as client:
            r = client.get(f"{self.base_url}{path}", headers=self._headers())
            r.raise_for_status()
            return r.json()

    def _post(self, path: str, payload: dict) -> Any:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(f"{self.base_url}{path}", headers=self._headers(), json=payload)
            r.raise_for_status()
            return r.json()

    def _delete(self, path: str) -> None:
        with httpx.Client(timeout=30.0) as client:
            r = client.delete(f"{self.base_url}{path}", headers=self._headers())
            r.raise_for_status()

    def get_account(self) -> BrokerAccount:
        acct = self._get("/v2/account")
        positions_raw = self._get("/v2/positions")
        positions = {p["symbol"]: float(p["qty"]) for p in positions_raw}
        equity = float(acct.get("equity") or 0)
        last_equity = float(acct.get("last_equity") or equity or 1)
        day_pnl_pct = (equity / last_equity - 1.0) if last_equity else 0.0
        return BrokerAccount(
            equity=equity,
            cash=float(acct.get("cash") or 0),
            buying_power=float(acct.get("buying_power") or 0),
            day_pnl_pct=day_pnl_pct,
            positions=positions,
        )

    def submit_market_order(self, order: BrokerOrder) -> BrokerFill:
        qty = abs(float(order.qty))
        if qty < 1e-9:
            raise ValueError("Order qty is zero")
        side = "buy" if order.qty > 0 else "sell"
        client_id = order.client_order_id or f"oracle-{uuid.uuid4().hex[:16]}"
        payload = {
            "symbol": order.symbol.upper(),
            "qty": str(qty),
            "side": side,
            "type": "market",
            "time_in_force": "day",
            "client_order_id": client_id,
        }
        data = self._post("/v2/orders", payload)
        filled_qty = float(data.get("filled_qty") or qty)
        filled_avg = float(data.get("filled_avg_price") or 0)
        # If not filled yet, poll once lightly is out of scope — return submitted state
        return BrokerFill(
            symbol=order.symbol.upper(),
            qty=filled_qty if side == "buy" else -filled_qty,
            price=filled_avg,
            order_id=str(data.get("id") or client_id),
            status=str(data.get("status") or "submitted"),
            raw=data,
        )

    def cancel_all(self) -> None:
        self._delete("/v2/orders")


def alpaca_configured() -> bool:
    return bool(os.getenv("ALPACA_API_KEY", "").strip() and os.getenv("ALPACA_SECRET_KEY", "").strip())
