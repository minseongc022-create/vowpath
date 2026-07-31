# Project Oracle — Architecture

Risk-first personal AI hedge fund OS. Solo-developer friendly: one process, YAML + SQLite, optional APIs.

## Status: v1.0.0 — full operator stack shipped

| Layer | Status |
|-------|--------|
| 8 agents + Risk veto + Decision | Done |
| Parquet OHLCV cache | Done |
| Macro / rates / FX / commodities proxies | Done |
| FRED (optional key) | Done |
| Event calendar YAML | Done |
| SEC filing hints + EDGAR links | Done |
| Sentiment: news + Stocktwits + Reddit optional | Done |
| Backtest: SMA, oracle_lite, portfolio + full metrics | Done |
| Vol-target sizing | Done |
| Paper journal + confirm execution + kill switch | Done |
| Daily report + Telegram/email notify | Done |
| FastAPI/HTMX dashboard | Done |
| 24h scheduler daemon | Done |
| Docker Compose (run / dashboard / scheduler) | Done |
| Live broker adapter | Stub only (gated) |

## Non-negotiables

| Principle | Implementation |
|-----------|----------------|
| Data > intuition | `Evidence[]` + score + confidence |
| No certainty | confidence ∈ (0, 1) |
| Risk > return | `RiskManager.veto()` + kill switch |
| Inaction valid | `Do Nothing` / `Hold` |
| Auditability | `oracle.db` + `journal.db` + markdown reports |
| Backtest gate | `oracle backtest` before size/execute |

## Layout

```
oracle/
├── config/           settings, portfolio, calendar
├── src/oracle/
│   ├── agents/       8 specialists
│   ├── data/         market cache, macro, news, social, sec, calendar
│   ├── portfolio/    store, sizing, journal
│   ├── execution/    paper fill + kill switch
│   ├── backtest/     metrics + strategies
│   ├── reports/      daily markdown
│   ├── notify/       telegram / email
│   ├── dashboard/    FastAPI UI
│   └── orchestration pipeline + 24h scheduler
└── tests/
```

## What to do next (operator, not more scaffolding)

1. Replace placeholder dates in `config/calendar.yaml` with real FOMC/CPI/earnings.
2. Add `FRED_API_KEY` for official macro series.
3. Run `oracle backtest --strategy oracle_lite` on every symbol you might size.
4. Use `oracle execute` only in paper mode until a real broker adapter is written.
5. Keep `ORACLE_LIVE_TRADING=0` until you accept operational risk.

## Live trading (intentionally incomplete)

`ExecutionEngine` refuses live orders unless `ORACLE_LIVE_TRADING=1` **and** a broker SDK is integrated. That is the correct default for capital preservation.
