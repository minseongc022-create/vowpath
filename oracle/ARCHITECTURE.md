# Project Oracle — Architecture

Risk-first personal AI hedge fund OS. **v1.1.0**

## Capability matrix

| Layer | Status |
|-------|--------|
| 8 agents + Risk veto + Decision | Done |
| Parquet cache (`cache_hours`) | Done |
| Macro / FRED optional | Done |
| SEC EDGAR submissions | Done |
| Stocktwits + Reddit optional | Done |
| Walk-forward OOS + buy&hold excess | Done |
| Vol sizing + journal + confirm | Done |
| Local paper + Alpaca adapter | Done |
| Kill switch + day PnL estimate | Done |
| Dashboard + auth + approve/backtest | Done |
| 24h scheduler + notify | Done |
| Live trading | Gated (`ORACLE_LIVE_TRADING=1`) |

## Execution modes

1. **paper** (default) — mutates `portfolio.yaml`, costs applied  
2. **alpaca_paper** — when Alpaca keys set and paper base URL  
3. **alpaca_live** — only if `ORACLE_LIVE_TRADING=1` and non-paper URL  

Human confirm is required unless `--confirm` / dashboard Approve.

## Operator loop

```
oracle run --report
oracle backtest --strategy walk_forward --symbol <TICKER>
oracle execute                 # plans fills
oracle serve                   # approve / reject / kill
oracle schedule --poll 3600    # 24h
```

## Safety

- Risk veto blocks Buy/Add  
- Kill switch (manual + max daily loss)  
- Confidence coverage penalty  
- Idempotent `client_order_id` in journal  
- Oversell / cash guards on paper fills  
