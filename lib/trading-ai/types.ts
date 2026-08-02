/**
 * Trading AI System Types
 * Auto stock investment with news analysis and AI signals
 */

export interface MarketSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-1
  price: number;
  reason: string;
  timestamp: Date;
  newsScores: NewsScore[];
  technicalIndicators: TechnicalIndicators;
}

export interface NewsScore {
  title: string;
  source: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number; // -1 to 1
  url: string;
  publishedAt: Date;
}

export interface TechnicalIndicators {
  rsi: number; // 0-100
  macd: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  movingAverage: {
    ma20: number;
    ma50: number;
    ma200: number;
  };
}

export interface TradeExecution {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  executedAt: Date;
  reason: string;
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercent: number;
}

export interface TradingSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  signals: MarketSignal[];
  executions: TradeExecution[];
  portfolio: PortfolioPosition[];
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  status: 'active' | 'completed' | 'paused';
}

export interface AIAnalysisInput {
  symbol: string;
  currentPrice: number;
  priceHistory: number[]; // Last 200 closing prices
  news: NewsScore[];
  technicalData: TechnicalIndicators;
  portfolio: PortfolioPosition[];
}
