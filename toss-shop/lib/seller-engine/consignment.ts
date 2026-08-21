import { getDiscoveryKeywords } from "../discovery";
import { analyzeKeyword } from "../catalog";
import { CONSIGNMENT_DAILY_PICKS } from "../billing";
import type { CatalogProduct, ConsignmentPick, TossShopCategory } from "../types";
import {
  autoMatchPrice,
  competitorsForProduct,
  estimatePlatformFees,
  estimateSupplierCost,
  marginPct,
} from "./pricing";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function scoreProduct(
  product: CatalogProduct,
  keyword: string,
  analysis: ReturnType<typeof analyzeKeyword>,
): number {
  const h = hashString(product.id + keyword);
  const volumeScore = Math.min(analysis.searchVolume / 5000, 1) * 40;
  const compScore = Math.max(0, (2 - analysis.competitionIntensity) * 25);
  const reviewScore = Math.min(product.reviewCount / 2000, 1) * 15;
  const rankScore = Math.max(0, (15 - product.rank) / 15) * 10;
  const noise = (h % 10);
  return volumeScore + compScore + reviewScore + rankScore + noise;
}

export function generateConsignmentPicks(
  catalog: CatalogProduct[],
  dateKey: string,
): ConsignmentPick[] {
  const keywords = getDiscoveryKeywords()
    .filter((k) => k.competitionGrade === "excellent" || k.competitionGrade === "good")
    .sort((a, b) => a.competitionIntensity - b.competitionIntensity)
    .slice(0, 30);

  const picks: ConsignmentPick[] = [];
  const usedProducts = new Set<string>();

  for (const kw of keywords) {
    if (picks.length >= CONSIGNMENT_DAILY_PICKS) break;
    const analysis = analyzeKeyword(kw.keyword);
    const candidates = catalog
      .filter((p) => p.category === kw.category || p.name.includes(kw.keyword.slice(0, 2)))
      .map((p) => ({ product: p, score: scoreProduct(p, kw.keyword, analysis) }))
      .sort((a, b) => b.score - a.score);

    for (const { product } of candidates) {
      if (usedProducts.has(product.id)) continue;
      usedProducts.add(product.id);

      const competitors = competitorsForProduct(product, catalog);
      const supplierCost = estimateSupplierCost(product.priceKrw, product.category);
      const { priceKrw, strategy } = autoMatchPrice(supplierCost, competitors);
      const margin = marginPct(supplierCost, priceKrw);
      const fees = estimatePlatformFees(priceKrw);
      const profitPerUnit = priceKrw - supplierCost - fees;
      const dailyUnits = Math.max(1, Math.round(kw.searchVolume / 800));

      picks.push({
        id: `cs_${dateKey}_${product.id}`,
        keyword: kw.keyword,
        productName: product.name,
        category: product.category as TossShopCategory,
        supplierCostKrw: supplierCost,
        recommendedPriceKrw: priceKrw,
        competitorPrices: competitors.slice(0, 5),
        searchVolume: kw.searchVolume,
        competitionIntensity: kw.competitionIntensity,
        estimatedMarginPct: margin,
        estimatedDailyProfitKrw: profitPerUnit * dailyUnits,
        confidenceScore: Math.min(98, Math.round(55 + margin + kw.searchVolume / 500)),
        reason: `${strategy} · 검색 ${kw.searchVolume.toLocaleString()} · 경쟁강도 ${kw.competitionIntensity}`,
      });
      break;
    }
  }

  while (picks.length < CONSIGNMENT_DAILY_PICKS && catalog.length > picks.length) {
    const product = catalog[picks.length % catalog.length];
    if (usedProducts.has(product.id)) continue;
    usedProducts.add(product.id);
    const kw = keywords[picks.length % keywords.length]?.keyword ?? "인기상품";
    const competitors = competitorsForProduct(product, catalog);
    const supplierCost = estimateSupplierCost(product.priceKrw, product.category);
    const { priceKrw, strategy } = autoMatchPrice(supplierCost, competitors);
    picks.push({
      id: `cs_${dateKey}_${product.id}`,
      keyword: kw,
      productName: product.name,
      category: product.category,
      supplierCostKrw: supplierCost,
      recommendedPriceKrw: priceKrw,
      competitorPrices: competitors.slice(0, 5),
      searchVolume: 1000 + hashString(product.id) % 5000,
      competitionIntensity: 0.8,
      estimatedMarginPct: marginPct(supplierCost, priceKrw),
      estimatedDailyProfitKrw: Math.round((priceKrw - supplierCost) * 0.15),
      confidenceScore: 72,
      reason: strategy,
    });
  }

  return picks.slice(0, CONSIGNMENT_DAILY_PICKS);
}
