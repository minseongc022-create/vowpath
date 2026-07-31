"""Alpaca Markets adapter (paper by default, live when armed).

Requires:
  ALPACA_API_KEY
  ALPACA_SECRET_KEY
Optional:
  ALPACA_BASE_URL=https://paper-api.alpaca.markets
  ALPACA_BASE_URL=https://api.alpaca.markets   # live
"""

from __future__ import annotations

import logging
import os
import time
import uuid
from typing import Any

import httpx

from oracle.execution.broker import BrokerAccount, BrokerFill, BrokerOrder

logger = logging.getLogger("oracle.execution.alpaca")

PAPER_URL = "https://paper-api.alpaca.markets"
LIVE_URL = "https://api.alpaca.markets"


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
            or os.getenv("ALPACA_BASE_URL", PAPER_URL)
        ).rstrip("/")
        if not self.api_key or not self.secret_key:
            raise ValueError("Alpaca credentials missing (ALPACA_API_KEY / ALPACA_SECRET_KEY)")

    @property
    def is_paper(self) -> bool:
        return "paper" in self.base_url

    def _headers(self) -> dict[str, str]:
        return {
            "APCA-API-KEY-ID": self.api_key,
            "APCA-API-SECRET-KEY": self.secret_key,
            "Content-Type": "application/json",
        }

    def _get(self, path: str) -> Any:
        with httpx.Client(timeout=30.0, trust_env=False) as client:
            r = client.get(f"{self.base_url}{path}", headers=self._headers())
            r.raise_for_status()
            return r.json()

    def _post(self, path: str, payload: dict) -> Any:
        with httpx.Client(timeout=30.0, trust_env=False) as client:
            r = client.post(f"{self.base_url}{path}", headers=self._headers(), json=payload)
            if r.status_code >= 400:
                detail = r.text[:400]
                raise RuntimeError(f"Alpaca {r.status_code}: {detail}")
            return r.json()

    def _delete(self, path: str) -> None:
        with httpx.Client(timeout=30.0, trust_env=False) as client:
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

    def get_positions_detailed(self) -> list[dict[str, Any]]:
        rows = self._get("/v2/positions")
        out = []
        for p in rows:
            out.append(
                {
                    "symbol": p["symbol"],
                    "qty": float(p.get("qty") or 0),
                    "avg_cost": float(p.get("avg_entry_price") or 0),
                    "current_price": float(p.get("current_price") or 0),
                    "market_value": float(p.get("market_value") or 0),
                }
            )
        return out

    def submit_market_order(self, order: BrokerOrder) -> BrokerFill:
        qty = abs(float(order.qty))
        if qty < 1e-9:
            raise ValueError("Order qty is zero")
        side = "buy" if order.qty > 0 else "sell"
        client_id = order.client_order_id or f"oracle-{uuid.uuid4().hex[:16]}"

        # Fractional shares supported on Alpaca for many US equities
        payload: dict[str, Any] = {
            "symbol": order.symbol.upper(),
            "qty": f"{qty:.6f}".rstrip("0").rstrip("."),
            "side": side,
            "type": "market",
            "time_in_force": "day",
            "client_order_id": client_id,
        }
        data = self._post("/v2/orders", payload)
        order_id = str(data.get("id") or client_id)
        data = self._wait_fill(order_id, data)
        filled_qty = float(data.get("filled_qty") or 0) or qty
        filled_avg = float(data.get("filled_avg_price") or 0)
        return BrokerFill(
            symbol=order.symbol.upper(),
            qty=filled_qty if side == "buy" else -filled_qty,
            price=filled_avg,
            order_id=order_id,
            status=str(data.get("status") or "submitted"),
            raw=data,
        )

    def submit_notional_market_buy(self, symbol: str, notional_usd: float, client_order_id: str | None = None) -> BrokerFill:
        """Buy by dollar amount (fractional) — ideal for small first live trades."""
        notional_usd = abs(float(notional_usd))
        if notional_usd < 1:
            raise ValueError("Notional too small")
        client_id = client_order_id or f"oracle-n-{uuid.uuid4().hex[:12]}"
        payload = {
            "symbol": symbol.upper(),
            "notional": f"{notional_usd:.2f}",
            "side": "buy",
            "type": "market",
            "time_in_force": "day",
            "client_order_id": client_id,
        }
        data = self._post("/v2/orders", payload)
        order_id = str(data.get("id") or client_id)
        data = self._wait_fill(order_id, data)
        filled_qty = float(data.get("filled_qty") or 0)
        filled_avg = float(data.get("filled_avg_price") or 0)
        return BrokerFill(
            symbol=symbol.upper(),
            qty=filled_qty,
            price=filled_avg,
            order_id=order_id,
            status=str(data.get("status") or "submitted"),
            raw=data,
        )

    def _wait_fill(self, order_id: str, data: dict, timeout_s: float = 12.0) -> dict:
        deadline = time.time() + timeout_s
        status = str(data.get("status") or "")
        while status in {"new", "accepted", "pending_new", "partially_filled"} and time.time() < deadline:
            time.sleep(0.6)
            data = self._get(f"/v2/orders/{order_id}")
            status = str(data.get("status") or "")
        return data

    def cancel_all(self) -> None:
        self._delete("/v2/orders")


def alpaca_configured() -> bool:
    return bool(os.getenv("ALPACA_API_KEY", "").strip() and os.getenv("ALPACA_SECRET_KEY", "").strip())
