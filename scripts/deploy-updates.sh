#!/bin/bash

# Deploy Updates Script
# Run this to update code and restart bot

echo "🚀 Deploying Updates..."
echo ""

cd /opt/trading-bot || exit 1

echo "📥 Pulling latest code..."
git pull origin main

echo ""
echo "🐳 Rebuilding Docker image..."
docker-compose down
docker-compose build

echo ""
echo "🚀 Starting bot..."
docker-compose up -d

echo ""
echo "⏳ Waiting for bot to be ready..."
sleep 10

echo ""
echo "✅ Deployment complete!"
echo ""
echo "View logs:"
echo "  docker-compose logs -f trading-bot"
