"""Quant Agent — volatility, beta, drawdown, factor-ish stats, Monte Carlo sketch."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from oracle.agents.base import conf_from_agreement, opinion
from oracle.config import get_settings
from oracle.core.exceptions import DataUnavailableError
from oracle.core.types import AgentName, Evidence, PortfolioState
from oracle.data.market import annualized_volatility, cached_history, max_drawdown

logger = logging.getLogger("oracle.agents.quant")


def _monte_carlo_var(
    returns: pd.Series, horizon_days: int = 21, sims: int = 2000, alpha: float = 0.05
) -> float:
    """Historical-bootstrap VaR over horizon (fractional loss, positive = loss)."""
    r = returns.dropna().values
    if len(r) < 40:
        return 0.0
    rng = np.random.default_rng(42)
    draws = rng.choice(r, size=(sims, horizon_days), replace=True)
    terminal = np.prod(1.0 + draws, axis=1) - 1.0
    var = float(-np.quantile(terminal, alpha))
    return max(0.0, var)


class QuantAgent:
    name = AgentName.QUANT.value

    def analyze(self, symbol: str, portfolio: PortfolioState):
        held = symbol in portfolio.held_symbols()
        settings = get_settings()
        evidence: list[Evidence] = []
        parts: list[float] = []

        try:
            df = cached_history(symbol, days=settings.history_days)
            bench = cached_history(settings.benchmark, days=settings.history_days)
        except DataUnavailableError as exc:
            return opinion(
                AgentName.QUANT,
                symbol,
                0.0,
                0.2,
                str(exc),
                [Evidence(claim="Quant inputs missing", source="yfinance", metric="availability", value=0)],
                held,
            )

        rets = df["close"].pct_change().dropna()
        b_rets = bench["close"].pct_change().dropna()
        joined = pd.concat([rets, b_rets], axis=1, join="inner").dropna()
        joined.columns = ["asset", "bench"]

        vol = annualized_volatility(rets)
        mdd = abs(max_drawdown(df["close"]))
        evidence.append(
            Evidence(claim=f"Ann. volatility {vol:.1%}", metric="ann_vol", value=vol, source="oracle.quant")
        )
        evidence.append(
            Evidence(claim=f"Max drawdown {mdd:.1%}", metric="mdd", value=mdd, source="oracle.quant")
        )

        if vol < 0.15:
            parts.append(0.2)
        elif vol < 0.30:
            parts.append(0.05)
        elif vol < 0.50:
            parts.append(-0.25)
        else:
            parts.append(-0.55)

        if mdd > 0.35:
            parts.append(-0.45)
        elif mdd > 0.20:
            parts.append(-0.2)
        else:
            parts.append(0.15)

        beta = None
        if len(joined) >= 60:
            cov = np.cov(joined["asset"], joined["bench"])[0, 1]
            var_b = np.var(joined["bench"])
            beta = float(cov / var_b) if var_b > 0 else 1.0
            if beta > 1.4:
                parts.append(-0.35)
            elif beta < 0.6:
                parts.append(0.1)
            else:
                parts.append(0.05)
            evidence.append(
                Evidence(
                    claim=f"Beta vs {settings.benchmark}={beta:.2f}",
                    metric="beta",
                    value=beta,
                    source="oracle.quant",
                )
            )

        if len(df) >= 130:
            mom = float(df["close"].iloc[-21] / df["close"].iloc[-126] - 1.0)
            parts.append(max(-1.0, min(1.0, mom * 2.0)))
            evidence.append(
                Evidence(
                    claim=f"Approx 6m momentum ex-1m={mom:.1%}",
                    metric="momentum_6m",
                    value=mom,
                    source="oracle.quant",
                )
            )

        var95 = _monte_carlo_var(rets)
        evidence.append(
            Evidence(
                claim=f"Bootstrap 21d 95% VaR ≈ {var95:.1%}",
                metric="mc_var_95_21d",
                value=var95,
                source="oracle.quant.monte_carlo",
            )
        )
        if var95 > 0.15:
            parts.append(-0.4)
        elif var95 > 0.08:
            parts.append(-0.15)
        else:
            parts.append(0.1)

        if rets.std() > 0:
            sharpe = float(rets.mean() / rets.std() * np.sqrt(252))
            parts.append(max(-1.0, min(1.0, sharpe / 2.0)))
            evidence.append(
                Evidence(
                    claim=f"Trailing Sharpe≈{sharpe:.2f}",
                    metric="sharpe",
                    value=sharpe,
                    source="oracle.quant",
                )
            )

        score = sum(parts) / len(parts) if parts else 0.0
        conf = conf_from_agreement(parts, base=0.45)
        summary = (
            f"Quant risk/return profile for {symbol}: vol={vol:.1%}, MDD={mdd:.1%}, "
            f"VaR95_21d≈{var95:.1%}. Simulations are illustrative, not forecasts."
        )
        return opinion(
            AgentName.QUANT,
            symbol,
            score,
            conf,
            summary,
            evidence,
            held,
            metadata={"ann_vol": vol, "mdd": mdd, "var95_21d": var95, "beta": beta},
        )
