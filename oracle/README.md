# Project Oracle

Personal multi-agent AI asset management system (risk-first).

**Not a chatbot.** Eight specialist agents collaborate; Risk Manager can veto Buy/Add; every conclusion carries evidence + confidence.

Version **1.0.0** — full operator stack: research → decide → size → paper-execute → dashboard → 24h schedule.

---

## Quick start

```bash
cd oracle
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt && pip install -e .
cp config/portfolio.example.yaml config/portfolio.yaml
cp .env.example .env

oracle status
oracle run --symbols SPY,AAPL,MSFT --report
oracle backtest --strategy oracle_lite --symbol SPY
oracle serve --port 8080          # dashboard http://localhost:8080
```

Docker (pipeline + dashboard + 24h scheduler):

```bash
cd oracle
docker compose up --build dashboard scheduler
```

---

## Commands

| Command | Purpose |
|---------|---------|
| `oracle run --report` | Multi-agent pipeline + optional markdown report |
| `oracle report --notify` | Report + Telegram/email if configured |
| `oracle backtest --strategy oracle_lite` | CAGR / Sharpe / MDD / win rate / Calmar |
| `oracle backtest --portfolio` | Multi-asset oracle_lite book |
| `oracle size --symbol AAPL` | Vol-target share delta |
| `oracle execute --confirm` | Paper fill (human confirm required) |
| `oracle journal` | Trade journal |
| `oracle schedule --poll 3600` | 24h pre/open/post sessions |
| `oracle serve` | Operator dashboard |

---

## Architecture (what is built)

```
Data (yfinance parquet cache, macro, FRED*, news, Stocktwits, Reddit*, calendar, SEC hints)
   → 8 Agents → Risk veto → Decision
   → Sizing → Paper execution (live gated)
   → SQLite audit + journal + daily report + notify
   → FastAPI/HTMX dashboard
   → schedule daemon
```

\* Optional API keys in `.env`.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for principles and extension points.

---

## Mandate encoded in code

1. Confidence always ∈ (0, 1) — never “certain”
2. Risk veto blocks Buy/Add
3. Near-zero edge → Do Nothing / Hold
4. Kill switch + max daily loss halt new risk
5. Live broker orders disabled until explicitly enabled **and** adapter configured

---

## Disclaimer

Decision-support for personal research. Not regulated advice. Paper trading is default. Past backtests do not imply future results.
