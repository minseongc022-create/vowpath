/**
 * News and Data Collector
 * Collects market news from multiple sources
 */

import type { NewsScore } from './types';

interface RawNewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  content?: string;
}

export class NewsCollector {
  private finnhubApiKey: string;
  private newsApiKey: string;
  private alphaVantageKey: string;

  constructor() {
    this.finnhubApiKey = process.env.FINNHUB_API_KEY || '';
    this.newsApiKey = process.env.NEWS_API_KEY || '';
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY || '';
  }

  /**
   * Collect news from Finnhub
   */
  private async collectFromFinnhub(symbol: string): Promise<RawNewsItem[]> {
    if (!this.finnhubApiKey) return [];

    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${symbol}&min=2024-01-01&token=${this.finnhubApiKey}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      return (data || []).slice(0, 20).map((item: any) => ({
        title: item.headline || '',
        url: item.url || '',
        source: 'Finnhub',
        publishedAt: new Date(item.datetime * 1000).toISOString(),
        content: item.summary || '',
      }));
    } catch (error) {
      console.error('Finnhub news collection error:', error);
      return [];
    }
  }

  /**
   * Collect news from NewsAPI
   */
  private async collectFromNewsAPI(symbol: string): Promise<RawNewsItem[]> {
    if (!this.newsApiKey) return [];

    try {
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${symbol}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${this.newsApiKey}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      return (data.articles || []).map((article: any) => ({
        title: article.title || '',
        url: article.url || '',
        source: article.source?.name || 'NewsAPI',
        publishedAt: article.publishedAt || new Date().toISOString(),
        content: article.description || '',
      }));
    } catch (error) {
      console.error('NewsAPI collection error:', error);
      return [];
    }
  }

  /**
   * Analyze sentiment using OpenAI
   */
  private async analyzeSentiment(text: string): Promise<{
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    score: number;
  }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { sentiment: 'NEUTRAL', score: 0 };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are a financial sentiment analyzer. Analyze the given text and respond with only a JSON object: {"sentiment": "POSITIVE"|"NEGATIVE"|"NEUTRAL", "score": -1 to 1}',
            },
            {
              role: 'user',
              content: `Analyze this financial news: ${text.substring(0, 500)}`,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        return { sentiment: 'NEUTRAL', score: 0 };
      }

      const data = await response.json();
      const result = JSON.parse(
        data.choices[0].message.content || '{"sentiment": "NEUTRAL", "score": 0}'
      );

      return {
        sentiment: result.sentiment || 'NEUTRAL',
        score: result.score || 0,
      };
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return { sentiment: 'NEUTRAL', score: 0 };
    }
  }

  /**
   * Collect and analyze news for a symbol
   */
  async collectNewsForSymbol(symbol: string): Promise<NewsScore[]> {
    console.log(`[NEWS] Collecting news for ${symbol}...`);

    // Collect from multiple sources
    const [finnhubNews, newsAPINews] = await Promise.all([
      this.collectFromFinnhub(symbol),
      this.collectFromNewsAPI(symbol),
    ]);

    const allNews = [...finnhubNews, ...newsAPINews];
    const uniqueNews = Array.from(
      new Map(allNews.map((item) => [item.url, item])).values()
    );

    // Analyze sentiment for each news item
    const newsScores: NewsScore[] = [];
    for (const news of uniqueNews.slice(0, 10)) {
      const sentiment = await this.analyzeSentiment(
        `${news.title} ${news.content}`
      );

      newsScores.push({
        title: news.title,
        source: news.source,
        sentiment: sentiment.sentiment,
        score: sentiment.score,
        url: news.url,
        publishedAt: new Date(news.publishedAt),
      });

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return newsScores;
  }

  /**
   * Get aggregated sentiment score
   */
  getAggregatedSentiment(newsScores: NewsScore[]): number {
    if (newsScores.length === 0) return 0;
    const avgScore = newsScores.reduce((sum, news) => sum + news.score, 0) / newsScores.length;
    return Math.max(-1, Math.min(1, avgScore));
  }
}
