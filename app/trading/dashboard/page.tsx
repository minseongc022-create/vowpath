/**
 * Trading Dashboard Page
 */

'use client';

import { useEffect, useState } from 'react';
import type { TradingSession, MarketSignal } from '@/lib/trading-ai/types';

interface BotStatus {
  status: 'running' | 'stopped';
  isRunning: boolean;
  session: TradingSession | null;
}

export default function TradingDashboard() {
  const [botStatus, setBotStatus] = useState<BotStatus>({
    status: 'stopped',
    isRunning: false,
    session: null,
  });
  const [loading, setLoading] = useState(false);
  const [updateInterval, setUpdateInterval] = useState(60);
  const [symbols, setSymbols] = useState('AAPL,GOOGL,MSFT,TSLA,AMZN');

  // Fetch bot status periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/trading?action=status');
        const data = await res.json();
        setBotStatus(data);
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const startBot = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          symbols: symbols.split(',').map((s) => s.trim()),
          updateIntervalMinutes: updateInterval,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Bot started successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Error starting bot: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const stopBot = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Bot stopped successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Error stopping bot: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Trading Bot Dashboard</h1>
          <p className="text-slate-400">AI-Powered Automated Stock Trading System</p>
        </div>

        {/* Status Card */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Bot Status</h2>
            <div
              className={`w-4 h-4 rounded-full ${
                botStatus.isRunning ? 'bg-green-500' : 'bg-red-500'
              } animate-pulse`}
            />
          </div>
          <p className="text-slate-300">
            Status: <span className="font-semibold">{botStatus.status.toUpperCase()}</span>
          </p>
          {botStatus.session && (
            <>
              <p className="text-slate-300 mt-2">
                Session ID: <span className="font-mono text-sm">{botStatus.session.sessionId}</span>
              </p>
              <p className="text-slate-300">
                Signals Analyzed: <span className="font-semibold">{botStatus.session.signals.length}</span>
              </p>
              <p className="text-slate-300">
                Trades Executed: <span className="font-semibold">{botStatus.session.executions.length}</span>
              </p>
              <p className="text-slate-300">
                Portfolio Value: <span className="font-semibold">${botStatus.session.totalValue.toFixed(2)}</span>
              </p>
              <p className={`text-slate-300 ${
                botStatus.session.totalGainPercent >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                Total Gain: <span className="font-semibold">{botStatus.session.totalGainPercent.toFixed(2)}%</span>
              </p>
            </>
          )}
        </div>

        {/* Control Panel */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Control Panel</h2>
          <div className="space-y-4">
            {/* Symbols Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Trading Symbols (comma-separated)</label>
              <input
                type="text"
                value={symbols}
                onChange={(e) => setSymbols(e.target.value)}
                disabled={botStatus.isRunning}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white disabled:opacity-50"
                placeholder="AAPL,GOOGL,MSFT,TSLA,AMZN"
              />
            </div>

            {/* Update Interval */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Update Interval (minutes)</label>
              <input
                type="number"
                value={updateInterval}
                onChange={(e) => setUpdateInterval(parseInt(e.target.value))}
                disabled={botStatus.isRunning}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white disabled:opacity-50"
                min="1"
                max="1440"
              />
            </div>

            {/* Control Buttons */}
            <div className="flex gap-4">
              <button
                onClick={startBot}
                disabled={botStatus.isRunning || loading}
                className="flex-1 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Starting...' : 'Start Bot'}
              </button>
              <button
                onClick={stopBot}
                disabled={!botStatus.isRunning || loading}
                className="flex-1 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Stopping...' : 'Stop Bot'}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Signals */}
        {botStatus.session && botStatus.session.signals.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Trading Signals</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {botStatus.session.signals.slice(-10).reverse().map((signal: MarketSignal, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    signal.action === 'BUY'
                      ? 'bg-green-900 border-green-700'
                      : signal.action === 'SELL'
                      ? 'bg-red-900 border-red-700'
                      : 'bg-slate-700 border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-white">
                        {signal.symbol} - {signal.action}
                      </p>
                      <p className="text-sm text-slate-300">{signal.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">${signal.price.toFixed(2)}</p>
                      <p className="text-sm text-slate-300">Confidence: {(signal.confidence * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
