#!/bin/bash

# Production startup script for trading bot
# Used in Docker container

set -e

echo "🚀 Starting Auto Stock Trading Bot..."
echo "Environment: $NODE_ENV"

# Validate environment variables
if [ -z "$APCA_API_KEY_ID" ] || [ -z "$APCA_API_SECRET_KEY" ]; then
    echo "❌ Error: Alpaca API credentials not set"
    exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OpenAI API key not set"
    exit 1
fi

echo "✅ Environment variables validated"
echo "📊 Starting Next.js server..."

# Start the application
exec node server.js
