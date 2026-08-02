/**
 * Unit tests for Trading Bot components
 */

import { describe, it, expect } from '@jest/globals';
import { TechnicalAnalyzer } from '../lib/trading-ai/technical-analyzer';
import { RiskManager, DEFAULT_RISK_CONFIG } from '../lib/trading-ai/risk-manager';
import { MetricsTracker } from '../lib/trading-ai/metrics-tracker';

describe('TechnicalAnalyzer', () => {
  const priceHistory = [
    100, 101, 102, 101, 103, 104, 103, 105, 106, 105,
    107, 108, 107, 109, 110, 109, 111, 112, 111, 113
  ];

  it('should calculate RSI correctly', () => {
    const rsi = TechnicalAnalyzer.calculateRSI(priceHistory, 14);
    expect(typeof rsi).toBe('number');
    expect(rsi).toBeGreaterThanOrEqual(0);
    expect(rsi).toBeLessThanOrEqual(100);
  });

  it('should calculate SMA correctly', () => {
    const sma = TechnicalAnalyzer.calculateSMA(priceHistory, 5);
    expect(typeof sma).toBe('number');
    expect(sma).toBeGreaterThan(0);
  });

  it('should calculate EMA correctly', () => {
    const ema = TechnicalAnalyzer.calculateEMA(priceHistory, 5);
    expect(typeof ema).toBe('number');
    expect(ema).toBeGreaterThan(0);
  });

  it('should calculate MACD correctly', () => {
    const macd = TechnicalAnalyzer.calculateMACD(priceHistory);
    expect(typeof macd.macd).toBe('number');
    expect(typeof macd.signal).toBe('number');
    expect(typeof macd.histogram).toBe('number');
  });

  it('should calculate Bollinger Bands correctly', () => {
    const bb = TechnicalAnalyzer.calculateBollingerBands(priceHistory, 20, 2);
    expect(bb.upper).toBeGreaterThan(bb.middle);
    expect(bb.middle).toBeGreaterThan(bb.lower);
  });

  it('should generate trading signals', () => {
    const indicators = TechnicalAnalyzer.analyze(priceHistory);
    const signal = TechnicalAnalyzer.getSignal(indicators, priceHistory[priceHistory.length - 1]);
    expect(['BUY', 'SELL', 'HOLD']).toContain(signal.signal);
    expect(signal.strength).toBeGreaterThanOrEqual(0);
    expect(signal.strength).toBeLessThanOrEqual(1);
  });
});

describe('RiskManager', () => {
  const riskManager = new RiskManager(DEFAULT_RISK_CONFIG);

  it('should calculate position size', () => {
    const signal = {
      symbol: 'AAPL',
      action: 'BUY' as const,
      confidence: 0.8,
      price: 150,
      reason: 'Test',
      timestamp: new Date(),
      newsScores: [],
      technicalIndicators: {
        rsi: 50,
        macd: 0,
        bollingerBands: { upper: 160, middle: 150, lower: 140 },
        movingAverage: { ma20: 150, ma50: 148, ma200: 145 }
      }
    };

    const size = riskManager.calculatePositionSize(10000, signal, 150);
    expect(typeof size).toBe('number');
    expect(size).toBeGreaterThan(0);
  });

  it('should check if position can be opened', () => {
    const signal = {
      symbol: 'AAPL',
      action: 'BUY' as const,
      confidence: 0.8,
      price: 150,
      reason: 'Test',
      timestamp: new Date(),
      newsScores: [],
      technicalIndicators: {
        rsi: 50,
        macd: 0,
        bollingerBands: { upper: 160, middle: 150, lower: 140 },
        movingAverage: { ma20: 150, ma50: 148, ma200: 145 }
      }
    };

    const result = riskManager.canOpenPosition(signal, [], 10000);
    expect(typeof result.allowed).toBe('boolean');
  });

  it('should calculate stop loss and take profit levels', () => {
    const levels = riskManager.calculateLevels(100);
    expect(levels.stopLoss).toBeLessThan(100);
    expect(levels.takeProfit).toBeGreaterThan(100);
  });
});

describe('MetricsTracker', () => {
  const tracker = new MetricsTracker();

  it('should record trades', () => {
    tracker.recordTrade('AAPL', 'buy', 100, 10);
    tracker.recordTrade('AAPL', 'sell', 110, 10);
    tracker.recordPortfolioValue(1000);

    const metrics = tracker.getPerformanceMetrics();
    expect(metrics.totalTrades).toBe(2);
  });

  it('should calculate win rate', () => {
    const tracker2 = new MetricsTracker();
    tracker2.recordTrade('AAPL', 'buy', 100, 10);
    tracker2.closeTrade(0, 110);
    tracker2.recordTrade('GOOGL', 'buy', 1000, 1);
    tracker2.closeTrade(1, 950);

    const metrics = tracker2.getPerformanceMetrics();
    expect(metrics.winRate).toBe(50); // 1 win, 1 loss
  });

  it('should calculate daily metrics', () => {
    const tracker3 = new MetricsTracker();
    tracker3.recordTrade('AAPL', 'buy', 100, 10);
    tracker3.closeTrade(0, 105);

    const daily = tracker3.getDailyMetrics();
    expect(daily.tradesExecuted).toBe(1);
    expect(daily.winCount).toBe(1);
    expect(daily.totalGain).toBeGreaterThan(0);
  });
});
