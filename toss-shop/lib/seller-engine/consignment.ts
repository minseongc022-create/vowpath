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
import { scanMarket } from "./market-scanner";
import {
  assessIntegration,
  computeJarvisConfidence,
  filterJarvisCertifiedPicks,
} from "./jarvis-engine";
import { buildTopSellerPlaybook } from "./top-seller-playbook";
import { computeSkuProbability } from "./profit-probability";
import { sourcingMaxPerDay } from "./sourcing-plan";
import { decideCatalogEntry } from "./catalog-entry-strategy";
import { analyzeTitleSeo, buildSearchKeywords } from "./toss-seo-engine";
import { netProfitPerUnit } from "./revenue-engine";
import { isDomeggookApiConfigured } from "../wholesale/domeggook-api";
import { meetsSupplierPolicy } from "../wholesale/supplier-quality";
import type { TossFeeContext } from "./fee-model";

export type SourcingIntegrationContext = {
  tossApiConfigured: boolean;
  dataQuality: "live" | "mixed" | "demo";
};

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
  integrationCtx?: SourcingIntegrationContext,
  /** 적응형 소싱 계획이 산출한 오늘 목표 개수 (없으면 기본값) */
  dailyTarget?: number,
): Promise<ConsignmentPick[]> {
  const ctx = marketContext(catalog, marketKeywords);
  const integration = assessIntegration({
    tossApiConfigured: integrationCtx?.tossApiConfigured ?? false,
    wholesaleApiConfigured: isDomeggookApiConfigured(),
    dataQuality: integrationCtx?.dataQuality ?? ctx.dataQuality,
    catalogSize: catalog.length,
  });
  const rankedKeywords = rankKeywordsForSourcing(catalog, marketKeywords, 60).filter(
    (k) => k.grade === "excellent" || k.grade === "good" || k.difficulty === "easy",
  );

  // 시장 스캐너로 순서를 다시 매긴다 (제외는 하지 않는다).
  //
  // 위 랭킹은 "사람들이 많이 찾는가"를 본다. 스캐너는 "신규 셀러가 뚫을 수 있는가"를
  // 본다 — 리뷰 3천 개짜리 상위권이 장악한 키워드는 검색량이 아무리 커도
  // 광고비만 태우고 끝나기 때문이다. enter 판정을 앞으로 당겨 하루치 등록
  // 슬롯이 이길 수 있는 싸움에 먼저 쓰이게 한다.
  //
  // ⚠️ 예전엔 skip 판정을 후보에서 완전히 제외했다. 하지만 스캐너의 임계값
  // (리뷰 장벽 500개, 대형셀러 장악도 70% 등)은 검증된 외부 기준이 아니라
  // 이 엔진 자체가 정한 값이다. 그 값 하나로 마진 좋은 상품을 통째로 못 올리게
  // 막으면, 하루 등록 개수가 스캐너의 추측만큼만 나온다. 그래서 이제는
  // **맨 뒤로 미룰 뿐 자르지 않는다** — 다른 확실한 후보가 부족하면 그때는
  // skip 판정 키워드도 최종 판단(certainty-gate)까지 가서 스스로 증명할 기회를 준다.
  const scan = scanMarket({
    keywords: rankedKeywords.map((k) => k.keyword),
    catalog,
    marketKeywords,
    limit: 60,
  });
  const scanRank = new Map<string, number>();
  scan.enter.forEach((s, i) => scanRank.set(s.keyword, i));
  scan.watch.forEach((s, i) => scanRank.set(s.keyword, 1000 + i));
  scan.skip.forEach((s, i) => scanRank.set(s.keyword, 2000 + i));

  const keywords = [...rankedKeywords].sort(
    // 스캐너 목록에 없는 키워드는 판정 근거가 부족했던 것이므로 enter와 watch
    // 사이(500)에 둔다 — 확실한 기회보다는 뒤, 확실한 함정보다는 앞.
    (a, b) => (scanRank.get(a.keyword) ?? 500) - (scanRank.get(b.keyword) ?? 500),
  );

  const candidates: ConsignmentPick[] = [];
  const usedProducts = new Set<string>();

  for (const kw of keywords) {
    // 적응형 목표가 최대 상한까지 올라갈 수 있으므로 후보 풀을 그만큼 확보한다
    if (candidates.length >= sourcingMaxPerDay() + 5) break;

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

    // 배송 인센티브(판매수수료 0%)는 공급처가 실제로 1등급·당일발송일 때만
    // 약속할 수 있다. 미확인 공급처에 0%를 가정하면 마진이 부풀려지므로,
    // meetsSupplierPolicy가 통과한 live 공급처에 한해서만 적용한다.
    const feeCtx: TossFeeContext = {
      deliveryIncentiveEligible:
        wholesale.bestMatch?.source === "live" &&
        meetsSupplierPolicy(wholesale.bestMatch?.supplierQuality),
    };

    const pricingPreview = buildV4Enrichment({
      supplierCostKrw: supplierCost,
      competitors,
      intel,
      product,
      winScore: 50,
      landscapeDominance: "balanced",
      avgReviewCount: 0,
      mode: "consignment",
      feeCtx,
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
      feeCtx,
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

  const enriched = candidates
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
        mode: "consignment",
      });
      const wholesaleBest = pick.wholesaleBest;
      const topSellerPlaybook = buildTopSellerPlaybook({
        mode: "consignment",
        keyword: pick.keyword,
        category: pick.category,
        priceKrw: pick.recommendedPriceKrw,
        marginPct: pick.estimatedMarginPct,
        moq: wholesaleBest?.moq ?? 1,
        wholesalePlatform:
          wholesaleBest?.platform === "domeggook" || wholesaleBest?.platform === "domeme"
            ? wholesaleBest.platform
            : undefined,
        wholesaleLive: wholesaleBest?.source === "live",
        catalogStrategyMode: v6.catalogStrategy?.mode,
        representativeItemScore: v6.catalogWin.representativeItemScore,
        isolationScore: v6.catalogStrategy?.isolationScore,
        searchVolume: pick.searchVolume,
        competitionIntensity: pick.competitionIntensity,
        avgReviewCount: pick.competitorLandscape?.avgReviewCount,
        monthlyProfitKrw: pick.estimatedMonthlyProfitKrw ?? 0,
        hasDifferentiatedTitle: pick.suggestedTitle !== pick.productName,
        freeShippingRecommended: pick.recommendedPriceKrw >= 15000,
      });
      const jarvis = computeJarvisConfidence({
        integration,
        v6MasterScore: v6.v6MasterScore,
        safetyScore: v6.riskPlaybook?.overallSafetyScore ?? 70,
        marginPct: pick.estimatedMarginPct,
        monthlyProfitKrw: pick.estimatedMonthlyProfitKrw ?? 0,
        moq: wholesaleBest?.moq ?? 1,
        wholesaleLive: wholesaleBest?.source === "live",
        wholesalePlatform:
          wholesaleBest?.platform === "domeggook" || wholesaleBest?.platform === "domeme"
            ? wholesaleBest.platform
            : undefined,
        criticalRisks: v6.riskPlaybook?.criticalCount ?? 0,
        blockRisks: v6.riskPlaybook?.blockCount ?? 0,
        representativeItemScore: v6.catalogWin.representativeItemScore,
        isolationScore: v6.catalogStrategy?.isolationScore,
        catalogStrategyMode: v6.catalogStrategy?.mode,
        competitionIntensity: pick.competitionIntensity,
        searchVolume: pick.searchVolume,
        topSellerAlignment: topSellerPlaybook.alignmentScore,
        supplierQuality: wholesaleBest?.supplierQuality,
        supplierPolicyApplies: wholesaleBest?.source === "live",
      });
      // 상위노출 최적화 — 제목/키워드가 노출확률을 좌우하고, 노출확률이 수익확률을 좌우한다
      const searchKeywords = buildSearchKeywords({
        mainKeyword: pick.keyword,
        productName: v6.recommendedTitle ?? pick.productName,
        category: pick.category,
      });
      const seo = analyzeTitleSeo({
        title: v6.recommendedTitle ?? pick.productName,
        mainKeyword: pick.keyword,
        productName: pick.productName,
        category: pick.category,
        searchKeywords,
      });

      // 실제 단위 순익으로 월 수익 분포를 시뮬레이션
      const supplierCost = wholesaleBest?.unitPriceKrw ?? Math.round(pick.recommendedPriceKrw * 0.62);

      // 대장(대표 아이템)과 같은 카탈로그에 그대로 들어가면 노출이 막힌다.
      // 최저가 경쟁 / 묶음 구성 / 소싱 거부 중 하루 기대순익이 가장 큰 길을 고른다.
      const incumbentPrice =
        pick.competitorInsights?.[0]?.priceKrw ?? Math.round(pick.recommendedPriceKrw * 0.97);
      const catalogEntry = decideCatalogEntry({
        supplierUnitKrw: supplierCost,
        supplierShippingKrw: wholesaleBest?.freeShipping ? 0 : (wholesaleBest?.shippingFeeKrw ?? 2500),
        incumbentPriceKrw: incumbentPrice,
        incumbentShippingKrw: 0,
        baselineDailyUnits: Math.max(0.3, pick.estimatedDailyUnits ?? 1),
      });

      // 진입 전략이 정한 가격/구성을 실제 등록가로 채택한다
      const entryPrice = catalogEntry.sourceable ? catalogEntry.best.priceKrw : pick.recommendedPriceKrw;
      const unitNet = catalogEntry.sourceable
        ? catalogEntry.best.netProfitKrw
        : netProfitPerUnit(supplierCost, pick.recommendedPriceKrw);
      const competitorLow = pick.competitorInsights?.[0]?.priceKrw ?? 0;
      const profitProbability = computeSkuProbability({
        seedKey: `${pick.id}:${pick.keyword}`,
        keyword: pick.keyword,
        category: pick.category,
        baselineDailyUnits: Math.max(0.3, pick.estimatedDailyUnits ?? 1),
        netProfitPerUnitKrw: unitNet,
        competitionIntensity: pick.competitionIntensity,
        searchVolume: pick.searchVolume,
        dataQuality: ctx.dataQuality,
        competitorAvgReviews: pick.competitorLandscape?.avgReviewCount,
        seoScore: seo.score,
        priceRatioVsLow: competitorLow > 0 ? entryPrice / competitorLow : undefined,
      });

      return {
        ...pick,
        profitProbability,
        catalogEntry,
        recommendedPriceKrw: entryPrice,
        seo,
        suggestedTitle: v6.recommendedTitle,
        geniusScore,
        goalSharePct: c?.goalSharePct,
        goalPathNote: c?.pathNote,
        v6MasterScore: v6.v6MasterScore,
        catalogWin: v6.catalogWin,
        catalogStrategy: v6.catalogStrategy,
        policyChecklist: v6.policyChecklist,
        riskPlaybook: v6.riskPlaybook,
        topSellerPlaybook,
        jarvis,
        actionSteps: [
          ...topSellerPlaybook.jarvisActions.slice(0, 2),
          ...(v6.catalogStrategy?.actionSteps ?? []),
          ...(v6.riskPlaybook?.mandatoryActions.slice(0, 2) ?? []),
          ...(pick.actionSteps ?? []).slice(0, 1),
        ],
        v6: {
          engineVersion: POLICY_ENGINE_VERSION,
          v6MasterScore: v6.v6MasterScore,
          catalogWin: v6.catalogWin,
          catalogStrategy: v6.catalogStrategy,
          policyChecklist: v6.policyChecklist,
          marketScanSummary: v6.marketScanSummary,
          riskPlaybook: v6.riskPlaybook,
        },
        confidenceScore: jarvis.certified ? jarvis.confidencePct : v6.v6MasterScore,
        reason: `${jarvis.jackpotCertified ? "🎯 Jarvis 대박" : jarvis.certified ? "✓ Jarvis 93%+" : "Jarvis"} · ${pick.reason}`,
        aiSummary:
          pick.aiSummary +
          ` ${jarvis.brief}` +
          ` ${topSellerPlaybook.brief}` +
          ` ${v6.catalogStrategy?.rationale ?? ""}` +
          (c ? ` · ${jarvis.monthlyPathNote}` : ""),
      };
    })
    .sort((a, b) => {
      const certA = a.jarvis?.certified ? 1 : 0;
      const certB = b.jarvis?.certified ? 1 : 0;
      if (certA !== certB) return certB - certA;
      const jackA = a.jarvis?.jackpotCertified ? 1 : 0;
      const jackB = b.jarvis?.jackpotCertified ? 1 : 0;
      if (jackA !== jackB) return jackB - jackA;
      // 동급이면 "실제로 돈이 될 기대값" 순 — 확률×금액이 곧 수익이다
      const expA = a.profitProbability?.expectedKrw ?? 0;
      const expB = b.profitProbability?.expectedKrw ?? 0;
      if (expA !== expB) return expB - expA;
      return (b.jarvis?.confidencePct ?? 0) - (a.jarvis?.confidencePct ?? 0);
    });

  // 진입 전략이 "거부"로 판정한 픽은 소싱하지 않는다.
  // 대장을 이길 수도, 묶음으로 빠져나갈 수도 없는 상품은 올려봐야 노출이 안 되고
  // 재고·CS·페널티 리스크만 남는다. (계산만 하고 거르지 않으면 무의미하다)
  const sourceable = enriched.filter((p) => p.catalogEntry?.sourceable !== false);

  const ranked = integration.readyFor90
    ? filterJarvisCertifiedPicks(sourceable, { onlyCertified: true }).length >= 2
      ? filterJarvisCertifiedPicks(sourceable, { onlyCertified: true })
      : sourceable
    : sourceable;

  const target = Math.max(1, Math.min(sourcingMaxPerDay(), dailyTarget ?? CONSIGNMENT_DAILY_PICKS));
  return ranked.slice(0, target);
}

export { SELLER_AI_ENGINE_VERSION, WHOLESALE_ENGINE_VERSION };
