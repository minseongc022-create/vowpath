import { CONSIGNMENT_DAILY_PICKS } from "../billing";
import type { CatalogProduct, ConsignmentPick, MarketKeywordMetrics } from "../types";
import { competitorsForProduct, estimateSupplierCost } from "./pricing";
import {
  assessRisks,
  buildActionSteps,
  buildKeywordIntel,
  buildPricingBreakdown,
  enrichCompetitors,
  marketContext,
  pickBestProductForKeyword,
  rankKeywordsForSourcing,
  scoreOpportunity,
} from "./intelligence";

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
  pricing: ReturnType<typeof buildPricingBreakdown>,
  insights: ReturnType<typeof enrichCompetitors>,
  signals: ReturnType<typeof scoreOpportunity>["signals"],
  winScore: number,
  dailyUnits: number,
  ctx: ReturnType<typeof marketContext>,
): ConsignmentPick {
  const highThreat = insights.filter((c) => c.threat === "high").length;
  const priceKrw = pricing.undercutKrw;

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
    estimatedDailyProfitKrw: pricing.netProfitKrw * dailyUnits,
    estimatedDailyUnits: dailyUnits,
    confidenceScore: winScore,
    winScore,
    reason: `${pricing.strategy} · ${ctx.dataQuality === "demo" ? "데모" : ctx.dataQuality === "live" ? "실데이터" : "혼합"} · AI 승률 ${winScore}점`,
    pricing: { ...pricing, undercutKrw: priceKrw },
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
  };
}

export function generateConsignmentPicks(
  catalog: CatalogProduct[],
  dateKey: string,
  marketKeywords?: Record<string, MarketKeywordMetrics>,
): ConsignmentPick[] {
  const ctx = marketContext(catalog, marketKeywords);
  const keywords = rankKeywordsForSourcing(catalog, marketKeywords, 50).filter(
    (k) => k.grade === "excellent" || k.grade === "good" || k.difficulty === "easy",
  );

  const picks: ConsignmentPick[] = [];
  const usedProducts = new Set<string>();

  for (const kw of keywords) {
    if (picks.length >= CONSIGNMENT_DAILY_PICKS) break;

    const product =
      pickBestProductForKeyword(kw.keyword, kw.category, catalog, marketKeywords) ??
      catalog.find((p) => !usedProducts.has(p.id) && p.category === kw.category);

    if (!product || usedProducts.has(product.id)) continue;
    usedProducts.add(product.id);

    const intel = buildKeywordIntel(kw.keyword, catalog, marketKeywords);
    const competitors = competitorsForProduct(product, catalog);
    const supplierCost = estimateSupplierCost(product.priceKrw, product.category);
    const pricing = buildPricingBreakdown(supplierCost, competitors);
    const insights = enrichCompetitors(product, catalog, pricing.undercutKrw);
    const { score, signals } = scoreOpportunity({
      keyword: intel,
      marginPct: pricing.marginPct,
      product,
      competitorCount: competitors.length,
      winPriceGap: pricing.competitorLowKrw - pricing.undercutKrw,
    });
    const dailyUnits = Math.max(1, Math.round(intel.searchVolume / 700));

    picks.push(buildPick(dateKey, product, kw.keyword, intel, pricing, insights, signals, score, dailyUnits, ctx));
  }

  return picks.slice(0, CONSIGNMENT_DAILY_PICKS);
}
