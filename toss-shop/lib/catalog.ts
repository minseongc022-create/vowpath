import type { CatalogProduct, KeywordAnalysis, KeywordSnapshot } from "./types";
import { SEED_CATALOG } from "./seed";
import { minuteKey } from "./format";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function gradeFromIntensity(intensity: number): KeywordAnalysis["competitionGrade"] {
  if (intensity < 0.5) return "excellent";
  if (intensity < 1) return "good";
  if (intensity < 2) return "fair";
  return "poor";
}

function buildTrend(base: number, seed: string, days = 30): number[] {
  const trend: number[] = [];
  for (let i = 0; i < days; i++) {
    const h = hashString(`${seed}:${i}`);
    const variance = ((h % 21) - 10) / 100;
    trend.push(Math.max(100, Math.round(base * (1 + variance))));
  }
  return trend;
}

export function getCatalogProducts(): CatalogProduct[] {
  return SEED_CATALOG.map((p) => ({ ...p }));
}

export function getProductById(id: string): CatalogProduct | null {
  return getCatalogProducts().find((p) => p.id === id) ?? null;
}

export function getProductsByCategory(category?: string): CatalogProduct[] {
  const all = getCatalogProducts();
  if (!category) return all.sort((a, b) => a.rank - b.rank);
  return all.filter((p) => p.category === category).sort((a, b) => a.rank - b.rank);
}

export function getProductsBySeller(sellerName: string): CatalogProduct[] {
  return getCatalogProducts().filter((p) => p.sellerName === sellerName);
}

export function simulatePriceUpdate(product: CatalogProduct): CatalogProduct {
  const variance = (hashString(product.id + minuteKey()) % 7) - 3;
  const priceDelta = Math.round(product.priceKrw * (variance / 100));
  const rankDelta = (hashString(minuteKey() + product.id) % 3) - 1;
  const newRank = Math.max(1, Math.min(20, product.rank + rankDelta));
  return {
    ...product,
    rankPrev: product.rank,
    rank: newRank,
    priceKrw: Math.max(1000, product.priceKrw + priceDelta),
    reviewCount: product.reviewCount + (hashString(product.id) % 5),
    updatedAt: new Date().toISOString(),
  };
}

export function analyzeKeyword(keyword: string, myProductId?: string): KeywordAnalysis {
  const h = hashString(keyword);
  const searchVolume = 500 + (h % 9500);
  const mobileRatio = 0.55 + (h % 35) / 100;
  const mobileSearchVolume = Math.round(searchVolume * mobileRatio);
  const pcSearchVolume = searchVolume - mobileSearchVolume;
  const competingProducts = 20 + (h % 480);
  const competitionIntensity =
    Math.round((competingProducts / Math.max(searchVolume, 1)) * 100) / 100;
  const all = getCatalogProducts();
  const related = all
    .filter((p) => p.name.includes(keyword) || keyword.includes(p.category))
    .slice(0, 8);
  const topProducts = (related.length >= 3 ? related : all.slice(0, 8))
    .map((p, i) => ({
      id: p.id,
      name: p.name,
      rank: i + 1,
      priceKrw: p.priceKrw,
      reviewCount: p.reviewCount,
      sellerName: p.sellerName,
    }))
    .sort((a, b) => a.rank - b.rank);

  const avgPriceKrw = Math.round(
    topProducts.reduce((s, p) => s + p.priceKrw, 0) / Math.max(topProducts.length, 1),
  );

  let difficulty: KeywordAnalysis["difficulty"] = "medium";
  if (competingProducts < 80 && searchVolume > 2000) difficulty = "easy";
  if (competingProducts > 300 || searchVolume < 800) difficulty = "hard";

  const suggestions = [
    `${keyword} 추천`,
    `${keyword} 최저가`,
    `${keyword} 1kg`,
    `${keyword} 선물`,
    `${keyword} 국내산`,
    `${keyword} 프리미엄`,
  ]
    .filter((s) => s !== keyword)
    .slice(0, 6)
    .map((s, i) => ({
      keyword: s,
      searchVolume: 200 + (hashString(s) % 8000),
      competitionIntensity: Math.round(((50 + i * 30) / Math.max(200, searchVolume)) * 100) / 100,
    }));

  const sixMonthSales = 100 + (h % 5000);
  const sixMonthRevenue = Math.round((sixMonthSales * avgPriceKrw) / 10000);

  return {
    keyword,
    difficulty,
    searchVolume,
    pcSearchVolume,
    mobileSearchVolume,
    mobileRatio: Math.round(mobileRatio * 100),
    competingProducts,
    competitionIntensity,
    competitionGrade: gradeFromIntensity(competitionIntensity),
    avgPriceKrw,
    sixMonthSales,
    sixMonthRevenue,
    realProductRatio: 55 + (h % 35),
    overseasProductRatio: 5 + (h % 20),
    topProducts,
    suggestions,
    trend: buildTrend(searchVolume, keyword),
    analyzedAt: new Date().toISOString(),
  };
}

export function buildKeywordSnapshot(keyword: string, myProductId?: string): KeywordSnapshot {
  const analysis = analyzeKeyword(keyword, myProductId);
  const myProduct = myProductId ? getProductById(myProductId) : null;
  return {
    keyword,
    date: minuteKey(),
    searchVolume: analysis.searchVolume,
    competingProducts: analysis.competingProducts,
    myRank: myProduct?.rank,
    topProductIds: analysis.topProducts.map((p) => p.id),
  };
}

export function parseProductUrlOrId(input: string): string | null {
  const trimmed = input.trim();
  if (/^p\d{3}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/product[=/](p\d{3})/i);
  return match?.[1] ?? null;
}
