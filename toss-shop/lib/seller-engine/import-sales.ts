import type { CatalogProduct, ImportPick, MarketKeywordMetrics, TossShopCategory } from "../types";
import { competitorsForProduct } from "./pricing";
import {
  assessRisks,
  analyzeCompetitorLandscape,
  buildActionSteps,
  buildAiSummary,
  buildKeywordIntel,
  enrichCompetitors,
  marketContext,
  rankKeywordsForSourcing,
  scoreOpportunity,
} from "./intelligence";
import { buildV4Enrichment, SELLER_AI_ENGINE_VERSION } from "./revenue-engine";

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
  const keywords = rankKeywordsForSourcing(catalog, marketKeywords, 50).filter((k) =>
    IMPORT_CATEGORIES.includes(k.category),
  );

  const candidates: ImportPick[] = [];

  for (let i = 0; i < keywords.length; i++) {
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

    const preview = buildV4Enrichment({
      supplierCostKrw: landed.total,
      competitors,
      intel,
      product,
      winScore: 50,
      landscapeDominance: "balanced",
      avgReviewCount: 0,
      mode: "import",
      minMarginPct: 18,
    });
    const insights = enrichCompetitors(product, catalog, preview.optimal.priceKrw);
    const landscape = analyzeCompetitorLandscape(insights, preview.pricing);

    const { score, signals } = scoreOpportunity({
      keyword: intel,
      marginPct: preview.pricing.marginPct,
      product,
      competitorCount: competitors.length,
      winPriceGap: preview.pricing.competitorLowKrw - preview.optimal.priceKrw,
      priceSpreadPct: landscape.priceSpreadPct,
      highThreatCompetitors: landscape.highThreatCount,
    });

    const v4 = buildV4Enrichment({
      supplierCostKrw: landed.total,
      competitors,
      intel,
      product,
      winScore: score,
      landscapeDominance: landscape.dominance,
      avgReviewCount: landscape.avgReviewCount,
      mode: "import",
      minMarginPct: 18,
    });

    const priceKrw = v4.optimal.priceKrw;
    const name = suggestedImportName(kw.keyword, product.name.split(" ").slice(-1)[0] ?? "상품");
    const aiSummary = buildAiSummary({
      mode: "import",
      keyword: kw.keyword,
      productName: product.name,
      winScore: score,
      intel,
      pricing: v4.pricing,
      landscape,
      dataQuality: ctx.dataQuality,
      monthlyProfitKrw: v4.optimal.estimatedMonthlyProfitKrw,
      profitScore: v4.profitScore,
      recommendedScenario: v4.optimal.label,
    });

    candidates.push({
      id: `im_${dateKey}_${i}`,
      productName: name,
      suggestedTitle: name,
      category: kw.category,
      sourceCountry: SOURCE_COUNTRIES[h % SOURCE_COUNTRIES.length],
      sourcePriceUsd: sourceUsd,
      landedCostKrw: landed.total,
      recommendedPriceKrw: priceKrw,
      marketAvgPriceKrw: kw.avgPriceKrw,
      estimatedMarginPct: v4.pricing.marginPct,
      estimatedMonthlyUnits: Math.round(v4.dailyUnits * 30),
      estimatedMonthlyProfitKrw: v4.optimal.estimatedMonthlyProfitKrw,
      confidenceScore: v4.profitScore,
      winScore: score,
      profitScore: v4.profitScore,
      reason: `${v4.optimal.label} · ${v4.pricing.strategy} · AI v4 수익점수 ${v4.profitScore}`,
      keyword: kw.keyword,
      pricing: { ...v4.pricing, undercutKrw: priceKrw },
      pricingScenarios: v4.pricingScenarios,
      revenueForecast: v4.revenueForecast,
      profitPlaybook: v4.profitPlaybook,
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
        marginPct: v4.pricing.marginPct,
        competitionIntensity: intel.competitionIntensity,
        dataQuality: ctx.dataQuality,
        highThreatCompetitors: landscape.highThreatCount,
      }),
      aiSummary,
      competitorLandscape: landscape,
      v4: v4.v4,
    });
  }

  return candidates
    .sort((a, b) => (b.estimatedMonthlyProfitKrw ?? 0) - (a.estimatedMonthlyProfitKrw ?? 0))
    .slice(0, 5);
}

export { SELLER_AI_ENGINE_VERSION };
