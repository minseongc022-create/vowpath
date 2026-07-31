# Project Oracle — Architecture & Roadmap

Solo-developer design: **maximum decision quality per hour of engineering**.  
World-class *structure* first; features land in phases.

---

## 0. Non-negotiables

| Principle | Implementation |
|-----------|------------------|
| Data > intuition | Agents emit `Evidence[]` + `score` + `confidence` |
| No certainty language | Confidence ∈ (0, 1); reports say “estimate / probabilistic” |
| Risk > return | `RiskManager.veto()` outranks weighted votes |
| Inaction is valid | `Action.DO_NOTHING` / `HOLD` when edge ≈ 0 |
| Auditability | SQLite decision log + markdown daily report |
| Testability | Pure decision/risk unit tests without network |

---

## 1. Target architecture

```
                    ┌──────────────────┐
                    │  Data adapters   │  yfinance → FRED/SEC/NewsAPI/broker
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   Specialist agents    Portfolio store     Backtest eng.
         │                   │                   │
         └─────────┬─────────┘                   │
                   ▼                             │
            Risk Manager ────────────────────────┤
                   │                             │
                   ▼                             │
            Decision Agent ◄── validation via backtest
                   │
                   ▼
         Report / CLI / (P2 dashboard) / (P3 execution)
```

**Storage (solo-friendly):**

| Need | Choice | Why |
|------|--------|-----|
| Config | YAML + `.env` | Editable, no infra |
| Portfolio | YAML (MVP) | Git-friendly paper book |
| Decision audit | SQLite | Zero ops, queryable |
| Reports | Markdown files | Readable on phone |
| Later prices | Parquet under `data/` | Fast local research |

Avoid Postgres/Kafka/microservices until a single process hurts.

---

## 2. Libraries (MVP → later)

| Lib | Phase | Use |
|-----|-------|-----|
| `pandas` / `numpy` | MVP | Series math |
| `yfinance` | MVP | Prices, basic fundamentals, news |
| `pydantic` | MVP | Contracts |
| `pyyaml` / `python-dotenv` | MVP | Config |
| `rich` | MVP | CLI |
| `pytest` / `ruff` | MVP | Quality |
| `ta` | MVP (optional) | Extra indicators |
| `httpx` | MVP | Future HTTP APIs |
| `fredapi` / EDGAR | P1 | Macro + filings |
| `vectorbt` or custom | P1 | Serious backtests |
| FastAPI + simple HTML/HTMX | P2 | Dashboard |
| Broker SDK (IBKR etc.) | P3 | Execution (human approve first) |

**Not in MVP:** LangChain agent swarms, Redis, multi-container service mesh, mobile apps.

---

## 3. APIs (when to add)

| API | Cost/complexity | Add when |
|-----|-----------------|----------|
| Yahoo via yfinance | Free | Now |
| FRED | Free key | Need rates/CPI/unemployment properly |
| SEC EDGAR | Free | Fundamental depth / 8-K risk events |
| NewsAPI / GDELT | Free tier | Broader geopolitics |
| Reddit / X | Auth + noise | After lexicon baseline proves useful |
| Polygon/Alpaca | Paid | Need reliable intraday |
| LLM (optional) | Paid | **Summarize evidence only** — never invent prices |

LLMs are *writers*, not oracles. Numeric scores stay rule/quant based.

---

## 4. Phased delivery

### Phase 0 — Skeleton (done in this MVP)

**Delivered**

- Modular package under `oracle/`
- 8 agent interfaces with real Technical / Quant / Fundamental / Risk / Decision logic
- Portfolio YAML + mark-to-market
- Pipeline orchestration + SQLite log
- Daily markdown report
- SMA backtest smoke tool
- Docker + GitHub Actions + unit tests

**You should do next (today)**

1. Edit `config/portfolio.yaml` to your real paper/live book.
2. Tighten `config/settings.yaml` risk caps to *your* pain threshold.
3. Run `oracle run --report` once per session (pre / open / post).
4. Read `data/reports/latest.md` — challenge every Buy/Add.

### Phase 1 — Research grade (next build)

**Goal:** trustworthy offline research loop.

| Work item | Priority | Notes |
|-----------|----------|-------|
| Cache OHLCV to Parquet | P1 | Don’t hit Yahoo every call |
| FRED macro series adapter | P1 | Rates, CPI, unemployment |
| Expand backtest to Decision replay | P1 | Walk-forward on historical snapshots |
| Position sizing helper (Kelly capped / vol target) | P1 | Still advisory |
| Calendar of known events (YAML) | P1 | Earnings/FOMC watchlist |
| Paper trade journal (apply decisions manually) | P1 | Track slippage vs plan |

**Explicitly skip:** auto-execution, social scrapers, multi-user auth.

### Phase 2 — Operator UI + richer sentiment

| Work item | Priority |
|-----------|----------|
| Local FastAPI + HTMX dashboard (equity, risk, logs) | P2 |
| NewsAPI/GDELT geopolitics | P2 |
| Optional LLM *summarizer* over Evidence only | P2 |
| Reddit lexicon (read-only) | P2 |
| Email/Telegram daily report push | P2 |

### Phase 3 — Controlled execution

| Work item | Priority |
|-----------|----------|
| Broker adapter with **human confirm** | P3 |
| Kill switch + max daily loss | P3 |
| Live vs paper mode flags | P3 |
| Post-trade TCA | P3 |

No Phase 3 until Phase 1 backtests beat a dumb benchmark *after costs* on assets you actually trade.

---

## 5. Recommended work order (solo)

```
Week focus A: use MVP daily, fix config, log journal
Week focus B: Parquet cache + FRED + event calendar
Week focus C: Decision-rule backtest + sizing policy
Week focus D: Dashboard only if CLI friction hurts
Week focus E: Broker paper trading with manual approve
```

Always ask: *Does this reduce risk of a bad decision, or just look impressive?*

---

## 6. Runtime sessions (24h intent)

| Session | When (US/Eastern) | Focus |
|---------|-------------------|--------|
| `pre_market` | before 09:30 | gap risk, overnight news, veto check |
| `market_open` | 09:30–16:00 | intraday risk / drift (MVP uses daily bars) |
| `post_market` | after 16:00 | report, attribution, next-day watchlist |

MVP scheduling: cron / launchd calling `oracle report`.  
Production-grade calendars come in Phase 1.

Example cron (local):

```cron
0 8 * * 1-5  cd /path/oracle && .venv/bin/oracle report --session pre_market
5 16 * * 1-5 cd /path/oracle && .venv/bin/oracle report --session post_market
```

---

## 7. Testing strategy

| Layer | What |
|-------|------|
| Unit | Decision thresholds, veto rules, score mapping |
| Smoke | Backtest on synthetic series |
| Integration (manual/CI optional) | Live yfinance pull — flaky, keep out of default CI if needed |
| Paper journal | Human compares Oracle action vs outcome |

---

## 8. What “world class” means here

Not “most agents” or “most indicators”.

World class for a personal fund OS means:

1. **Contracts** every agent must obey  
2. **Risk veto** that cannot be soft-talked away  
3. **Audit trail** you can replay  
4. **Backtest gate** before capital  
5. **Incremental data adapters** without rewriting Decision  

That skeleton is what this MVP installs. Features plug in; principles stay fixed.
