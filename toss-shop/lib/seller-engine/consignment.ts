import { CONSIGNMENT_DAILY_PICKS } from "../billing";
import type { CatalogProduct, ConsignmentPick, MarketKeywordMetrics } from "../types";
import {
  landedWholesaleUnitCost,
  searchWholesaleForConsignment,
  WHOLESALE_ENGINE_VERSION,
} from "../wholesale";
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
import { buildPickContributions, getMonthlyGoalKrw } from "./goal-engine";
import { buildV6PickEnrichment, POLICY_ENGINE_VERSION } from "./policy-engine";

function suggestedTitle(keyword: string, productName: string): string {
  const base = productName.length > 28 ? productName.slice(0, 28) : productName;
  if (base.toLowerCase().includes(keyword.toLowerCase())) return base;
  return `${keyword} ${base}`.slice(0, 45);
}

function buildAutoSourcingSteps(
  keyword: string,
  wholesale: Awaited<ReturnType<typeof searchWholesaleForConsignment>>,
  priceKrw: number,
): string[] {
  const best = wholesale.bestMatch;
  const steps = [
    `토스쇼핑 「${keyword}」 키워드로 상품 등록 · AI 추천가 ${priceKrw.toLocaleString()}원`,
  ];
  if (best) {
    const platformLabel = best.platform === "domeggook" ? "도매꾹" : "도매매";
    steps.push(
      `${platformLabel} 공급처 확보: ${best.title.slice(0, 30)} · 공급가 ${landedWholesaleUnitCost(best).toLocaleString()}원 (${best.source === "live" ? "실시간 API" : "검색 링크"})`,
      `공급 URL 확인 → MOQ ${best.moq}개 · ${best.freeShipping ? "무료배송" : `배송 ${best.shippingFeeKrw.toLocaleString()}원`}`,
    );
  } else {
    steps.push(`도매꾹·도매매에서 「${keyword}」 검색 → 마진 12% 이상 공급처 선정`);
  }
  steps.push(
    "상품명·썸네일·상세: 토스 상위 3개 경쟁사 대비 차별화",
    "위탁 발주 → 출고 3일 이내 · 첫 2주 리뷰 10개 목표",
  );
  return steps;
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
  wholesale: Awaited<ReturnType<typeof searchWholesaleForConsignment>>,
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
    reason: `${v4.optimal.label} · ${wholesale.bestMatch ? (wholesale.bestMatch.platform === "domeggook" ? "도매꾹" : "도매매") + " 연동" : "도매 추정"} · AI ${WHOLESALE_ENGINE_VERSION} 수익 ${v4.profitScore}`,
    pricing: { ...pricing, undercutKrw: priceKrw },
    pricingScenarios: v4.pricingScenarios,
    revenueForecast: v4.revenueForecast,
    profitPlaybook: v4.profitPlaybook,
    signals,
    actionSteps: buildActionSteps("consignment", {
      keyword,
      productName: product.name,
      priceKrw,
      supplierLabel: wholesale.bestMatch?.platform === "domeme" ? "도매매" : "도매꾹",
      supplierCost: pricing.supplierCostKrw,
    }),
    autoSourcingSteps: buildAutoSourcingSteps(keyword, wholesale, priceKrw),
    risks: assessRisks({
      marginPct: pricing.marginPct,
      competitionIntensity: intel.competitionIntensity,
      dataQuality: ctx.dataQuality,
      highThreatCompetitors: highThreat,
    }),
    aiSummary,
    competitorLandscape,
    wholesaleMatches: wholesale.listings,
    wholesaleBest: wholesale.bestMatch,
    wholesaleApiLive: wholesale.apiConfigured && wholesale.listings.some((l) => l.source === "live"),
    v4: { ...v4.v4, engineVersion: SELLER_AI_ENGINE_VERSION },
  };
}

export async function generateConsignmentPicks(
  catalog: CatalogProduct[],
  dateKey: string,
  marketKeywords?: Record<string, MarketKeywordMetrics>,
): Promise<ConsignmentPick[]> {
  const ctx = marketContext(catalog, marketKeywords);
  const keywords = rankKeywordsForSourcing(catalog, marketKeywords, 60).filter(
    (k) => k.grade === "excellent" || k.grade === "good" || k.difficulty === "easy",
  );

  const candidates: ConsignmentPick[] = [];
  const usedProducts = new Set<string>();

  for (const kw of keywords) {
    if (candidates.length >= CONSIGNMENT_DAILY_PICKS + 5) break;

    const product =
      pickBestProductForKeyword(kw.keyword, kw.category, catalog, marketKeywords) ??
      catalog.find((p) => !usedProducts.has(p.id) && p.category === kw.category);

    if (!product || usedProducts.has(product.id)) continue;
    usedProducts.add(product.id);

    const intel = buildKeywordIntel(kw.keyword, catalog, marketKeywords);
    const competitors = competitorsForProduct(product, catalog);

    const wholesale = await searchWholesaleForConsignment({
      keyword: kw.keyword,
      tossAvgPriceKrw: intel.avgPriceKrw,
      targetRetailKrw: product.priceKrw,
    });

    const supplierCost =
      wholesale.bestMatch != null
        ? landedWholesaleUnitCost(wholesale.bestMatch)
        : estimateSupplierCost(product.priceKrw, product.category);

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

    let aiSummary = buildAiSummary({
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

    if (wholesale.bestMatch) {
      const pl = wholesale.bestMatch.platform === "domeggook" ? "도매꾹" : "도매매";
      aiSummary += ` ${pl} 공급가 ${landedWholesaleUnitCost(wholesale.bestMatch).toLocaleString()}원(${wholesale.bestMatch.source === "live" ? "실데이터" : "검색 기반"})로 위탁 등록 가능.`;
    }

    candidates.push(
      buildPick(
        dateKey,
        product,
        kw.keyword,
        intel,
        v4,
        insights,
        signals,
        score,
        ctx,
        aiSummary,
        landscape,
        wholesale,
      ),
    );
  }

  return candidates
    .map((pick) => {
      const contributions = buildPickContributions([
        {
          keyword: pick.keyword,
          mode: "consignment",
          monthlyProfitKrw: pick.estimatedMonthlyProfitKrw ?? 0,
          searchVolume: pick.searchVolume,
          competitionIntensity: pick.competitionIntensity,
          marginPct: pick.estimatedMarginPct,
          category: pick.category,
        },
      ]);
      const c = contributions[0];
      const geniusScore = c?.geniusScore ?? pick.profitScore ?? 0;
      const competitorPrices =
        pick.competitorInsights?.map((x) => x.priceKrw) ??
        pick.competitorPrices.map((x) => x.priceKrw);
      const v6 = buildV6PickEnrichment({
        keyword: pick.keyword,
        productName: pick.productName,
        suggestedTitle: pick.suggestedTitle,
        category: pick.category,
        priceKrw: pick.recommendedPriceKrw,
        marginPct: pick.estimatedMarginPct,
        competitorPrices,
        competitionIntensity: pick.competitionIntensity,
        productCount: pick.competitorLandscape?.count ?? competitorPrices.length,
        reviewCount: pick.competitorLandscape?.avgReviewCount ?? 0,
        catalogSize: catalog.length,
        searchVolume: pick.searchVolume,
        priceLow: pick.pricing?.competitorLowKrw ?? pick.recommendedPriceKrw * 0.85,
        priceMedian: pick.pricing?.competitorMedianKrw ?? pick.recommendedPriceKrw,
        priceHigh: pick.pricing?.competitorHighKrw ?? pick.recommendedPriceKrw * 1.15,
        geniusScore,
        monthlyProfitKrw: pick.estimatedMonthlyProfitKrw ?? 0,
        goalKrw: getMonthlyGoalKrw(),
        freeShippingRecommended: pick.recommendedPriceKrw >= 15000,
      });
      return {
        ...pick,
        suggestedTitle: v6.recommendedTitle,
        geniusScore,
        goalSharePct: c?.goalSharePct,
        goalPathNote: c?.pathNote,
        v6MasterScore: v6.v6MasterScore,
        catalogWin: v6.catalogWin,
        catalogStrategy: v6.catalogStrategy,
        policyChecklist: v6.policyChecklist,
        actionSteps: [
          ...(v6.catalogStrategy?.actionSteps ?? []),
          ...(pick.actionSteps ?? []).slice(0, 2),
        ],
        v6: {
          engineVersion: POLICY_ENGINE_VERSION,
          v6MasterScore: v6.v6MasterScore,
          catalogWin: v6.catalogWin,
          catalogStrategy: v6.catalogStrategy,
          policyChecklist: v6.policyChecklist,
          marketScanSummary: v6.marketScanSummary,
        },
        confidenceScore: v6.v6MasterScore,
        aiSummary:
          pick.aiSummary +
          ` ${v6.catalogStrategy?.rationale ?? ""}` +
          (c
            ? ` 월 ${getMonthlyGoalKrw().toLocaleString()}원 목표 기여 ${c.goalSharePct}% · v6 ${v6.v6MasterScore}.`
            : ""),
      };
    })
    .sort((a, b) => (b.v6MasterScore ?? 0) - (a.v6MasterScore ?? 0))
    .slice(0, CONSIGNMENT_DAILY_PICKS);
}

export { SELLER_AI_ENGINE_VERSION, WHOLESALE_ENGINE_VERSION };
