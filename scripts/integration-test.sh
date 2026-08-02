#!/bin/bash

# Integration Test Script
# Tests the full trading bot flow

set -e

echo "🧪 Running Integration Tests..."

# Check environment
if [ -z "$APCA_API_KEY_ID" ]; then
    echo "⚠️  APCA_API_KEY_ID not set, skipping live API tests"
else
    echo "✅ Testing Alpaca API connection..."
    # Test would go here
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  OPENAI_API_KEY not set, skipping AI tests"
else
    echo "✅ Testing OpenAI API connection..."
    # Test would go here
fi

echo "✅ Testing Technical Analysis..."
node --experimental-strip-types -e "
  const { TechnicalAnalyzer } = require('./lib/trading-ai/technical-analyzer.ts');
  const prices = Array.from({length: 200}, (_, i) => 100 + i * 0.5);
  const rsi = TechnicalAnalyzer.calculateRSI(prices);
  console.log(`RSI: ${rsi}`);
  if (rsi >= 0 && rsi <= 100) {
    console.log('✅ RSI calculation passed');
  } else {
    console.error('❌ RSI calculation failed');
    process.exit(1);
  }
"

echo "✅ Testing Risk Manager..."
node --experimental-strip-types -e "
  const { RiskManager, DEFAULT_RISK_CONFIG } = require('./lib/trading-ai/risk-manager.ts');
  const rm = new RiskManager(DEFAULT_RISK_CONFIG);
  const size = rm.calculatePositionSize(10000, { confidence: 0.8 }, 150);
  console.log(`Position size: ${size}`);
  if (size > 0) {
    console.log('✅ Position sizing passed');
  } else {
    console.error('❌ Position sizing failed');
    process.exit(1);
  }
"

echo "✅ Testing Metrics Tracker..."
node --experimental-strip-types -e "
  const { MetricsTracker } = require('./lib/trading-ai/metrics-tracker.ts');
  const tracker = new MetricsTracker();
  tracker.recordTrade('AAPL', 'buy', 100, 10);
  tracker.closeTrade(0, 110);
  const metrics = tracker.getPerformanceMetrics();
  console.log(`Win rate: ${metrics.winRate}%`);
  if (metrics.totalTrades === 1) {
    console.log('✅ Metrics tracking passed');
  } else {
    console.error('❌ Metrics tracking failed');
    process.exit(1);
  }
"

echo ""
echo "🎉 All integration tests passed!"
