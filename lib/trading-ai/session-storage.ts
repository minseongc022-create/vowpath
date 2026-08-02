/**
 * Database/Cache utilities for storing trading data
 * Uses Vercel KV for persistent storage
 */

import { kv } from '@vercel/kv';
import type { TradingSession, MarketSignal, TradeExecution } from './types';

export class SessionStorage {
  async saveTradingSession(session: TradingSession): Promise<void> {
    await kv.set(
      `trading:session:${session.sessionId}`,
      JSON.stringify(session),
      { ex: 86400 * 7 } // 7 days expiry
    );
  }

  async getTradingSession(sessionId: string): Promise<TradingSession | null> {
    const data = await kv.get(`trading:session:${sessionId}`);
    if (!data) return null;
    return JSON.parse(data as string) as TradingSession;
  }

  async recordSignal(signal: MarketSignal): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await kv.lpush(
      `trading:signals:${today}`,
      JSON.stringify(signal)
    );
  }

  async recordExecution(execution: TradeExecution): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await kv.lpush(
      `trading:executions:${today}`,
      JSON.stringify(execution)
    );
  }

  async getSignalsForDay(date: Date = new Date()): Promise<MarketSignal[]> {
    const dateStr = date.toISOString().split('T')[0];
    const signals = await kv.lrange(`trading:signals:${dateStr}`, 0, -1);
    return signals.map((s) => JSON.parse(s as string)) as MarketSignal[];
  }

  async getExecutionsForDay(
    date: Date = new Date()
  ): Promise<TradeExecution[]> {
    const dateStr = date.toISOString().split('T')[0];
    const executions = await kv.lrange(
      `trading:executions:${dateStr}`,
      0,
      -1
    );
    return executions.map((e) => JSON.parse(e as string)) as TradeExecution[];
  }
}

export const sessionStorage = new SessionStorage();
