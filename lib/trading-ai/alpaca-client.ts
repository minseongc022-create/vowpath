/**
 * Alpaca API Client Integration
 * Handles market data, account info, and trade execution
 */

import type { MarketSignal, TradeExecution, PortfolioPosition } from './types';

const ALPACA_API_BASE = process.env.ALPACA_API_BASE || 'https://api.alpaca.markets';
const ALPACA_DATA_BASE = process.env.ALPACA_DATA_BASE || 'https://data.alpaca.markets';

export class AlpacaClient {
  private apiKey: string;
  private secretKey: string;
  private baseURL: string;
  private dataURL: string;

  constructor(apiKey?: string, secretKey?: string) {
    this.apiKey = apiKey || process.env.APCA_API_KEY_ID || '';
    this.secretKey = secretKey || process.env.APCA_API_SECRET_KEY || '';
    this.baseURL = ALPACA_API_BASE;
    this.dataURL = ALPACA_DATA_BASE;

    if (!this.apiKey || !this.secretKey) {
      throw new Error('Alpaca API credentials not found in environment');
    }
  }

  private headers() {
    return {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.secretKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get current account information
   */
  async getAccount() {
    const response = await fetch(`${this.baseURL}/v2/account`, {
      method: 'GET',
      headers: this.headers(),
    });

    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get current portfolio positions
   */
  async getPositions(): Promise<PortfolioPosition[]> {
    const response = await fetch(`${this.baseURL}/v2/positions`, {
      method: 'GET',
      headers: this.headers(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get positions: ${response.statusText}`);
    }

    const positions = await response.json();
    return positions.map((pos: any) => ({
      symbol: pos.symbol,
      quantity: parseFloat(pos.qty),
      avgCost: parseFloat(pos.avg_fill_price),
      currentPrice: parseFloat(pos.current_price),
      profitLoss: parseFloat(pos.unrealized_pl),
      profitLossPercent: parseFloat(pos.unrealized_plpc) * 100,
    }));
  }

  /**
   * Get latest price for a symbol
   */
  async getLatestPrice(symbol: string): Promise<number> {
    const response = await fetch(
      `${this.dataURL}/v2/stocks/${symbol}/quotes/latest`,
      {
        method: 'GET',
        headers: this.headers(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get price for ${symbol}`);
    }

    const data = await response.json();
    return parseFloat(data.quote.ap); // ask price
  }

  /**
   * Get historical price data
   */
  async getPriceHistory(
    symbol: string,
    timeframe: '1Min' | '5Min' | '15Min' | '1H' | '1D' = '1D',
    limit: number = 200
  ): Promise<number[]> {
    const response = await fetch(
      `${this.dataURL}/v2/stocks/${symbol}/bars?timeframe=${timeframe}&limit=${limit}`,
      {
        method: 'GET',
        headers: this.headers(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get price history for ${symbol}`);
    }

    const data = await response.json();
    return (data.bars || []).map((bar: any) => parseFloat(bar.c)); // closing prices
  }

  /**
   * Place a market buy order
   */
  async placeBuyOrder(
    symbol: string,
    quantity: number,
    reason: string
  ): Promise<TradeExecution> {
    const orderData = {
      symbol,
      qty: quantity,
      side: 'buy',
      type: 'market',
      time_in_force: 'day',
      client_order_id: `buy-${symbol}-${Date.now()}`,
    };

    const response = await fetch(`${this.baseURL}/v2/orders`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to place buy order: ${error}`);
    }

    const order = await response.json();
    const price = await this.getLatestPrice(symbol);

    return {
      orderId: order.id,
      symbol,
      side: 'buy',
      quantity,
      price,
      status: order.status as any,
      executedAt: new Date(),
      reason,
    };
  }

  /**
   * Place a market sell order
   */
  async placeSellOrder(
    symbol: string,
    quantity: number,
    reason: string
  ): Promise<TradeExecution> {
    const orderData = {
      symbol,
      qty: quantity,
      side: 'sell',
      type: 'market',
      time_in_force: 'day',
      client_order_id: `sell-${symbol}-${Date.now()}`,
    };

    const response = await fetch(`${this.baseURL}/v2/orders`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to place sell order: ${error}`);
    }

    const order = await response.json();
    const price = await this.getLatestPrice(symbol);

    return {
      orderId: order.id,
      symbol,
      side: 'sell',
      quantity,
      price,
      status: order.status as any,
      executedAt: new Date(),
      reason,
    };
  }

  /**
   * Cancel an open order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    const response = await fetch(`${this.baseURL}/v2/orders/${orderId}`, {
      method: 'DELETE',
      headers: this.headers(),
    });

    return response.ok;
  }
}
