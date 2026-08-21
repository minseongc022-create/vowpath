import { CONSIGNMENT_DAILY_PICKS } from "../billing";
import type { CatalogProduct, ConsignmentPick, MarketKeywordMetrics } from "../types";
import { competitorsForProduct, estimateSupplierCost } from "./pricing";
import {
  assessRisks,
  analyzeCompetitorLandscape,
  buildActionSteps,
  buildAiSummary,
  buildKeywordIntel,
  enrichCompetitors,
  marketContext,
  pickBestProductForKeyword,
  rankKeywordsForSourcing,
  scoreOpportunity,
} from "./intelligence";
import { buildV4Enrichment, SELLER_AI_ENGINE_VERSION } from "./revenue-engine";

function suggestedTitle(keyword: string, productName: string): string {
  const base = productName.length > 28 ? productName.slice(0, 28) : productName;
  if (base.toLowerCase().includes(keyword.toLowerCase())) return base;
  return `${keyword} ${base}`.slice(0, 45);
}

function buildPick(
  dateKey: string,
  product: CatalogProduct,
  keyword: string,
  intel: ReturnType<typeof buildKeywordIntel>,
  v4: ReturnType<typeof buildV4Enrichment>,
  insights: ReturnType<typeof enrichCompetitors>,
  signals: ReturnType<typeof scoreOpportunity>["signals"],
  winScore: number,
  ctx: ReturnType<typeof marketContext>,
  aiSummary: string,
  competitorLandscape: ReturnType<typeof analyzeCompetitorLandscape>,
): ConsignmentPick {
  const highThreat = insights.filter((c) => c.threat === "high").length;
  const priceKrw = v4.optimal.priceKrw;
  const pricing = v4.pricing;

  return {
    id: `cs_${dateKey}_${product.id}`,
    keyword,
    productName: product.name,
    suggestedTitle: suggestedTitle(keyword, product.name),
    category: product.category,
    supplierCostKrw: pricing.supplierCostKrw,
    recommendedPriceKrw: priceKrw,
    competitorPrices: insights.slice(0, 6),
    competitorInsights: insights.slice(0, 8),
    searchVolume: intel.searchVolume,
    competitionIntensity: intel.competitionIntensity,
    estimatedMarginPct: pricing.marginPct,
    estimatedDailyProfitKrw: v4.optimal.estimatedDailyProfitKrw,
    estimatedDailyUnits: v4.dailyUnits,
    estimatedMonthlyProfitKrw: v4.optimal.estimatedMonthlyProfitKrw,
    confidenceScore: v4.profitScore,
    winScore,
    profitScore: v4.profitScore,
    reason: `${v4.optimal.label} · ${pricing.strategy} · AI v4 수익점수 ${v4.profitScore}`,
    pricing: { ...pricing, undercutKrw: priceKrw },
    pricingScenarios: v4.pricingScenarios,
    revenueForecast: v4.revenueForecast,
    profitPlaybook: v4.profitPlaybook,
    signals,
    actionSteps: buildActionSteps("consignment", {
      keyword,
      productName: product.name,
      priceKrw,
      supplierLabel: "위탁",
      supplierCost: pricing.supplierCostKrw,
    }),
    risks: assessRisks({
      marginPct: pricing.marginPct,
      competitionIntensity: intel.competitionIntensity,
      dataQuality: ctx.dataQuality,
      highThreatCompetitors: highThreat,
    }),
    aiSummary,
    competitorLandscape,
    v4: v4.v4,
  };
}

export function generateConsignmentPicks(
  catalog: CatalogProduct[],
  dateKey: string,
  marketKeywords?: Record<string, MarketKeywordMetrics>,
): ConsignmentPick[] {
  const ctx = marketContext(catalog, marketKeywords);
  const keywords = rankKeywordsForSourcing(catalog, marketKeywords, 60).filter(
    (k) => k.grade === "excellent" || k.grade === "good" || k.difficulty === "easy",
  );

  const candidates: ConsignmentPick[] = [];
  const usedProducts = new Set<string>();

  for (const kw of keywords) {
    const product =
      pickBestProductForKeyword(kw.keyword, kw.category, catalog, marketKeywords) ??
      catalog.find((p) => !usedProducts.has(p.id) && p.category === kw.category);

    if (!product || usedProducts.has(product.id)) continue;
    usedProducts.add(product.id);

    const intel = buildKeywordIntel(kw.keyword, catalog, marketKeywords);
    const competitors = competitorsForProduct(product, catalog);
    const supplierCost = estimateSupplierCost(product.priceKrw, product.category);

    const pricingPreview = buildV4Enrichment({
      supplierCostKrw: supplierCost,
      competitors,
      intel,
      product,
      winScore: 50,
      landscapeDominance: "balanced",
      avgReviewCount: 0,
      mode: "consignment",
    });
    const insights = enrichCompetitors(product, catalog, pricingPreview.optimal.priceKrw);
    const landscape = analyzeCompetitorLandscape(insights, pricingPreview.pricing);

    const { score, signals } = scoreOpportunity({
      keyword: intel,
      marginPct: pricingPreview.pricing.marginPct,
      product,
      competitorCount: competitors.length,
      winPriceGap: pricingPreview.pricing.competitorLowKrw - pricingPreview.optimal.priceKrw,
      priceSpreadPct: landscape.priceSpreadPct,
      highThreatCompetitors: landscape.highThreatCount,
    });

    const v4 = buildV4Enrichment({
      supplierCostKrw: supplierCost,
      competitors,
      intel,
      product,
      winScore: score,
      landscapeDominance: landscape.dominance,
      avgReviewCount: landscape.avgReviewCount,
      mode: "consignment",
    });

    const aiSummary = buildAiSummary({
      mode: "consignment",
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

    candidates.push(
      buildPick(dateKey, product, kw.keyword, intel, v4, insights, signals, score, ctx, aiSummary, landscape),
    );
  }

  return candidates
    .sort((a, b) => (b.estimatedMonthlyProfitKrw ?? 0) - (a.estimatedMonthlyProfitKrw ?? 0))
    .slice(0, CONSIGNMENT_DAILY_PICKS);
}

export { SELLER_AI_ENGINE_VERSION };
