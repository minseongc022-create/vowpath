# Auto Stock Trading Bot - VPS Deployment Guide

## Overview
This is a 24/7 automated stock trading system that:
- ✅ Collects market news from multiple sources
- ✅ Performs technical analysis (RSI, MACD, Bollinger Bands, MAs)
- ✅ Uses OpenAI for AI-powered trading signals
- ✅ Manages risk with position sizing and stop losses
- ✅ Integrates with Alpaca for real trading
- ✅ Provides web dashboard for monitoring

## Architecture

```
┌─────────────────────────────────────────┐
│        Trading Bot (Node.js)            │
├─────────────────────────────────────────┤
│ • News Collector (Finnhub, NewsAPI)     │
│ • Technical Analyzer (RSI, MACD, etc)   │
│ • AI Engine (OpenAI GPT-4)              │
│ • Risk Manager (position sizing)        │
│ • Alpaca API Client (trade execution)   │
├─────────────────────────────────────────┤
│        Web Dashboard (Next.js)          │
│   • Real-time monitoring                │
│   • Control panel                       │
│   • Portfolio tracking                  │
└─────────────────────────────────────────┘
         ↓ Docker Container ↓
   Contabo VPS (24/7 running)
```

## Prerequisites

1. **Contabo VPS** (or any Linux VPS)
   - Ubuntu 22.04 or later
   - Minimum 2GB RAM
   - Internet connection

2. **API Keys** (required)
   - Alpaca Trading API (paper or live)
   - OpenAI API key
   - Finnhub API key
   - NewsAPI key
   - Alpha Vantage API key (optional)

3. **Tools**
   - Docker & Docker Compose
   - Git
   - curl/wget

## Installation

### 1. Connect to VPS
```bash
ssh root@your-vps-ip
```

### 2. Run Setup Script
```bash
wget https://raw.githubusercontent.com/minseongc022-create/vowpath/main/scripts/setup-contabo-vps.sh
chmod +x setup-contabo-vps.sh
sudo ./setup-contabo-vps.sh
```

### 3. Clone Repository
```bash
cd /opt/trading-bot
git clone https://github.com/minseongc022-create/vowpath.git .
```

### 4. Create Environment File
```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys:
```env
# Alpaca
APCA_API_KEY_ID=your_alpaca_key
APCA_API_SECRET_KEY=your_alpaca_secret
ALPACA_API_BASE=https://api.alpaca.markets
ALPACA_DATA_BASE=https://data.alpaca.markets

# OpenAI
OPENAI_API_KEY=your_openai_key

# News APIs
FINNHUB_API_KEY=your_finnhub_key
NEWS_API_KEY=your_newsapi_key
ALPHA_VANTAGE_API_KEY=your_alphavantage_key
```

### 5. Build and Run
```bash
docker-compose up -d
```

### 6. Verify Running
```bash
docker-compose logs -f
```

## Access Dashboard

1. Open browser: `http://<your-vps-ip>:3000/trading/dashboard`
2. Configure trading symbols
3. Set update interval (minutes)
4. Click "Start Bot"

## Dashboard Features

- 🟢 **Real-time Status**: Bot running/stopped indicator
- 📊 **Portfolio Monitoring**: Current positions and P&L
- 📈 **Trading Signals**: Recent AI-generated signals
- ⚙️ **Control Panel**: Start/stop bot, adjust parameters
- 📉 **Performance Metrics**: Win rate, total gain, execution count

## Configuration

### Bot Settings (in Trading Bot code)
```typescript
const bot = new TradingBot({
  symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'],
  updateIntervalMinutes: 60,  // Check every hour
  tradingHoursOnly: true,     // Only trade during market hours
  maxOrdersPerDay: 20         // Max 20 trades per day
});
```

### Risk Management (in Risk Manager)
```typescript
const riskConfig = {
  maxPositionSize: 5,          // 5% per position
  maxPortfolioRisk: 2,         // 2% total risk
  stopLossPercent: 2,          // 2% stop loss
  takeProfitPercent: 8,        // 8% take profit
  maxDailyLoss: 1000,          // $1000 max loss
  diversificationLimit: 15     // Max 15% per stock
};
```

## Maintenance

### View Logs
```bash
docker-compose logs -f trading-bot
```

### Restart Bot
```bash
docker-compose restart trading-bot
```

### Stop Trading
```bash
docker-compose down
```

### Update Code
```bash
cd /opt/trading-bot
git pull origin main
docker-compose up -d --build
```

## Monitoring

### Health Check
```bash
curl http://localhost:3000/api/trading?action=status
```

### Check Container
```bash
docker ps | grep trading-bot
```

### View System Resources
```bash
docker stats trading-bot
```

## Troubleshooting

### Bot not starting
1. Check API keys in `.env.local`
2. Verify internet connection
3. Check logs: `docker-compose logs trading-bot`

### No trades executing
1. Verify Alpaca API keys (use paper trading first)
2. Check market hours (9:30-16:00 ET)
3. Review AI confidence levels (must be >0.5)

### High resource usage
1. Increase update interval
2. Reduce number of symbols
3. Use larger VPS (4GB+ RAM)

## Important Notes

⚠️ **Risk Disclaimer**
- Start with PAPER trading first
- Test thoroughly before live trading
- This bot does not guarantee profits
- Past performance ≠ future results
- Always maintain emergency stop procedures

⚠️ **API Rate Limits**
- Alpaca: 200 requests/minute
- OpenAI: Check your rate limit
- Finnhub: Based on your plan
- NewsAPI: Based on your plan

## Support & Updates

- GitHub: https://github.com/minseongc022-create/vowpath
- Issues: Report bugs on GitHub Issues
- Contributions: Welcome!

---

**Happy Trading! 📈**
