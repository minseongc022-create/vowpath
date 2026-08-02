/**
 * Main Trading Bot Orchestrator
 * Coordinates all components for 24/7 automated trading
 */

import { AlpacaClient } from './alpaca-client';
import { NewsCollector } from './news-collector';
import { TechnicalAnalyzer } from './technical-analyzer';
import { AIAnalysisEngine } from './ai-engine';
import { RiskManager, DEFAULT_RISK_CONFIG } from './risk-manager';
import type { TradeExecution, TradingSession, MarketSignal } from './types';

export interface BotConfig {
  symbols: string[];
  updateIntervalMinutes?: number;
  tradingHoursOnly?: boolean;
  maxOrdersPerDay?: number;
}

export class TradingBot {
  private alpaca: AlpacaClient;
  private newsCollector: NewsCollector;
  private aiEngine: AIAnalysisEngine;
  private riskManager: RiskManager;
  private config: BotConfig;
  private session: TradingSession | null = null;
  private isRunning = false;
  private ordersToday = 0;
  private lastTradeTime = 0;

  constructor(config: BotConfig) {
    this.config = {
      updateIntervalMinutes: 60,
      tradingHoursOnly: true,
      maxOrdersPerDay: 20,
      ...config,
    };

    this.alpaca = new AlpacaClient();
    this.newsCollector = new NewsCollector();
    this.aiEngine = new AIAnalysisEngine();
    this.riskManager = new RiskManager(DEFAULT_RISK_CONFIG);
  }

  /**
   * Start the trading bot
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[BOT] Already running');
      return;
    }

    console.log('[BOT] Starting Trading Bot...');
    this.isRunning = true;

    // Initialize session
    this.session = {
      sessionId: `session-${Date.now()}`,
      startTime: new Date(),
      signals: [],
      executions: [],
      portfolio: [],
      totalValue: 0,
      totalGain: 0,
      totalGainPercent: 0,
      status: 'active',
    };

    // Main trading loop
    while (this.isRunning) {
      try {
        await this.executeTradeRound();
      } catch (error) {
        console.error('[BOT] Error in trade round:', error);
      }

      // Wait for next update interval
      const waitTime = (this.config.updateIntervalMinutes || 60) * 60 * 1000;
      console.log(`[BOT] Next update in ${this.config.updateIntervalMinutes} minutes...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Stop the trading bot
   */
  async stop(): Promise<void> {
    console.log('[BOT] Stopping Trading Bot...');
    this.isRunning = false;

    if (this.session) {
      this.session.status = 'completed';
      this.session.endTime = new Date();
      console.log('[BOT] Session saved:', this.session.sessionId);
    }
  }

  /**
   * Execute a single trade round
   */
  private async executeTradeRound(): Promise<void> {
    console.log('[ROUND] Starting trade round...');

    // Check trading hours if configured
    if (this.config.tradingHoursOnly && !this.isMarketOpen()) {
      console.log('[ROUND] Market closed, skipping round');
      return;
    }

    // Check daily order limit
    if (this.ordersToday >= (this.config.maxOrdersPerDay || 20)) {
      console.log('[ROUND] Max orders for today reached');
      return;
    }

    try {
      // Get account info
      const account = await this.alpaca.getAccount();
      const portfolio = await this.alpaca.getPositions();

      if (!this.session) return;
      this.session.portfolio = portfolio;
      this.session.totalValue = parseFloat(account.portfolio_value);

      // Analyze each symbol
      for (const symbol of this.config.symbols) {
        try {
          const signal = await this.analyzeSymbol(symbol);
          this.session.signals.push(signal);

          // Execute trade if signal suggests action
          if (this.ordersToday < (this.config.maxOrdersPerDay || 20)) {
            const execution = await this.executeTrade(signal, this.session.totalValue);
            if (execution) {
              this.session.executions.push(execution);
              this.ordersToday++;
            }
          }
        } catch (error) {
          console.error(`[ROUND] Error analyzing ${symbol}:`, error);
        }
      }

      // Check existing positions for stop loss / take profit
      await this.manageProfitsAndLosses(portfolio);

      console.log(
        `[ROUND] Complete - Signals: ${this.session.signals.length}, Executions: ${this.session.executions.length}`
      );
    } catch (error) {
      console.error('[ROUND] Fatal error:', error);
    }
  }

  /**
   * Analyze a single symbol
   */
  private async analyzeSymbol(symbol: string): Promise<MarketSignal> {
    console.log(`[ANALYZE] ${symbol}...`);

    // Collect data
    const [currentPrice, priceHistory, news, portfolio] = await Promise.all([
      this.alpaca.getLatestPrice(symbol),
      this.alpaca.getPriceHistory(symbol, '1D', 200),
      this.newsCollector.collectNewsForSymbol(symbol),
      this.alpaca.getPositions(),
    ]);

    // Technical analysis
    const technicalData = TechnicalAnalyzer.analyze(priceHistory);

    // AI analysis
    const signal = await this.aiEngine.generateSignal({
      symbol,
      currentPrice,
      priceHistory,
      news,
      technicalData,
      portfolio,
    });

    console.log(`[ANALYZE] ${symbol} -> ${signal.action} (confidence: ${signal.confidence.toFixed(2)})`);
    return signal;
  }

  /**
   * Execute a trade based on signal
   */
  private async executeTrade(signal: MarketSignal, accountValue: number): Promise<TradeExecution | null> {
    // Check if trade is allowed
    const portfolio = await this.alpaca.getPositions();
    const canTrade = this.riskManager.canOpenPosition(signal, portfolio, accountValue);

    if (!canTrade.allowed) {
      console.log(`[TRADE] ${signal.symbol} blocked: ${canTrade.reason}`);
      return null;
    }

    // Rate limiting between trades
    const timeSinceLastTrade = Date.now() - this.lastTradeTime;
    if (timeSinceLastTrade < 5000) {
      await new Promise((resolve) => setTimeout(resolve, 5000 - timeSinceLastTrade));
    }

    try {
      let execution: TradeExecution;

      if (signal.action === 'BUY' && signal.confidence > 0.5) {
        const quantity = this.riskManager.calculatePositionSize(
          accountValue,
          signal,
          signal.price
        );
        execution = await this.alpaca.placeBuyOrder(
          signal.symbol,
          quantity,
          signal.reason
        );
        console.log(`[TRADE] BUY ${quantity} ${signal.symbol} @ $${signal.price}`);
      } else if (signal.action === 'SELL' && signal.confidence > 0.5) {
        const position = portfolio.find((p) => p.symbol === signal.symbol);
        if (position) {
          execution = await this.alpaca.placeSellOrder(
            signal.symbol,
            position.quantity,
            signal.reason
          );
          console.log(`[TRADE] SELL ${position.quantity} ${signal.symbol} @ $${signal.price}`);
        } else {
          return null;
        }
      } else {
        return null;
      }

      this.lastTradeTime = Date.now();
      return execution;
    } catch (error) {
      console.error(`[TRADE] Error executing ${signal.symbol}:`, error);
      return null;
    }
  }

  /**
   * Manage stop losses and take profits
   */
  private async manageProfitsAndLosses(portfolio: any[]): Promise<void> {
    for (const position of portfolio) {
      const closeSignal = this.riskManager.shouldClosePosition(position);

      if (closeSignal.shouldClose) {
        try {
          await this.alpaca.placeSellOrder(position.symbol, position.quantity, closeSignal.reason || 'Stop loss/profit');
          console.log(`[PNL] Closed ${position.symbol}: ${closeSignal.reason}`);
        } catch (error) {
          console.error(`[PNL] Error closing ${position.symbol}:`, error);
        }
      }
    }
  }

  /**
   * Check if market is currently open (9:30 AM - 4:00 PM ET, Mon-Fri)
   */
  private isMarketOpen(): boolean {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const day = now.getDay();

    // Market hours: 9:30 - 16:00 ET (14:30 - 21:00 UTC in winter, 13:30 - 20:00 UTC in summer)
    // Simplified: just check business hours
    if (day === 0 || day === 6) return false; // Weekend
    if (hours < 9 || hours > 16) return false;
    if (hours === 9 && minutes < 30) return false;

    return true;
  }

  /**
   * Get current session data
   */
  getSessionData(): TradingSession | null {
    return this.session;
  }

  /**
   * Check if bot is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
