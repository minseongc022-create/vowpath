import type { CatalogProduct, ImportPick, MarketKeywordMetrics, TossShopCategory } from "../types";
import { competitorsForProduct, marginPct } from "./pricing";
import {
  assessRisks,
  buildActionSteps,
  buildKeywordIntel,
  buildPricingBreakdown,
  enrichCompetitors,
  marketContext,
  rankKeywordsForSourcing,
  scoreOpportunity,
} from "./intelligence";

const USD_KRW = 1380;
const IMPORT_CATEGORIES: TossShopCategory[] = ["digital", "home", "beauty", "fashion", "health"];
const SOURCE_COUNTRIES = ["중국", "베트남", "일본", "미국"] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function landedCostBreakdown(sourceUsd: number, weightKg = 0.5) {
  const productKrw = Math.round(sourceUsd * USD_KRW);
  const shippingKrw = Math.round(weightKg * 4500 + 3500);
  const dutyKrw = Math.round(productKrw * 0.08);
  return {
    productKrw,
    shippingKrw,
    dutyKrw,
    total: productKrw + shippingKrw + dutyKrw,
  };
}

function suggestedImportName(keyword: string, seed: string): string {
  return `${keyword} 프리미엄 ${seed}`.slice(0, 40);
}

export function generateImportPicks(
  catalog: CatalogProduct[],
  dateKey: string,
  marketKeywords?: Record<string, MarketKeywordMetrics>,
): ImportPick[] {
  const ctx = marketContext(catalog, marketKeywords);
  const keywords = rankKeywordsForSourcing(catalog, marketKeywords, 40).filter((k) =>
    IMPORT_CATEGORIES.includes(k.category),
  );

  const picks: ImportPick[] = [];

  for (let i = 0; i < 5 && i < keywords.length; i++) {
    const kw = keywords[i];
    const h = hashString(kw.keyword + dateKey);
    const product =
      catalog.find((p) => p.category === kw.category && p.priceKrw >= kw.avgPriceKrw * 0.75) ??
      catalog.find((p) => p.category === kw.category) ??
      catalog[i % catalog.length];

    const intel = buildKeywordIntel(kw.keyword, catalog, marketKeywords);
    const sourceUsd = Math.round((kw.avgPriceKrw / USD_KRW) * (0.22 + (h % 12) / 100) * 100) / 100;
    const weight = 0.3 + (h % 5) / 10;
    const landed = landedCostBreakdown(sourceUsd, weight);
    const competitors = competitorsForProduct(product, catalog);
    const pricing = buildPricingBreakdown(landed.total, competitors, 18);
    const priceKrw = pricing.undercutKrw;
    const insights = enrichCompetitors(product, catalog, priceKrw);
    const margin = marginPct(landed.total, priceKrw);
    const monthlyUnits = Math.max(5, Math.round(intel.searchVolume / 550));
    const { score, signals } = scoreOpportunity({
      keyword: intel,
      marginPct: margin,
      product,
      competitorCount: competitors.length,
      winPriceGap: pricing.competitorLowKrw - priceKrw,
    });

    picks.push({
      id: `im_${dateKey}_${i}`,
      productName: suggestedImportName(kw.keyword, product.name.split(" ").slice(-1)[0] ?? "상품"),
      suggestedTitle: suggestedImportName(kw.keyword, product.name.split(" ").slice(-1)[0] ?? "상품"),
      category: kw.category,
      sourceCountry: SOURCE_COUNTRIES[h % SOURCE_COUNTRIES.length],
      sourcePriceUsd: sourceUsd,
      landedCostKrw: landed.total,
      recommendedPriceKrw: priceKrw,
      marketAvgPriceKrw: kw.avgPriceKrw,
      estimatedMarginPct: margin,
      estimatedMonthlyUnits: monthlyUnits,
      estimatedMonthlyProfitKrw: Math.round(pricing.netProfitKrw * monthlyUnits),
      confidenceScore: score,
      winScore: score,
      reason: `${pricing.strategy} · ${ctx.dataQuality === "live" ? "실데이터" : "학습 데이터"} · AI 승률 ${score}점`,
      keyword: kw.keyword,
      pricing: { ...pricing, undercutKrw: priceKrw },
      signals,
      competitorInsights: insights.slice(0, 6),
      landedBreakdown: {
        productKrw: landed.productKrw,
        shippingKrw: landed.shippingKrw,
        dutyKrw: landed.dutyKrw,
      },
      actionSteps: buildActionSteps("import", {
        keyword: kw.keyword,
        productName: product.name,
        priceKrw,
        supplierLabel: SOURCE_COUNTRIES[h % SOURCE_COUNTRIES.length],
        supplierCost: landed.total,
      }),
      risks: assessRisks({
        marginPct: margin,
        competitionIntensity: intel.competitionIntensity,
        dataQuality: ctx.dataQuality,
        highThreatCompetitors: insights.filter((c) => c.threat === "high").length,
      }),
    });
  }

  return picks;
}
