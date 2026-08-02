/**
 * Risk Management Module
 * Handles position sizing, stop losses, and portfolio allocation
 */

import type { MarketSignal, PortfolioPosition } from './types';

export interface RiskConfig {
  maxPositionSize: number; // % of portfolio
  maxPortfolioRisk: number; // % of portfolio
  stopLossPercent: number; // % below entry
  takeProfitPercent: number; // % above entry
  maxDailyLoss: number; // $ amount
  diversificationLimit: number; // max % in single stock
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxPositionSize: 5, // 5% per position
  maxPortfolioRisk: 2, // 2% total portfolio risk
  stopLossPercent: 2, // 2% stop loss
  takeProfitPercent: 8, // 8% take profit
  maxDailyLoss: 1000, // $1000 max daily loss
  diversificationLimit: 15, // max 15% in single stock
};

export class RiskManager {
  private config: RiskConfig;

  constructor(config: Partial<RiskConfig> = {}) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  /**
   * Calculate position size based on account size and risk
   */
  calculatePositionSize(
    accountSize: number,
    signal: MarketSignal,
    currentPrice: number
  ): number {
    // Base position size on confidence
    const basePositionValue = (accountSize * this.config.maxPositionSize) / 100;
    const adjustedPositionValue = basePositionValue * Math.min(1, signal.confidence * 1.5);

    // Convert to shares
    const shares = Math.floor(adjustedPositionValue / currentPrice);

    return Math.max(1, shares);
  }

  /**
   * Check if position would exceed portfolio limits
   */
  canOpenPosition(
    signal: MarketSignal,
    portfolio: PortfolioPosition[],
    accountSize: number
  ): {
    allowed: boolean;
    reason?: string;
  } {
    // Check if signal is HOLD
    if (signal.action === 'HOLD') {
      return { allowed: false, reason: 'Signal is HOLD' };
    }

    // Check single position concentration
    const currentPosition = portfolio.find((p) => p.symbol === signal.symbol);
    if (currentPosition) {
      const positionValue = currentPosition.quantity * signal.price;
      const positionPercent = (positionValue / accountSize) * 100;

      if (positionPercent > this.config.diversificationLimit) {
        return {
          allowed: false,
          reason: `Position already at ${positionPercent.toFixed(2)}% of portfolio`,
        };
      }
    }

    // Check portfolio concentration
    const portfolioRiskPercent = portfolio.reduce((sum, pos) => {
      const posValue = pos.quantity * pos.currentPrice;
      return sum + (posValue / accountSize) * 100;
    }, 0);

    if (portfolioRiskPercent > this.config.maxPortfolioRisk * 50) {
      // 50x multiplier because risk is assessed differently
      return { allowed: false, reason: 'Portfolio already highly concentrated' };
    }

    // Check confidence level for execution
    if (signal.confidence < 0.4 && signal.action !== 'BUY') {
      return { allowed: false, reason: 'Confidence level too low' };
    }

    return { allowed: true };
  }

  /**
   * Calculate stop loss and take profit levels
   */
  calculateLevels(entryPrice: number): {
    stopLoss: number;
    takeProfit: number;
  } {
    return {
      stopLoss: entryPrice * (1 - this.config.stopLossPercent / 100),
      takeProfit: entryPrice * (1 + this.config.takeProfitPercent / 100),
    };
  }

  /**
   * Check if position should be closed (stop loss or take profit)
   */
  shouldClosePosition(
    position: PortfolioPosition
  ): {
    shouldClose: boolean;
    reason?: string;
  } {
    const levels = this.calculateLevels(position.avgCost);

    if (position.currentPrice <= levels.stopLoss) {
      return {
        shouldClose: true,
        reason: `Hit stop loss (${this.config.stopLossPercent}%)`,
      };
    }

    if (position.currentPrice >= levels.takeProfit) {
      return {
        shouldClose: true,
        reason: `Hit take profit (${this.config.takeProfitPercent}%)`,
      };
    }

    return { shouldClose: false };
  }

  /**
   * Calculate portfolio metrics
   */
  calculatePortfolioMetrics(portfolio: PortfolioPosition[]): {
    totalValue: number;
    totalCost: number;
    totalGain: number;
    totalGainPercent: number;
    concentration: Map<string, number>; // symbol -> % of portfolio
  } {
    const totalValue = portfolio.reduce((sum, pos) => sum + pos.quantity * pos.currentPrice, 0);
    const totalCost = portfolio.reduce((sum, pos) => sum + pos.quantity * pos.avgCost, 0);
    const totalGain = totalValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    const concentration = new Map<string, number>();
    portfolio.forEach((pos) => {
      const percent = totalValue > 0 ? ((pos.quantity * pos.currentPrice) / totalValue) * 100 : 0;
      concentration.set(pos.symbol, percent);
    });

    return {
      totalValue,
      totalCost,
      totalGain,
      totalGainPercent,
      concentration,
    };
  }
}
