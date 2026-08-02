/**
 * AI Analysis Engine using OpenAI
 * Generates trading signals based on news, technical analysis, and market conditions
 */

import type { AIAnalysisInput, MarketSignal } from './types';

export class AIAnalysisEngine {
  private openaiApiKey: string;
  private model: string = 'gpt-4-turbo';

  constructor(apiKey?: string) {
    this.openaiApiKey = apiKey || process.env.OPENAI_API_KEY || '';
    if (!this.openaiApiKey) {
      console.warn('OpenAI API key not configured');
    }
  }

  /**
   * Generate trading signal using AI analysis
   */
  async generateSignal(input: AIAnalysisInput): Promise<MarketSignal> {
    const prompt = this.buildAnalysisPrompt(input);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are an expert financial analyst. Analyze the provided market data and respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": 0.0 to 1.0,
  "reason": "brief explanation",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH"
}`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.5,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{"action": "HOLD", "confidence": 0, "reason": "Analysis failed"}';
      
      // Parse JSON from response (remove markdown if present)
      let jsonStr = content.replace(/```json\n?|```\n?/g, '').trim();
      const analysis = JSON.parse(jsonStr);

      return {
        symbol: input.symbol,
        action: analysis.action || 'HOLD',
        confidence: Math.min(1, Math.max(0, analysis.confidence || 0.5)),
        price: input.currentPrice,
        reason: analysis.reason || 'AI analysis complete',
        timestamp: new Date(),
        newsScores: input.news,
        technicalIndicators: input.technicalData,
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      // Fallback to HOLD
      return {
        symbol: input.symbol,
        action: 'HOLD',
        confidence: 0.3,
        price: input.currentPrice,
        reason: 'AI analysis failed, defaulting to HOLD',
        timestamp: new Date(),
        newsScores: input.news,
        technicalIndicators: input.technicalData,
      };
    }
  }

  /**
   * Build comprehensive analysis prompt
   */
  private buildAnalysisPrompt(input: AIAnalysisInput): string {
    const technicalSummary = `
Technical Indicators:
- RSI: ${input.technicalData.rsi} (Overbought: >70, Oversold: <30)
- MACD: ${input.technicalData.macd.toFixed(4)}
- Bollinger Bands: Upper=${input.technicalData.bollingerBands.upper.toFixed(2)}, Middle=${input.technicalData.bollingerBands.middle.toFixed(2)}, Lower=${input.technicalData.bollingerBands.lower.toFixed(2)}
- MA20: ${input.technicalData.movingAverage.ma20.toFixed(2)}
- MA50: ${input.technicalData.movingAverage.ma50.toFixed(2)}
- MA200: ${input.technicalData.movingAverage.ma200.toFixed(2)}
- Current Price: $${input.currentPrice.toFixed(2)}`;

    const newsSummary = input.news.slice(0, 5).map((news) => `- ${news.title} (${news.sentiment}: ${news.score.toFixed(2)})`).join('\n');

    const portfolioSummary = input.portfolio
      .map(
        (pos) => `- ${pos.symbol}: ${pos.quantity} shares @ ${pos.avgCost.toFixed(2)}, Current: $${pos.currentPrice.toFixed(2)}, P&L: ${pos.profitLossPercent.toFixed(2)}%`
      )
      .join('\n');

    return `Analyze ${input.symbol} for trading signal.

${technicalSummary}

Recent News (Sentiment Analysis):
${newsSummary || 'No recent news'}

Current Portfolio:
${portfolioSummary || 'No positions'}

Provide a trading signal (BUY/SELL/HOLD) with confidence level (0-1) and reasoning. Consider all factors: technical analysis, market sentiment, and portfolio diversification.`;
  }

  /**
   * Batch analyze multiple symbols
   */
  async analyzePortfolio(inputs: AIAnalysisInput[]): Promise<MarketSignal[]> {
    const signals = await Promise.all(inputs.map((input) => this.generateSignal(input)));
    return signals;
  }
}
