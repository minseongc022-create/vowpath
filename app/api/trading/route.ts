/**
 * API Routes for Trading Bot Dashboard
 * Real-time monitoring and control of the trading bot
 */

import { TradingBot } from '@/lib/trading-ai/trading-bot';
import type { NextRequest } from 'next/server';

let bot: TradingBot | null = null;

// GET /api/trading/status - Get bot status
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  if (action === 'status') {
    if (!bot) {
      return Response.json({
        status: 'stopped',
        isRunning: false,
        session: null,
      });
    }

    return Response.json({
      status: bot.isActive() ? 'running' : 'stopped',
      isRunning: bot.isActive(),
      session: bot.getSessionData(),
    });
  }

  if (action === 'positions') {
    if (!bot || !bot.isActive()) {
      return Response.json({ error: 'Bot not running' }, { status: 400 });
    }

    const session = bot.getSessionData();
    return Response.json({
      portfolio: session?.portfolio || [],
      totalValue: session?.totalValue || 0,
      totalGain: session?.totalGain || 0,
      totalGainPercent: session?.totalGainPercent || 0,
    });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}

// POST /api/trading/start - Start the bot
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, symbols, updateIntervalMinutes } = body;

  if (action === 'start') {
    if (bot && bot.isActive()) {
      return Response.json({ error: 'Bot already running' }, { status: 400 });
    }

    bot = new TradingBot({
      symbols: symbols || ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'],
      updateIntervalMinutes: updateIntervalMinutes || 60,
      tradingHoursOnly: true,
      maxOrdersPerDay: 20,
    });

    // Start bot in background
    bot.start().catch((error) => console.error('Bot error:', error));

    return Response.json({
      message: 'Bot started',
      status: 'running',
    });
  }

  if (action === 'stop') {
    if (!bot) {
      return Response.json({ error: 'Bot not running' }, { status: 400 });
    }

    await bot.stop();
    return Response.json({
      message: 'Bot stopped',
      status: 'stopped',
    });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}
