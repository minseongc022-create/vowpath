/**
 * Technical Analysis Engine
 * Calculates RSI, MACD, Bollinger Bands, Moving Averages
 */

import type { TechnicalIndicators } from './types';

export class TechnicalAnalyzer {
  /**
   * Calculate Relative Strength Index (RSI)
   */
  static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    const gains = changes
      .slice(-period)
      .filter((c) => c > 0)
      .reduce((a, b) => a + b, 0);
    const losses = Math.abs(
      changes
        .slice(-period)
        .filter((c) => c < 0)
        .reduce((a, b) => a + b, 0)
    );

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return Math.round(100 - 100 / (1 + rs));
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  static calculateMACD(
    prices: number[]
  ): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    const signal = this.calculateEMA([macd], 9);
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  /**
   * Calculate Exponential Moving Average
   */
  static calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    if (prices.length < period) {
      return prices.reduce((a, b) => a + b, 0) / prices.length;
    }

    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }

    return ema;
  }

  /**
   * Calculate Simple Moving Average
   */
  static calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices.reduce((a, b) => a + b, 0) / prices.length;
    return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  /**
   * Calculate Bollinger Bands
   */
  static calculateBollingerBands(
    prices: number[],
    period: number = 20,
    stdDeviation: number = 2
  ): { upper: number; middle: number; lower: number } {
    const middle = this.calculateSMA(prices, period);
    const recentPrices = prices.slice(-period);

    const variance =
      recentPrices.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) /
      period;
    const std = Math.sqrt(variance);

    return {
      upper: middle + std * stdDeviation,
      middle,
      lower: middle - std * stdDeviation,
    };
  }

  /**
   * Analyze all technical indicators
   */
  static analyze(prices: number[]): TechnicalIndicators {
    const rsi = this.calculateRSI(prices);
    const { macd } = this.calculateMACD(prices);
    const bollingerBands = this.calculateBollingerBands(prices);

    return {
      rsi,
      macd,
      bollingerBands,
      movingAverage: {
        ma20: this.calculateSMA(prices, 20),
        ma50: this.calculateSMA(prices, 50),
        ma200: this.calculateSMA(prices, 200),
      },
    };
  }

  /**
   * Get buy/sell signals based on technical indicators
   */
  static getSignal(
    indicators: TechnicalIndicators,
    currentPrice: number
  ): { signal: 'BUY' | 'SELL' | 'HOLD'; strength: number } {
    let score = 0;
    let signals = 0;

    // RSI signals
    if (indicators.rsi < 30) {
      score += 2; // Strong buy
      signals++;
    } else if (indicators.rsi < 45) {
      score += 1; // Weak buy
      signals++;
    } else if (indicators.rsi > 70) {
      score -= 2; // Strong sell
      signals++;
    } else if (indicators.rsi > 55) {
      score -= 1; // Weak sell
      signals++;
    }

    // MACD signals
    if (indicators.macd > 0) {
      score += 1;
      signals++;
    } else {
      score -= 1;
      signals++;
    }

    // Bollinger Bands signals
    const bbPosition =
      (currentPrice - indicators.bollingerBands.lower) /
      (indicators.bollingerBands.upper - indicators.bollingerBands.lower);
    if (bbPosition < 0.2) {
      score += 1;
      signals++;
    } else if (bbPosition > 0.8) {
      score -= 1;
      signals++;
    }

    // Moving average trend
    if (
      indicators.movingAverage.ma20 > indicators.movingAverage.ma50 &&
      indicators.movingAverage.ma50 > indicators.movingAverage.ma200
    ) {
      score += 1;
      signals++;
    } else if (
      indicators.movingAverage.ma20 < indicators.movingAverage.ma50 &&
      indicators.movingAverage.ma50 < indicators.movingAverage.ma200
    ) {
      score -= 1;
      signals++;
    }

    const avgScore = score / signals;
    const strength = Math.abs(avgScore);

    if (avgScore > 0.3) {
      return { signal: 'BUY', strength };
    } else if (avgScore < -0.3) {
      return { signal: 'SELL', strength };
    }

    return { signal: 'HOLD', strength };
  }
}
