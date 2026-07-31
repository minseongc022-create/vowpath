# Project Oracle

Personal multi-agent AI asset management system.

**Mandate:** risk minimization outranks return maximization.  
**Rule:** no gut-feel trades — every conclusion carries evidence + confidence.  
**Rule:** “Do Nothing” is a first-class decision.  
**Rule:** Risk Manager can veto Buy/Add.

This is **not** a chatbot wrapper. It is a modular pipeline of specialist agents that vote, with a hard risk override.

---

## What to build first (read this)

| Priority | Build now | Why |
|----------|-----------|-----|
| **P0** | Core types + Risk + Decision + Portfolio + Technical/Quant | Decision quality without paid APIs |
| **P0** | CLI `oracle run --report` + SQLite audit log | Daily usable loop |
| **P0** | Unit tests + Docker + CI | Solo-dev safety net |
| **P1** | Better fundamentals (SEC/FRED) | Real macro/fundamental depth |
| **P1** | Strategy backtests tied to Decision rules | No live size without evidence |
| **P2** | Sentiment social feeds, dashboard UI, broker exec | High complexity / account risk |

**Do not** start with a fancy dashboard, LLM chat UI, or auto-trading. Those amplify mistakes.

---

## Quick start

```bash
cd oracle
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pip install -e .
cp config/portfolio.example.yaml config/portfolio.yaml
cp .env.example .env

# Mark-to-market portfolio + multi-agent run
oracle status
oracle run --symbols SPY,AAPL,MSFT --report

# Sanity backtest before trusting a rule
oracle backtest --symbol SPY --fast 20 --slow 50
```

Docker:

```bash
cd oracle
docker compose run --rm oracle run --symbols SPY --report
```

---

## Agent map

```
Market Intelligence ─┐
Fundamental ─────────┤
Technical ───────────┼─► Decision Agent ─► Buy|Add|Hold|Reduce|Sell|Do Nothing
Quant ───────────────┤         ▲
Sentiment ───────────┤         │
Portfolio Manager ───┘         │
                               │
                    Risk Manager (veto Buy/Add)
```

| Agent | MVP data | Role |
|-------|----------|------|
| Market Intelligence | Yahoo indices + headlines | Regime / news tilt |
| Fundamental | yfinance info | PE, growth, leverage, FCF |
| Technical | OHLCV | Trend, RSI, MACD, BB, ATR, volume |
| Quant | returns | Vol, beta, MDD, Sharpe, bootstrap VaR |
| Sentiment | headlines lexicon | Optimism/fear flags (social = Phase 2) |
| Portfolio Manager | `portfolio.yaml` | Drift vs targets, cash floor |
| Risk Manager | portfolio + vol/corr | **Hard veto** |
| Decision | all of the above | Single action + rationale |

---

## Layout

```
oracle/
├── ARCHITECTURE.md          # Phased roadmap (detail)
├── config/
│   ├── settings.yaml        # Risk limits, weights, universe
│   └── portfolio.yaml       # Your holdings + targets
├── src/oracle/
│   ├── agents/              # 8 specialists
│   ├── data/                # market / fundamentals / news
│   ├── portfolio/           # load + SQLite decision log
│   ├── backtest/            # SMA sanity engine (expand later)
│   ├── reports/             # daily markdown
│   ├── orchestration/       # pipeline + session labels
│   └── cli.py
├── tests/
├── Dockerfile
└── docker-compose.yml
```

CI workflow: `/.github/workflows/oracle-ci.yml` (path-filtered to `oracle/**`).

---

## Principles encoded in code

1. `AgentOpinion.confidence` is always in `(0, 1)` — never “certain”.
2. `RiskVeto.active` forces Buy/Add → Hold / Do Nothing.
3. Near-zero composite edge → prefer inaction.
4. Every Decision is persisted to SQLite (`data/oracle.db`) for audit.

---

## Disclaimer

Project Oracle is decision-support software for personal research. It does **not** guarantee profits, does **not** execute broker orders in MVP, and must not be treated as regulated investment advice.
