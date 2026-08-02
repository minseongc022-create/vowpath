# 🤖 Auto Stock Trading Bot - Complete Setup Guide

## ⚡ One-Command Setup (Recommended)

### Step 1: Connect to Contabo VPS
```bash
ssh root@your-vps-ip
# Enter your VPS password
```

### Step 2: Run Complete Setup Script
```bash
wget https://raw.githubusercontent.com/minseongc022-create/vowpath/main/scripts/complete-setup.sh
chmod +x complete-setup.sh
sudo bash complete-setup.sh
```

That's it! The script will:
- ✅ Update system packages
- ✅ Install Docker & Docker Compose
- ✅ Clone the repository
- ✅ Create environment file
- ✅ Build Docker image
- ✅ Start the trading bot
- ✅ Display your dashboard URL

---

## 📊 Access Your Dashboard

After setup completes, you'll see:
```
📊 ACCESS YOUR DASHBOARD:
   http://your-vps-ip:3000/trading/dashboard
```

Open this URL in your browser! 🎉

---

## 🔑 Adding API Keys

The script will pause and ask you to add API keys:

### 1. **Alpaca Trading API**
- Go to: https://app.alpaca.markets/brokerage/account/api-keys
- Copy your API Key ID and Secret Key
- Paste into `.env.local`

### 2. **OpenAI API**
- Go to: https://platform.openai.com/api-keys
- Create a new API key
- Paste into `.env.local`

### 3. **Finnhub API**
- Go to: https://finnhub.io/dashboard/api-keys
- Copy your API key
- Paste into `.env.local`

### 4. **NewsAPI**
- Go to: https://newsapi.org/account
- Copy your API key
- Paste into `.env.local`

---

## 📝 Edit .env.local File

After setup, edit the environment file:
```bash
nano /opt/trading-bot/.env.local
```

Add your API keys:
```env
APCA_API_KEY_ID=your_alpaca_key_here
APCA_API_SECRET_KEY=your_alpaca_secret_here
OPENAI_API_KEY=your_openai_key_here
FINNHUB_API_KEY=your_finnhub_key_here
NEWS_API_KEY=your_newsapi_key_here
```

Save: `Ctrl + X` → `Y` → `Enter`

Restart bot:
```bash
cd /opt/trading-bot
docker-compose restart
```

---

## 🎮 Using the Dashboard

### Dashboard URL
```
http://your-vps-ip:3000/trading/dashboard
```

### Dashboard Features

**Status Panel**
- See if bot is running or stopped
- View current session info
- Check portfolio value and P&L

**Control Panel**
- Start/stop the bot
- Configure trading symbols
- Set update interval (minutes between trades)

**Trading Signals**
- View recent AI-generated signals
- See confidence levels
- Understand why trades are recommended

**Portfolio**
- Current open positions
- Entry prices
- Unrealized profit/loss

---

## 🛠️ Useful Commands

### View Bot Logs
```bash
cd /opt/trading-bot
docker-compose logs -f trading-bot
```

### Stop Bot
```bash
cd /opt/trading-bot
docker-compose down
```

### Restart Bot
```bash
cd /opt/trading-bot
docker-compose restart
```

### Check Bot Status
```bash
bash /opt/trading-bot/scripts/status-check.sh
```

### Update Code
```bash
bash /opt/trading-bot/scripts/deploy-updates.sh
```

### View Docker Container
```bash
docker ps | grep trading-bot
```

### View VPS IP
```bash
hostname -I
```

---

## ⚠️ Important First Steps

### 1️⃣ **Use Paper Trading First!**
- Don't use real money immediately
- Alpaca offers paper trading (simulated)
- Test your bot for 1-2 weeks
- Monitor performance

### 2️⃣ **Monitor Regularly**
- Check dashboard daily
- Review bot logs
- Verify trades are executing correctly
- Monitor P&L

### 3️⃣ **Keep VPS Running**
- Bot runs 24/7
- Check that bot is still running
- Monitor disk space
- Keep backups of configs

### 4️⃣ **Adjust Risk Settings**
Edit trading bot config to adjust:
- Maximum position size
- Stop loss percentage
- Take profit percentage
- Max daily loss limit

---

## 🔍 How to Check Everything Works

### Test 1: API Connection
```bash
curl http://your-vps-ip:3000/api/trading?action=status
```

You should see:
```json
{"status":"running","isRunning":true,"session":{...}}
```

### Test 2: View Positions
```bash
curl http://your-vps-ip:3000/api/trading?action=positions
```

You should see current portfolio positions.

### Test 3: Check Docker
```bash
docker ps
```

You should see the trading-bot container running.

---

## 📊 Trading Bot Configuration

Edit trading symbols and update interval:

**File**: `/opt/trading-bot/lib/trading-ai/trading-bot.ts`

Change these lines:
```typescript
const botConfig = {
  symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'],  // Your symbols
  updateIntervalMinutes: 60,  // How often to check (60 = every hour)
  tradingHoursOnly: true,     // Only trade during market hours
  maxOrdersPerDay: 20         // Max trades per day
};
```

After editing:
```bash
cd /opt/trading-bot
bash scripts/deploy-updates.sh
```

---

## 💰 Cost Breakdown

### Monthly Costs

**Contabo VPS** (24/7)
- $3-5/month (basic plan)

**API Costs**
- Alpaca: Free
- OpenAI: ~$5-20/month (depends on usage)
- Finnhub: Free (basic tier)
- NewsAPI: Free or $9-99/month (depends on plan)

**Total**: ~$10-30/month

---

## 🆘 Troubleshooting

### Bot won't start
```bash
docker-compose logs trading-bot
```
Check for error messages. Usually:
- Missing API keys in `.env.local`
- Invalid API key format
- No internet connection

### Dashboard not loading
- Check VPS IP is correct
- Verify port 3000 is open: `curl localhost:3000`
- Check Docker is running: `docker ps`

### No trades executing
- Check market hours (9:30-16:00 ET, M-F)
- Verify AI confidence > 0.5
- Check Alpaca account has funds
- Review logs for errors

### High API costs
- Increase update interval (60+ minutes)
- Reduce number of symbols
- Disable news collection
- Use cheaper API plans

---

## 📚 Additional Resources

- **Full Setup Guide**: `/opt/trading-bot/TRADING_BOT_SETUP.md`
- **Architecture**: `/opt/trading-bot/ARCHITECTURE.md`
- **Quick Start**: `/opt/trading-bot/GETTING_STARTED.md`
- **GitHub**: https://github.com/minseongc022-create/vowpath

---

## ✅ Quick Checklist

- [ ] SSH into Contabo VPS
- [ ] Run complete-setup.sh
- [ ] Add API keys to .env.local
- [ ] Restart docker-compose
- [ ] Open dashboard URL
- [ ] Start bot with paper trading
- [ ] Monitor for 1-2 weeks
- [ ] Switch to live trading (if desired)

---

## 🎉 You're All Set!

Your automated trading bot is now running 24/7!

**Dashboard**: `http://your-vps-ip:3000/trading/dashboard`

Happy Trading! 📈
