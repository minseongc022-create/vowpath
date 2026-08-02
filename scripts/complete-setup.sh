#!/bin/bash

# Complete Auto Stock Trading Bot - Contabo VPS Setup
# This script does EVERYTHING automatically

set -e

echo "🤖 Auto Stock Trading Bot - Complete Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root${NC}"
   echo "Usage: sudo bash complete-setup.sh"
   exit 1
fi

echo -e "${YELLOW}📋 Step 1: Updating system packages...${NC}"
apt-get update > /dev/null 2>&1
apt-get install -y curl wget git vim nano > /dev/null 2>&1
echo -e "${GREEN}✅ System updated${NC}\n"

echo -e "${YELLOW}📦 Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh > /dev/null 2>&1
    sh get-docker.sh > /dev/null 2>&1
    rm get-docker.sh
    echo -e "${GREEN}✅ Docker installed${NC}\n"
else
    echo -e "${GREEN}✅ Docker already installed${NC}\n"
fi

echo -e "${YELLOW}📦 Step 3: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose > /dev/null 2>&1
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed${NC}\n"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}\n"
fi

echo -e "${YELLOW}📁 Step 4: Creating app directory...${NC}"
mkdir -p /opt/trading-bot
cd /opt/trading-bot
echo -e "${GREEN}✅ Directory created at /opt/trading-bot${NC}\n"

echo -e "${YELLOW}📥 Step 5: Cloning repository...${NC}"
if [ ! -d ".git" ]; then
    git clone https://github.com/minseongc022-create/vowpath.git . > /dev/null 2>&1
    echo -e "${GREEN}✅ Repository cloned${NC}\n"
else
    echo -e "${GREEN}✅ Repository already exists${NC}\n"
fi

echo -e "${YELLOW}🔑 Step 6: Setting up environment variables...${NC}"
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo -e "${GREEN}✅ .env.local created${NC}\n"
    echo -e "${RED}⚠️  IMPORTANT: Edit /opt/trading-bot/.env.local with your API keys:${NC}"
    echo "   nano /opt/trading-bot/.env.local"
    echo ""
    echo -e "${YELLOW}Required API Keys:${NC}"
    echo "  1. APCA_API_KEY_ID - from https://app.alpaca.markets/brokerage/account/api-keys"
    echo "  2. APCA_API_SECRET_KEY - from https://app.alpaca.markets/brokerage/account/api-keys"
    echo "  3. OPENAI_API_KEY - from https://platform.openai.com/api-keys"
    echo "  4. FINNHUB_API_KEY - from https://finnhub.io/dashboard/api-keys"
    echo "  5. NEWS_API_KEY - from https://newsapi.org/account"
    echo ""
    read -p "Press Enter when you've added your API keys to .env.local..."
else
    echo -e "${GREEN}✅ .env.local already exists${NC}\n"
fi

echo -e "${YELLOW}🐳 Step 7: Building Docker image...${NC}"
docker-compose build > /dev/null 2>&1
echo -e "${GREEN}✅ Docker image built${NC}\n"

echo -e "${YELLOW}🚀 Step 8: Starting trading bot...${NC}"
docker-compose up -d > /dev/null 2>&1
echo -e "${GREEN}✅ Trading bot started${NC}\n"

echo -e "${YELLOW}⏳ Waiting for bot to be ready...${NC}"
sleep 10
echo -e "${GREEN}✅ Bot is running${NC}\n"

echo -e "${YELLOW}✅ Step 9: Getting VPS IP address...${NC}"
VPS_IP=$(hostname -I | awk '{print $1}')
echo -e "${GREEN}✅ VPS IP: ${YELLOW}$VPS_IP${NC}\n"

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║         🎉 SETUP COMPLETE - TRADING BOT IS RUNNING! 🎉             ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}📊 ACCESS YOUR DASHBOARD:${NC}"
echo -e "   ${YELLOW}http://$VPS_IP:3000/trading/dashboard${NC}"
echo ""
echo -e "${GREEN}📋 USEFUL COMMANDS:${NC}"
echo "   View logs:          docker-compose logs -f trading-bot"
echo "   Stop bot:           docker-compose down"
echo "   Restart bot:        docker-compose restart"
echo "   Update code:        git pull && docker-compose up -d --build"
echo ""
echo -e "${GREEN}📁 APP LOCATION:${NC}"
echo "   /opt/trading-bot"
echo ""
echo -e "${GREEN}🔧 EDIT CONFIG:${NC}"
echo "   nano /opt/trading-bot/.env.local"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT NOTES:${NC}"
echo "   1. Start with PAPER TRADING first (Alpaca)"
echo "   2. Monitor the dashboard regularly"
echo "   3. Check logs for any errors"
echo "   4. Keep VPS running 24/7"
echo ""
echo -e "${GREEN}📚 DOCUMENTATION:${NC}"
echo "   Setup Guide:    /opt/trading-bot/TRADING_BOT_SETUP.md"
echo "   Quick Start:    /opt/trading-bot/GETTING_STARTED.md"
echo "   Architecture:   /opt/trading-bot/ARCHITECTURE.md"
echo ""
echo -e "${GREEN}Happy Trading! 📈${NC}"
echo ""
