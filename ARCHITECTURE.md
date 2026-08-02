# System Architecture & Flow

## 🏗️ Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Contabo VPS (24/7)                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Docker Container                        │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │         Next.js Application                    │ │  │
│  │  │  ┌──────────────────────────────────────────┐  │ │  │
│  │  │  │   API Routes (/api/trading/*)            │  │ │  │
│  │  │  │   - Status checking                       │  │ │  │
│  │  │   - Bot control (start/stop)               │  │ │  │
│  │  │   - Position monitoring                     │  │ │  │
│  │  └──────────────────────────────────────────┘  │ │  │
│  │  ┌──────────────────────────────────────────┐  │ │  │
│  │  │   Web Dashboard                          │  │ │  │
│  │  │   - Real-time status                      │  │ │  │
│  │  │   - Control panel                         │  │ │  │
│  │  │   - Signal display                        │  │ │  │
│  │  │   - Portfolio tracking                    │  │ │  │
│  │  └──────────────────────────────────────────┘  │ │  │
│  │  ┌──────────────────────────────────────────┐  │ │  │
│  │  │        Trading Bot (Main Loop)           │  │ │  │
│  │  │                                           │  │ │  │
│  │  │  1. News Collection                      │  │ │  │
│  │  │     ├─ Finnhub API                       │  │ │  │
│  │  │     ├─ NewsAPI                           │  │ │  │
│  │  │     └─ Sentiment Analysis (OpenAI)       │  │ │  │
│  │  │                                           │  │ │  │
│  │  │  2. Technical Analysis                   │  │ │  │
│  │  │     ├─ RSI Calculation                   │  │ │  │
│  │  │     ├─ MACD Calculation                  │  │ │  │
│  │  │     ├─ Bollinger Bands                   │  │ │  │
│  │  │     └─ Moving Averages                   │  │ │  │
│  │  │                                           │  │ │  │
│  │  │  3. AI Signal Generation (GPT-4)         │  │ │  │
│  │  │     ├─ Multi-factor analysis             │  │ │  │
│  │  │     ├─ Confidence scoring                │  │ │  │
│  │  │     └─ Action (BUY/SELL/HOLD)            │  │ │  │
│  │  │                                           │  │ │  │
│  │  │  4. Risk Management                      │  │ │  │
│  │  │     ├─ Position sizing                   │  │ │  │
│  │  │     ├─ Portfolio checks                  │  │ │  │
│  │  │     └─ Validation                        │  │ │  │
│  │  │                                           │  │ │  │
│  │  │  5. Trade Execution (Alpaca)             │  │ │  │
│  │  │     ├─ Place orders                      │  │ │  │
│  │  │     ├─ Monitor fills                     │  │ │  │
│  │  │     └─ Handle errors                     │  │ │  │
│  │  │                                           │  │ │  │
│  │  │  6. Portfolio Management                 │  │ │  │
│  │  │     ├─ Check positions                   │  │ │  │
│  │  │     ├─ Monitor P&L                       │  │ │  │
│  │  │     ├─ Stop loss/take profit             │  │ │  │
│  │  │     └─ Update metrics                    │  │ │  │
│  │  │                                           │  │ │  │
│  │  │  7. Data Persistence                     │  │ │  │
│  │  │     ├─ Vercel KV storage                 │  │ │  │
│  │  │     ├─ Session data                      │  │ │  │
│  │  │     └─ Performance metrics               │  │ │  │
│  │  └──────────────────────────────────────────┘  │ │  │
│  └─────────────────────────────────────────────────┘ │  │
│                          ▲                          │  │
│                          │                          │  │
│         ┌────────────────┼────────────────┐         │  │
│         │                │                │         │  │
│         ▼                ▼                ▼         │  │
│    External APIs    Port 3000          Internal      │  │
│    - Alpaca        Web Access          Storage      │  │
│    - OpenAI        (Dashboard)         - Logs       │  │
│    - Finnhub       - API Calls         - Metrics    │  │
│    - NewsAPI                                        │  │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Trading Loop Flow

```
┌─────────────┐
│   START     │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│  Check Market Hours  │ ─ NO ──► WAIT & RETRY
└──────┬───────────────┘
       │ YES
       ▼
┌──────────────────────┐
│ Get Account Info     │
│ - Balance            │
│ - Current Positions  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  For Each Symbol:    │
│  1. Collect News     │
│  2. Analyze Tech     │
│  3. Generate Signal  │
│  4. Validate Risk    │
│  5. Execute Trade    │
│  6. Record Data      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Manage Open Positions│
│ - Check Stop Loss    │
│ - Check Take Profit  │
│ - Close if needed    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Update Metrics       │
│ - Win rate           │
│ - P&L                │
│ - Performance        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  WAIT               │
│  (Update Interval)   │
└──────┬───────────────┘
       │
       └─────► LOOP BACK TO START
```

## 🧠 AI Decision Flow

```
┌──────────────────────────────────────────┐
│         Analyze Single Stock             │
└──────────────┬───────────────────────────┘
               │
    ┌──────────┴──────────┬──────────────┐
    ▼                     ▼              ▼
┌────────────┐   ┌──────────────┐  ┌──────────┐
│   NEWS     │   │  TECHNICAL   │  │ PORTFOLIO│
│  ANALYSIS  │   │  ANALYSIS    │  │   DATA   │
│            │   │              │  │          │
│ • Collect  │   │ • Calculate  │  │ • Pos    │
│   News     │   │   RSI        │  │ • Value  │
│ • Sentiment│   │ • Calculate  │  │ • Risk   │
│   Score    │   │   MACD       │  │          │
│ • Avg      │   │ • Bollinger  │  │          │
│   Sentiment│   │ • Moving Avgs│  │          │
│            │   │              │  │          │
└────┬───────┘   └──────┬───────┘  └────┬─────┘
     │                  │               │
     └──────────────────┼───────────────┘
                        │
                        ▼
     ┌──────────────────────────────┐
     │   Build Analysis Prompt      │
     │   for GPT-4                  │
     │                              │
     │   "Analyze AAPL:             │
     │    - RSI: 45 (NEUTRAL)       │
     │    - MACD: +0.23 (UP)        │
     │    - News: BULLISH           │
     │    - Portfolio: 2 shares     │
     │                              │
     │    Recommend: BUY/SELL/HOLD?"│
     └──────────┬───────────────────┘
                │
                ▼
     ┌──────────────────────────────┐
     │   Call OpenAI GPT-4          │
     │   with Analysis              │
     └──────────┬───────────────────┘
                │
                ▼
     ┌──────────────────────────────┐
     │   Parse Response             │
     │   {                          │
     │     "action": "BUY",         │
     │     "confidence": 0.75,      │
     │     "reason": "..."          │
     │   }                          │
     └──────────┬───────────────────┘
                │
                ▼
     ┌──────────────────────────────┐
     │   Generate Signal            │
     │   with metadata              │
     └──────────┬───────────────────┘
                │
    ┌───────────┴──────────┐
    ▼                      ▼
 ┌────────┐          ┌──────────┐
 │ SIGNAL │          │  STORE & │
 │ READY  │          │ BROADCAST│
 └────────┘          └──────────┘
```

## 📊 Data Flow

```
EXTERNAL DATA SOURCES
        │
        ├─► Alpaca API ────────────────┐
        │   - Account info             │
        │   - Position data            │
        │   - Market prices            │
        │                              │
        ├─► Finnhub API ───────────────┤
        │   - News headlines           │
        │   - Earnings data            │
        │                              │
        ├─► NewsAPI ────────────────────┤
        │   - General news             │
        │                              ▼
        ├─► Alpha Vantage ──────────► TRADING BOT
        │   - Technical data           - Aggregates
        │                              - Analyzes
        └─► OpenAI API ──────────────► - Decides
            - AI Analysis              - Executes
                                       - Stores
                                       │
                                       ▼
                            DECISION DATABASE
                            (Vercel KV)
                            - Sessions
                            - Signals
                            - Executions
                            - Metrics
                            │
                            ▼
                        DASHBOARD API
                        - Serves status
                        - Serves history
                        - Receives commands
                        │
                        ▼
                    WEB DASHBOARD
                    - Real-time display
                    - User controls
                    - Analytics
```

## ⏰ Timing & Intervals

```
Bot Lifecycle:

┌─ 00:00 ──────────────────────────────────── 23:59 ──────────┐
│                                                               │
│  ✘ Pre-Market (Before 9:30 AM ET)                           │
│  ├─ Bot idle or collecting news                             │
│                                                               │
│  ✓ Market Open (9:30 AM - 4:00 PM ET, M-F)                  │
│  ├─ Execute trade round (every N minutes)                   │
│  ├─ Monitor positions continuously                          │
│  ├─ Check stop loss/take profit every minute               │
│  │                                                            │
│  ├─ [60 min interval] ─────────────────────────────────┐   │
│  │  ┌─ Analyze news (1-2 min)                          │   │
│  │  ├─ Calculate technicals (500ms)                    │   │
│  │  ├─ Call AI API (2-3 sec)                           │   │
│  │  ├─ Check risk (200ms)                              │   │
│  │  ├─ Execute trades (2-5 sec each)                   │   │
│  │  ├─ Update portfolio (500ms)                        │   │
│  │  └─ Total per round: ~10 seconds                    │   │
│  │  └─ Wait remaining ~59 min 50 sec                   │   │
│  └─ [Repeat]──────────────────────────────────────────┘   │
│                                                               │
│  ✘ After Hours (4:00 PM - 9:30 AM ET)                       │
│  ├─ Bot idle or collecting news only                        │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## 🔐 Error Handling & Resilience

```
API Call → Request
  │
  ├─► Success → Process → Update State
  │
  └─► Error
      │
      ├─ Network Error ──► Retry (exponential backoff)
      ├─ Rate Limit ─────► Wait & Retry
      ├─ Invalid Data ───► Log & Skip
      ├─ Auth Error ─────► Alert & Stop
      └─ Unknown ────────► Log & Continue

Trade Execution → Order Placed
  │
  ├─► Filled ─────────► Record & Continue
  ├─► Partial Fill ───► Monitor & Wait
  ├─► Rejected ───────► Log & Skip
  └─► Error ──────────► Cancel & Alert
```

---

This architecture ensures 24/7 reliable trading with proper error handling, risk management, and monitoring.
