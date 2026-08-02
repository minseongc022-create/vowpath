# Getting Started - Auto Stock Trading Bot

## 🚀 5-Minute Quick Start

### Prerequisites
- Node.js 18+ installed
- API keys from: Alpaca, OpenAI, Finnhub, NewsAPI

### Step 1: Clone & Setup
```bash
git clone https://github.com/minseongc022-create/vowpath.git
cd vowpath
npm install
cp .env.example .env.local
```

### Step 2: Configure API Keys
Edit `.env.local` and add your API keys:
```env
APCA_API_KEY_ID=your_alpaca_key
APCA_API_SECRET_KEY=your_alpaca_secret
OPENAI_API_KEY=your_openai_key
FINNHUB_API_KEY=your_finnhub_key
NEWS_API_KEY=your_newsapi_key
```

### Step 3: Run Locally
```bash
npm run dev
```

Access dashboard: http://localhost:3000/trading/dashboard

---

## 🖥️ VPS Deployment (Contabo)

### Step 1: SSH into VPS
```bash
ssh root@your-vps-ip
```

### Step 2: Run Setup Script
```bash
wget https://raw.githubusercontent.com/minseongc022-create/vowpath/main/scripts/setup-contabo-vps.sh
chmod +x setup-contabo-vps.sh
sudo bash setup-contabo-vps.sh
```

### Step 3: Configure
```bash
cd /opt/trading-bot
git clone https://github.com/minseongc022-create/vowpath.git .
cp .env.example .env.local
# Edit .env.local with your API keys
```

### Step 4: Start Bot
```bash
docker-compose up -d
```

### Step 5: Access Dashboard
Open browser: `http://your-vps-ip:3000/trading/dashboard`

---

## 📖 What Gets Created

### Core Modules
```
lib/trading-ai/
├── types.ts              # Data structures
├── alpaca-client.ts      # Trading API
├── news-collector.ts     # News & sentiment
├── technical-analyzer.ts # RSI, MACD, etc.
├── ai-engine.ts          # OpenAI signals
├── risk-manager.ts       # Position sizing
├── trading-bot.ts        # Main orchestrator
├── logger.ts             # Logging
├── metrics-tracker.ts    # Performance
└── session-storage.ts    # Data persistence
```

### Web Interface
```
app/
├── api/trading/          # REST API endpoints
└── trading/dashboard/    # React dashboard
```

### Deployment
```
Dockerfile               # Container config
docker-compose.yml       # Multi-container setup
scripts/setup-*.sh       # Setup scripts
```

---

## ⚙️ Configuration

### Trading Symbols
Edit in dashboard or code:
```typescript
const botConfig = {
  symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'],
  updateIntervalMinutes: 60,
  maxOrdersPerDay: 20
};
```

### Risk Settings
Default config (editable):
- Max 5% per position
- 2% stop loss
- 8% take profit
- $1,000 daily loss limit

### Market Hours
- Trading: 9:30 AM - 4:00 PM ET (M-F)
- Configurable: Set `tradingHoursOnly: false` to trade 24/7

---

## 🎮 Dashboard Features

### Status Panel
- Bot running/stopped indicator
- Current session info
- Portfolio value & P&L

### Control Panel
- Start/stop bot
- Configure symbols
- Set update interval

### Signals Feed
- Recent trading signals
- Confidence levels
- Action reasons

### Portfolio View
- Current positions
- Entry prices
- Unrealized P&L

---

## 🔍 Monitoring

### View Status
```bash
curl http://localhost:3000/api/trading?action=status
```

### View Positions
```bash
curl http://localhost:3000/api/trading?action=positions
```

### Check Logs
```bash
# Local
npm run dev

# Docker
docker-compose logs -f trading-bot
```

---

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
bash scripts/integration-test.sh
```

---

## 🛑 Stopping the Bot

### Local
```bash
Ctrl + C
```

### Docker
```bash
docker-compose down
```

### VPS SSH
```bash
docker-compose stop
```

---

## 🐛 Troubleshooting

### Bot won't start
```bash
# Check logs
docker-compose logs trading-bot

# Verify API keys
grep -E 'APCA|OPENAI' .env.local
```

### No trades executing
1. Check market hours (9:30-16:00 ET)
2. Verify Alpaca account has funds
3. Review confidence levels (must be >0.5)
4. Check logs for errors

### High API costs
1. Increase update interval (60+ minutes)
2. Reduce number of symbols
3. Disable news collection if not needed

---

## 📚 Full Documentation

- **Setup Guide**: [TRADING_BOT_SETUP.md](./TRADING_BOT_SETUP.md)
- **README**: [TRADING_BOT_README.md](./TRADING_BOT_README.md)
- **Architecture**: See project structure above

---

## ⚠️ Important Notes

### Risk Disclaimer
- Start with **PAPER TRADING** only
- This is NOT financial advice
- No guaranteed returns
- Always use stop losses
- Monitor regularly

### Security
- Keep API keys secret (never commit to Git)
- Use `.env.local` for local development
- Use `.env` file in Docker for production
- Rotate API keys regularly

### Best Practices
1. Test extensively in paper trading
2. Start with small position sizes
3. Monitor P&L daily
4. Adjust risk parameters based on results
5. Keep 24/7 monitoring active
6. Set up email/SMS alerts

---

## 🤝 Getting Help

1. Check logs first
2. Review documentation
3. Check GitHub Issues
4. Submit issue with logs and details

---

## 🎉 You're Ready!

Your automated trading bot is now set up and ready to trade!

**Next Steps:**
1. ✅ Configure API keys
2. ✅ Test in paper trading
3. ✅ Monitor performance
4. ✅ Adjust parameters
5. ✅ Go live (optional)

Happy trading! 📈
