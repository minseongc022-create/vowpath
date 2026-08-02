/**
 * Metrics Tracker
 * Track trading performance and metrics
 */

export interface DailyMetrics {
  date: string;
  tradesExecuted: number;
  winCount: number;
  lossCount: number;
  totalGain: number;
  totalLoss: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // %
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  maxDrawdown: number; // %
  profitFactor: number;
  sharpeRatio: number;
  avgTradeProfit: number;
  largestWin: number;
  largestLoss: number;
}

export class MetricsTracker {
  private trades: Array<{
    symbol: string;
    side: 'buy' | 'sell';
    price: number;
    quantity: number;
    exitPrice?: number;
    profit?: number;
    timestamp: Date;
  }> = [];

  private portfolioValues: Array<{ timestamp: Date; value: number }> = [];

  recordTrade(
    symbol: string,
    side: 'buy' | 'sell',
    price: number,
    quantity: number
  ): void {
    this.trades.push({
      symbol,
      side,
      price,
      quantity,
      timestamp: new Date(),
    });
  }

  closeTrade(index: number, exitPrice: number): void {
    if (index < this.trades.length) {
      const trade = this.trades[index];
      const profitLoss = (exitPrice - trade.price) * trade.quantity;
      trade.exitPrice = exitPrice;
      trade.profit = profitLoss;
    }
  }

  recordPortfolioValue(value: number): void {
    this.portfolioValues.push({
      timestamp: new Date(),
      value,
    });
  }

  getPerformanceMetrics(): PerformanceMetrics {
    const closedTrades = this.trades.filter((t) => t.profit !== undefined);
    const winningTrades = closedTrades.filter((t) => (t.profit || 0) > 0);
    const losingTrades = closedTrades.filter((t) => (t.profit || 0) < 0);

    const totalProfit = winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalLoss = Math.abs(
      losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0)
    );
    const netProfit = totalProfit - totalLoss;

    const winRate =
      closedTrades.length > 0
        ? (winningTrades.length / closedTrades.length) * 100
        : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;
    const avgTradeProfit =
      closedTrades.length > 0
        ? closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0) /
          closedTrades.length
        : 0;

    const largestWin = winningTrades.length
      ? Math.max(...winningTrades.map((t) => t.profit || 0))
      : 0;
    const largestLoss = losingTrades.length
      ? Math.min(...losingTrades.map((t) => t.profit || 0))
      : 0;

    // Calculate drawdown
    let maxDrawdown = 0;
    if (this.portfolioValues.length > 1) {
      let peak = this.portfolioValues[0].value;
      for (const pv of this.portfolioValues) {
        if (pv.value > peak) {
          peak = pv.value;
        }
        const drawdown = ((peak - pv.value) / peak) * 100;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }

    // Calculate Sharpe Ratio (simplified)
    let sharpeRatio = 0;
    if (this.portfolioValues.length > 1) {
      const returns: number[] = [];
      for (let i = 1; i < this.portfolioValues.length; i++) {
        const ret =
          (this.portfolioValues[i].value - this.portfolioValues[i - 1].value) /
          this.portfolioValues[i - 1].value;
        returns.push(ret);
      }

      if (returns.length > 0) {
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance =
          returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
          returns.length;
        const stdDev = Math.sqrt(variance);
        sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
      }
    }

    return {
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalProfit,
      totalLoss,
      netProfit,
      maxDrawdown,
      profitFactor,
      sharpeRatio,
      avgTradeProfit,
      largestWin,
      largestLoss,
    };
  }

  getDailyMetrics(date: Date = new Date()): DailyMetrics {
    const dateStr = date.toISOString().split('T')[0];
    const dayTrades = this.trades.filter(
      (t) => t.timestamp.toISOString().split('T')[0] === dateStr
    );

    const closedDayTrades = dayTrades.filter((t) => t.profit !== undefined);
    const winCount = closedDayTrades.filter((t) => (t.profit || 0) > 0).length;
    const lossCount = closedDayTrades.filter((t) => (t.profit || 0) < 0).length;

    const totalGain = closedDayTrades
      .filter((t) => (t.profit || 0) > 0)
      .reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalLoss = Math.abs(
      closedDayTrades
        .filter((t) => (t.profit || 0) < 0)
        .reduce((sum, t) => sum + (t.profit || 0), 0)
    );

    const winRate =
      closedDayTrades.length > 0
        ? (winCount / closedDayTrades.length) * 100
        : 0;
    const avgProfit =
      winCount > 0
        ? closedDayTrades
            .filter((t) => (t.profit || 0) > 0)
            .reduce((sum, t) => sum + (t.profit || 0), 0) / winCount
        : 0;
    const avgLoss =
      lossCount > 0
        ? totalLoss / lossCount
        : 0;
    const profitFactor = totalLoss > 0 ? totalGain / totalLoss : 0;

    return {
      date: dateStr,
      tradesExecuted: dayTrades.length,
      winCount,
      lossCount,
      totalGain,
      totalLoss,
      winRate,
      avgProfit,
      avgLoss,
      profitFactor,
    };
  }
}
