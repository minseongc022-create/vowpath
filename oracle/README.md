# Project Oracle

Personal multi-agent AI asset management system (risk-first). **v1.1.0**

Not a chatbot. Eight specialist agents collaborate; Risk Manager can veto Buy/Add; every conclusion carries evidence + confidence.

---

## Quick start

```bash
cd oracle
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt && pip install -e .
cp config/portfolio.example.yaml config/portfolio.yaml
cp .env.example .env

oracle run --symbols SPY,AAPL --report
oracle backtest --strategy walk_forward --symbol SPY
oracle serve --port 8080
```

Optional Alpaca paper:

```bash
# .env
ALPACA_API_KEY=...
ALPACA_SECRET_KEY=...
ALPACA_BASE_URL=https://paper-api.alpaca.markets
ORACLE_BROKER=auto
```

---

## Commands

| Command | Purpose |
|---------|---------|
| `oracle run --report` | Multi-agent pipeline |
| `oracle backtest --strategy walk_forward` | OOS walk-forward vs buy&hold |
| `oracle backtest --strategy oracle_lite` | Full metrics backtest |
| `oracle size --symbol AAPL` | Vol-target sizing |
| `oracle execute` | Queue planned fills (confirm required) |
| `oracle approve --id N` | Approve planned journal fill |
| `oracle kill` / `oracle kill --off` | Kill switch |
| `oracle serve` | Dashboard (approve / backtest / kill) |
| `oracle schedule` | 24h pre/open/post daemon |

---

## v1.1 upgrades

- Alpaca paper/live broker adapter (gated)
- Walk-forward OOS backtests + saved reports
- Dashboard: trade approve/reject, kill switch, backtest sparkline
- Optional dashboard basic auth
- Real SEC EDGAR submissions adapter
- Coverage-adjusted agent confidence
- Paper fill hardening (oversell/cash/costs/idempotency)
- Day PnL estimate for kill switch

Live trading still requires explicit `ORACLE_LIVE_TRADING=1`.

See [ARCHITECTURE.md](./ARCHITECTURE.md).
