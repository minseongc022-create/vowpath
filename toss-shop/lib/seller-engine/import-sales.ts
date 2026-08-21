import type { CatalogProduct, ImportPick, MarketKeywordMetrics, TossShopCategory } from "../types";
import { buildImportSourceRecommendations, USD_KRW, WHOLESALE_ENGINE_VERSION } from "../wholesale";
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
import { buildPickContributions, getMonthlyGoalKrw } from "./goal-engine";

const IMPORT_CATEGORIES: TossShopCategory[] = ["digital", "home", "beauty", "fashion", "health"];

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

function buildImportAutoSteps(
  keyword: string,
  importSrc: ReturnType<typeof buildImportSourceRecommendations>,
  priceKrw: number,
): string[] {
  const best = importSrc.bestMatch;
  const country = importSrc.primaryCountry;
  const steps = [
    `토스쇼핑 「${keyword}」 등록 · AI 판매가 ${priceKrw.toLocaleString()}원`,
  ];
  if (best) {
    const platform =
      best.platform === "1688"
        ? "1688"
        : best.platform === "taobao"
          ? "타오바오"
          : best.platform === "rakuten"
            ? "라쿠텐"
            : "Yahoo 쇼핑";
    steps.push(
      `${country} ${platform}에서 소싱: ${best.title}`,
      `검색/상품 링크 확인 → 샘플·MOQ 협의 → 랜딩비 ${(best.landedCostKrw ?? 0).toLocaleString()}원 기준 마진 ${best.estimatedMarginPct ?? 0}%`,
    );
  } else {
    steps.push(
      country === "중국"
        ? `1688.com 에서 「${keyword}」 검색 → 공장가 확인`
        : `라쿠텐/Yahoo 에서 「${keyword}」 프리미엄 라인 검색`,
    );
  }
  steps.push("KC·인증·표시사항 확인 → 통관·배송대행 견적 → 입고 후 재분석");
  return steps;
}

export async function generateImportPicks(
  catalog: CatalogProduct[],
  dateKey: string,
  marketKeywords?: Record<string, MarketKeywordMetrics>,
): Promise<ImportPick[]> {
  const ctx = marketContext(catalog, marketKeywords);
  const keywords = rankKeywordsForSourcing(catalog, marketKeywords, 50).filter((k) =>
    IMPORT_CATEGORIES.includes(k.category),
  );

  const candidates: ImportPick[] = [];

  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];
    const product =
      catalog.find((p) => p.category === kw.category && p.priceKrw >= kw.avgPriceKrw * 0.75) ??
      catalog.find((p) => p.category === kw.category) ??
      catalog[i % catalog.length];

    const intel = buildKeywordIntel(kw.keyword, catalog, marketKeywords);
    const importSrc = buildImportSourceRecommendations({
      keyword: kw.keyword,
      tossAvgPriceKrw: kw.avgPriceKrw,
      targetRetailKrw: product.priceKrw,
    });

    const best = importSrc.bestMatch;
    const sourceUsd = best?.sourcePriceUsd ?? Math.round((kw.avgPriceKrw / USD_KRW) * 0.22 * 100) / 100;
    const landed = best?.landedCostKrw
      ? {
          productKrw: best.sourcePriceKrw,
          shippingKrw: Math.round((best.landedCostKrw - best.sourcePriceKrw) * 0.6),
          dutyKrw: Math.round((best.landedCostKrw - best.sourcePriceKrw) * 0.4),
          total: best.landedCostKrw,
        }
      : landedCostBreakdown(sourceUsd);

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
    let aiSummary = buildAiSummary({
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
    aiSummary += ` ${importSrc.sourcingBrief}`;

    candidates.push({
      id: `im_${dateKey}_${i}`,
      productName: name,
      suggestedTitle: name,
      category: kw.category,
      sourceCountry: importSrc.primaryCountry,
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
      reason: `${importSrc.primaryCountry} ${best?.platform ?? "소싱"} · ${v4.optimal.label} · AI ${WHOLESALE_ENGINE_VERSION}`,
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
      actionSteps: buildImportAutoSteps(kw.keyword, importSrc, priceKrw),
      risks: assessRisks({
        marginPct: v4.pricing.marginPct,
        competitionIntensity: intel.competitionIntensity,
        dataQuality: ctx.dataQuality,
        highThreatCompetitors: landscape.highThreatCount,
      }),
      aiSummary,
      competitorLandscape: landscape,
      importSources: {
        primaryCountry: importSrc.primaryCountry,
        china: importSrc.china,
        japan: importSrc.japan,
        bestMatch: importSrc.bestMatch,
        sourcingBrief: importSrc.sourcingBrief,
      },
      importBest: importSrc.bestMatch,
      sourcingBrief: importSrc.sourcingBrief,
      v4: { ...v4.v4, engineVersion: SELLER_AI_ENGINE_VERSION },
    });
  }

  return candidates
    .map((pick) => {
      const contributions = buildPickContributions([
        {
          keyword: pick.keyword,
          mode: "import",
          monthlyProfitKrw: pick.estimatedMonthlyProfitKrw ?? 0,
          marginPct: pick.estimatedMarginPct,
          category: pick.category,
        },
      ]);
      const c = contributions[0];
      return {
        ...pick,
        geniusScore: c?.geniusScore ?? pick.profitScore,
        goalSharePct: c?.goalSharePct,
        goalPathNote: c?.pathNote,
        confidenceScore: c?.geniusScore ?? pick.confidenceScore,
        aiSummary:
          pick.aiSummary +
          (c
            ? ` 월 ${getMonthlyGoalKrw().toLocaleString()}원 목표 기여 ${c.goalSharePct}% · genius ${c.geniusScore}점.`
            : ""),
      };
    })
    .sort((a, b) => (b.geniusScore ?? 0) - (a.geniusScore ?? 0))
    .slice(0, 5);
}

export { SELLER_AI_ENGINE_VERSION, WHOLESALE_ENGINE_VERSION };
