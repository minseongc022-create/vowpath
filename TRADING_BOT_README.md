# README - Auto Stock Trading Bot

## 🤖 AI-Powered Automated Stock Trading System

A 24/7 automated stock trading bot that uses:
- **News Analysis** - Real-time market sentiment from multiple sources
- **Technical Analysis** - RSI, MACD, Bollinger Bands, Moving Averages
- **AI Intelligence** - OpenAI GPT-4 for trade signal generation
- **Risk Management** - Position sizing, stop losses, portfolio diversification
- **Alpaca Integration** - Real or paper trading execution

## ⚡ Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Run locally
npm run dev

# 4. Open dashboard
# http://localhost:3000/trading/dashboard
```

## 🚀 VPS Deployment (Contabo)

See **[TRADING_BOT_SETUP.md](./TRADING_BOT_SETUP.md)** for complete setup guide.

```bash
# Quick deploy:
wget https://raw.githubusercontent.com/minseongc022-create/vowpath/main/scripts/setup-contabo-vps.sh
sudo bash setup-contabo-vps.sh
```

## 📁 Project Structure

```
lib/trading-ai/
├── types.ts              # TypeScript interfaces
├── alpaca-client.ts      # Alpaca API integration
├── news-collector.ts     # News gathering & sentiment
├── technical-analyzer.ts # Technical indicators
├── ai-engine.ts          # OpenAI analysis
├── risk-manager.ts       # Risk controls
├── trading-bot.ts        # Main bot orchestrator
├── logger.ts             # Logging utility
├── metrics-tracker.ts    # Performance tracking
└── session-storage.ts    # Data persistence

app/
├── api/trading/          # API endpoints
└── trading/dashboard/    # Web dashboard

scripts/
├── setup-contabo-vps.sh  # VPS setup script
└── start-prod.sh         # Production startup

Docker files:
├── Dockerfile            # Container configuration
└── docker-compose.yml    # Multi-container setup
```

## 🎯 Core Features

### 1. **News Collection & Sentiment Analysis**
- Integrates with Finnhub, NewsAPI
- Uses OpenAI for sentiment analysis
- Real-time news scoring

### 2. **Technical Analysis**
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Bollinger Bands
- Moving Averages (20, 50, 200)

### 3. **AI Signal Generation**
- OpenAI GPT-4 analysis
- Multi-factor decision making
- Confidence scoring (0-1)

### 4. **Risk Management**
- Dynamic position sizing
- Portfolio concentration limits
- Stop loss (default 2%)
- Take profit (default 8%)
- Daily loss cap

### 5. **Execution & Monitoring**
- Market orders via Alpaca
- Real-time portfolio tracking
- Web dashboard
- Performance metrics

## 📊 Dashboard

Access at: `http://<your-vps>:3000/trading/dashboard`

**Features:**
- Bot status (running/stopped)
- Control panel (start/stop)
- Configuration (symbols, interval)
- Recent signals
- Portfolio overview
- P&L tracking

## ⚙️ Configuration

### API Keys Required
1. **Alpaca** - Stock trading
2. **OpenAI** - AI analysis
3. **Finnhub** - Market news
4. **NewsAPI** - General news
5. **Alpha Vantage** - Market data (optional)

### Bot Settings
```typescript
const botConfig = {
  symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA'],
  updateIntervalMinutes: 60,      // Check every hour
  tradingHoursOnly: true,         // Only trade 9:30-16:00 ET
  maxOrdersPerDay: 20             // Risk limit
};
```

## 🛡️ Risk Management Defaults

- Max 5% per position
- Max 2% total portfolio risk
- 2% stop loss
- 8% take profit
- $1,000 max daily loss
- 15% max concentration per stock

## 📈 Performance Tracking

- Daily metrics
- Win rate calculation
- Profit factor
- Drawdown analysis
- Sharpe ratio

## 🔍 Monitoring

### Check Bot Status
```bash
curl http://localhost:3000/api/trading?action=status
```

### View Logs
```bash
docker-compose logs -f trading-bot
```

### Check Positions
```bash
curl http://localhost:3000/api/trading?action=positions
```

## ⚠️ Important Notes

### DISCLAIMER
- **Not financial advice** - Use at your own risk
- **Start with paper trading** - Test thoroughly first
- **No guaranteed returns** - Past performance ≠ future results
- **Market risk** - Always use stop losses
- **Monitor regularly** - Don't set and forget

### Best Practices
1. Test extensively in paper trading mode
2. Start with small position sizes
3. Monitor P&L daily
4. Adjust risk parameters based on performance
5. Keep API keys secure
6. Use VPS for 24/7 operation
7. Set up alerts for unusual activity

## 🐛 Troubleshooting

**Bot won't start?**
- Check API keys in `.env.local`
- Verify internet connection
- Review logs: `docker-compose logs`

**No trades executing?**
- Confirm market hours (9:30-16:00 ET)
- Check AI confidence levels (>0.5 required)
- Verify Alpaca account funding

**High CPU/Memory?**
- Increase update interval
- Reduce number of symbols
- Use larger VPS

## 📚 Documentation

- [VPS Setup Guide](./TRADING_BOT_SETUP.md)
- [API Documentation](./docs/API.md) (if available)
- [Performance Tips](./docs/PERFORMANCE.md) (if available)

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create feature branch
3. Test thoroughly
4. Submit pull request

## 📝 License

MIT License - See LICENSE file

## 💬 Support

- GitHub Issues: Report bugs
- GitHub Discussions: Ask questions
- Documentation: See TRADING_BOT_SETUP.md

---

**Made with ❤️ for automated trading**

**⚠️ Trade at your own risk! Always start with paper trading!**
