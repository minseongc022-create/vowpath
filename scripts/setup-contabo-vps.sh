#!/bin/bash

# Setup script for Contabo VPS
# Auto Stock Trading Bot Setup

set -e

echo "🤖 Auto Stock Trading Bot - Contabo VPS Setup"
echo "============================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root. Use: sudo ./setup.sh"
   exit 1
fi

echo "📦 Installing dependencies..."
apt-get update
apt-get install -y curl wget git

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $SUDO_USER

# Install Docker Compose
echo "📦 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
echo "📁 Creating app directory..."
sudo mkdir -p /opt/trading-bot
sudo chown $SUDO_USER:$SUDO_USER /opt/trading-bot

echo "\n✅ Prerequisites installed!"
echo "\n📝 Next steps:"
echo "1. Clone the repo: cd /opt/trading-bot && git clone <repo-url> ."
echo "2. Create .env file with API credentials"
echo "3. Run: docker-compose up -d"
echo "4. Access dashboard at: http://<your-vps-ip>:3000/trading/dashboard"
