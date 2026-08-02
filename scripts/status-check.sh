#!/bin/bash

# Quick Status Check Script
# Run this to see bot status and performance

echo "🤖 Trading Bot Status Check"
echo "==========================="
echo ""

VPS_IP="localhost"
if [ -n "$1" ]; then
    VPS_IP=$1
fi

echo "📍 Checking: http://$VPS_IP:3000"
echo ""

# Check if bot is running
echo "🔍 Bot Status:"
RESPONSE=$(curl -s "http://$VPS_IP:3000/api/trading?action=status" 2>/dev/null || echo '{"error": "Connection failed"}')

if echo "$RESPONSE" | grep -q '"error"'; then
    echo "❌ Bot is NOT accessible"
    echo "   Make sure bot is running: docker-compose up -d"
else
    STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    if [ "$STATUS" = "running" ]; then
        echo "✅ Bot is RUNNING"
    else
        echo "⏸️  Bot is STOPPED"
    fi
    
    echo ""
    echo "📊 Session Data:"
    echo "$RESPONSE" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4 | head -1
    echo "$RESPONSE" | grep -o '"totalValue":[^,}]*' | head -1
    echo "$RESPONSE" | grep -o '"totalGainPercent":[^,}]*' | head -1
fi

echo ""
echo "📋 Docker Logs (last 20 lines):"
docker-compose logs --tail=20 trading-bot 2>/dev/null | head -20

echo ""
echo "💾 Docker Status:"
docker ps | grep trading-bot || echo "Container not found"

echo ""
echo "✅ Check complete"
