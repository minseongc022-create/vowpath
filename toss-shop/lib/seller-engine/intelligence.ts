import { analyzeKeyword } from "../catalog";
import { getDiscoveryKeywords, type DiscoveryKeyword } from "../discovery";
import { getMarketMetrics } from "../market-collector";
import { inferDataQuality } from "../market-collector";
import type {
  AnalysisSignal,
  CatalogProduct,
  CompetitorInsight,
  CompetitorLandscape,
  CompetitorPriceRef,
  MarketKeywordMetrics,
  PricingBreakdown,
  TossShopCategory,
} from "../types";
import {
  autoMatchPrice,
  competitorsForProduct,
  estimatePlatformFees,
  estimateSupplierCost,
  marginPct,
  priceStatistics,
} from "./pricing";
import type { TossFeeContext } from "./fee-model";

export type { AnalysisSignal, PricingBreakdown, CompetitorInsight };

export type KeywordIntel = {
  keyword: string;
  category: TossShopCategory;
  searchVolume: number;
  competitionIntensity: number;
  productCount: number;
  avgPriceKrw: number;
  trendPct: number;
  grade: DiscoveryKeyword["competitionGrade"];
  difficulty: "easy" | "medium" | "hard";
};

export type MarketContext = {
  catalogSize: number;
  marketKeywordCount: number;
  dataQuality: "live" | "mixed" | "demo";
  analyzedAt: string;
};

export function buildKeywordIntel(
  keyword: string,
  catalog: CatalogProduct[],
  marketKeywords?: Record<string, MarketKeywordMetrics>,
): KeywordIntel {
  const discovery = getDiscoveryKeywords().find((k) => k.keyword === keyword);
  const market = getMarketMetrics(keyword, marketKeywords);
  const analysis = analyzeKeyword(keyword, undefined, catalog, marketKeywords);

  return {
    keyword,
    category: (discovery?.category ?? "food") as TossShopCategory,
    searchVolume: market?.searchVolume ?? discovery?.searchVolume ?? analysis.searchVolume,
    competitionIntensity:
      market?.competitionIntensity ?? discovery?.competitionIntensity ?? analysis.competitionIntensity,
    productCount: market?.productCount ?? discovery?.productCount ?? analysis.competingProducts,
    avgPriceKrw: market?.avgPriceKrw ?? discovery?.avgPriceKrw ?? analysis.avgPriceKrw,
    trendPct: discovery?.trendPct ?? 0,
    grade: discovery?.competitionGrade ?? analysis.competitionGrade,
    difficulty: analysis.difficulty,
  };
}

export function enrichCompetitors(
  product: CatalogProduct,
  catalog: CatalogProduct[],
  targetPrice: number,
): CompetitorInsight[] {
  const refs = competitorsForProduct(product, catalog);
  const full = refs.map((ref) => {
    const p = catalog.find((c) => c.sellerName === ref.sellerName && c.priceKrw === ref.priceKrw);
    const priceGapPct = Math.round(((ref.priceKrw - targetPrice) / Math.max(targetPrice, 1)) * 1000) / 10;
    let threat: CompetitorInsight["threat"] = "medium";
    if (ref.rank <= 3 && ref.priceKrw <= targetPrice) threat = "high";
    else if (ref.rank > 8 || ref.priceKrw > targetPrice * 1.15) threat = "low";
    return {
      ...ref,
      reviewCount: p?.reviewCount,
      rating: p?.rating,
      priceGapPct,
      threat,
    };
  });
  return full.sort((a, b) => a.priceKrw - b.priceKrw);
}

export function analyzeCompetitorLandscape(
  insights: CompetitorInsight[],
  pricing: PricingBreakdown,
): CompetitorLandscape {
  if (!insights.length) {
    return {
      count: 0,
      priceSpreadPct: 0,
      avgReviewCount: 0,
      avgRating: 0,
      lowThreatCount: 0,
      highThreatCount: 0,
      dominance: "fragmented",
    };
  }

  const prices = insights.map((c) => c.priceKrw);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const priceSpreadPct =
    low > 0 ? Math.round(((high - low) / low) * 1000) / 10 : 0;
  const withReviews = insights.filter((c) => c.reviewCount != null);
  const avgReviewCount =
    withReviews.length > 0
      ? Math.round(withReviews.reduce((s, c) => s + (c.reviewCount ?? 0), 0) / withReviews.length)
      : 0;
  const withRating = insights.filter((c) => c.rating != null);
  const avgRating =
    withRating.length > 0
      ? Math.round((withRating.reduce((s, c) => s + (c.rating ?? 0), 0) / withRating.length) * 10) / 10
      : 0;
  const highThreatCount = insights.filter((c) => c.threat === "high").length;
  const lowThreatCount = insights.filter((c) => c.threat === "low").length;

  const top3Share = insights.slice(0, 3).filter((c) => c.rank <= 3).length;
  let dominance: CompetitorLandscape["dominance"] = "balanced";
  if (highThreatCount >= 3 || (top3Share >= 2 && pricing.competitorLowKrw > 0 && pricing.undercutKrw > pricing.competitorLowKrw)) {
    dominance = "concentrated";
  } else if (priceSpreadPct > 35 || lowThreatCount >= insights.length * 0.6) {
    dominance = "fragmented";
  }

  return {
    count: insights.length,
    priceSpreadPct,
    avgReviewCount,
    avgRating,
    lowThreatCount,
    highThreatCount,
    dominance,
  };
}

export function buildAiSummary(input: {
  mode: "consignment" | "import";
  keyword: string;
  productName: string;
  winScore: number;
  intel: KeywordIntel;
  pricing: PricingBreakdown;
  landscape: CompetitorLandscape;
  dataQuality: MarketContext["dataQuality"];
  monthlyProfitKrw?: number;
  profitScore?: number;
  recommendedScenario?: string;
}): string {
  const { intel, pricing, landscape, winScore } = input;
  const demandLabel =
    intel.searchVolume >= 15000 ? "수요가 강한" : intel.searchVolume >= 5000 ? "수요가 양호한" : "틈새 수요";
  const compLabel =
    intel.competitionIntensity < 0.8
      ? "경쟁이 낮은"
      : intel.competitionIntensity < 1.5
        ? "경쟁이 보통인"
        : "경쟁이 치열한";
  const trendNote =
    intel.trendPct > 8
      ? "검색 추세가 상승 중이며"
      : intel.trendPct < -8
        ? "검색 추세는 하락세이나"
        : "검색 추세는 안정적이며";

  const priceNote =
    pricing.undercutKrw <= pricing.competitorLowKrw
      ? `추천가 ${pricing.undercutKrw.toLocaleString()}원은 최저 경쟁가 대비 Buy Box에 유리합니다.`
      : `추천가 ${pricing.undercutKrw.toLocaleString()}원은 중위가 ${pricing.competitorMedianKrw.toLocaleString()}원 기준 ${pricing.strategy.includes("프리미엄") ? "프리미엄" : "경쟁"} 전략입니다.`;

  const marginNote =
    pricing.marginPct >= 15
      ? `순마진 ${pricing.marginPct}%로 수익성이 좋습니다.`
      : pricing.marginPct >= 10
        ? `순마진 ${pricing.marginPct}%로 프로모션 여유는 제한적입니다.`
        : `순마진 ${pricing.marginPct}%로 가격·원가 재검토가 필요합니다.`;

  const landscapeNote =
    landscape.dominance === "fragmented"
      ? `경쟁사 ${landscape.count}곳, 가격 분산이 커(${landscape.priceSpreadPct}%) 신규 진입 여지가 있습니다.`
      : landscape.dominance === "concentrated"
        ? `상위 셀러 ${landscape.highThreatCount}곳이 저가·고랭킹으로 시장을 주도합니다.`
        : `경쟁사 ${landscape.count}곳, 가격대가 ${landscape.priceSpreadPct}% 범위로 혼재되어 있습니다.`;

  const dataNote =
    input.dataQuality === "live"
      ? "실제 토스 API·카탈로그 데이터 기반"
      : input.dataQuality === "mixed"
        ? "일부 실데이터 혼합"
        : "데모 학습 데이터 기반(입점 후 정밀도 상승)";

  const verdict =
    input.profitScore != null && input.profitScore >= 70
      ? "종합 판단: 수익 극대화 적극 추천"
      : winScore >= 75
        ? "종합 판단: 적극 추천"
        : winScore >= 55
          ? "종합 판단: 조건부 추천"
          : "종합 판단: 신중 검토";

  const profitNote =
    input.monthlyProfitKrw != null
      ? ` AI v4 예상 월수익 ${input.monthlyProfitKrw.toLocaleString()}원${input.recommendedScenario ? ` (${input.recommendedScenario} 전략)` : ""}.`
      : "";

  if (input.mode === "consignment") {
    return [
      `「${input.keyword}」 — ${demandLabel} ${compLabel} 키워드입니다. ${trendNote} 월 검색 ${intel.searchVolume.toLocaleString()}·상품 ${intel.productCount}개를 분석했습니다.`,
      `${input.productName} 위탁 시 ${priceNote} ${marginNote}`,
      landscapeNote,
      `${dataNote} · AI 승률 ${winScore}점.${profitNote} ${verdict}.`,
    ].join(" ");
  }

  return [
    `「${input.keyword}」 수입 — ${demandLabel} ${compLabel} 카테고리. ${trendNote} 국내 중위가 ${intel.avgPriceKrw.toLocaleString()}원 대비 랜딩 원가 ${pricing.supplierCostKrw.toLocaleString()}원입니다.`,
    `${priceNote} ${marginNote}`,
    landscapeNote,
    `${dataNote} · AI 승률 ${winScore}점.${profitNote} ${verdict}.`,
  ].join(" ");
}

export function buildPricingBreakdown(
  supplierCostKrw: number,
  competitors: CompetitorPriceRef[],
  minMarginPct = 12,
  /**
   * 수수료 맥락 — 공급처가 1등급·당일발송으로 검증되면 배송 인센티브로
   * 판매수수료가 0%가 되어 마진이 8%p 올라간다. 미지정이면 보수적으로 8%.
   */
  feeCtx: TossFeeContext = {},
): PricingBreakdown {
  const stats = priceStatistics(competitors.map((c) => c.priceKrw));
  const { priceKrw, strategy } = autoMatchPrice(supplierCostKrw, competitors, minMarginPct);
  const fees = estimatePlatformFees(priceKrw, feeCtx);
  const netProfitKrw = priceKrw - supplierCostKrw - fees;
  const priceFloorKrw = Math.round(supplierCostKrw * (1 + minMarginPct / 100));
  const priceCeilingKrw = stats.high > 0 ? Math.round(stats.high * 0.95) : Math.round(priceKrw * 1.2);

  return {
    supplierCostKrw,
    platformFeesKrw: fees,
    netProfitKrw,
    marginPct: marginPct(supplierCostKrw, priceKrw, feeCtx),
    strategy,
    priceFloorKrw,
    priceCeilingKrw,
    competitorLowKrw: stats.low,
    competitorMedianKrw: stats.median,
    competitorHighKrw: stats.high,
    undercutKrw: priceKrw,
  };
}

export function scoreOpportunity(input: {
  keyword: KeywordIntel;
  marginPct: number;
  product: CatalogProduct;
  competitorCount: number;
  winPriceGap: number;
  priceSpreadPct?: number;
  highThreatCompetitors?: number;
}): { score: number; signals: AnalysisSignal[] } {
  const signals: AnalysisSignal[] = [];
  let score = 0;

  const demand = Math.min(input.keyword.searchVolume / 8000, 1) * 28;
  score += demand;
  signals.push({
    label: "수요",
    impact: demand > 18 ? "positive" : demand > 10 ? "neutral" : "negative",
    detail: `월 검색 ${input.keyword.searchVolume.toLocaleString()} · 추세 ${input.keyword.trendPct >= 0 ? "+" : ""}${input.keyword.trendPct}%`,
    weight: demand,
  });

  const comp = Math.max(0, (2.2 - input.keyword.competitionIntensity) * 14);
  score += comp;
  signals.push({
    label: "경쟁",
    impact: input.keyword.competitionIntensity < 1 ? "positive" : input.keyword.competitionIntensity > 2 ? "negative" : "neutral",
    detail: `경쟁강도 ${input.keyword.competitionIntensity} · 상품 ${input.keyword.productCount}개`,
    weight: comp,
  });

  const margin = Math.min(Math.max(input.marginPct, 0) / 25, 1) * 22;
  score += margin;
  signals.push({
    label: "마진",
    impact: input.marginPct >= 15 ? "positive" : input.marginPct >= 8 ? "neutral" : "negative",
    detail: `순마진 ${input.marginPct}% (플랫폼·결제 수수료 반영)`,
    weight: margin,
  });

  const review = Math.min(input.product.reviewCount / 2500, 1) * 12;
  score += review;
  signals.push({
    label: "리뷰·신뢰",
    impact: review > 8 ? "positive" : "neutral",
    detail: `카테고리 벤치마크 리뷰 ${input.product.reviewCount.toLocaleString()} · 평점 ${input.product.rating}`,
    weight: review,
  });

  const priceWin = input.winPriceGap >= 0 ? 14 : input.winPriceGap > -500 ? 8 : 2;
  score += priceWin;
  signals.push({
    label: "가격 우위",
    impact: input.winPriceGap >= 0 ? "positive" : "negative",
    detail:
      input.winPriceGap >= 0
        ? `추천가가 최저 경쟁가 대비 ${input.winPriceGap.toLocaleString()}원 유리`
        : `최저가 대비 ${Math.abs(input.winPriceGap).toLocaleString()}원 높음 — 차별화 필요`,
    weight: priceWin,
  });

  const rank = Math.max(0, (12 - input.product.rank) / 12) * 8;
  score += rank;
  signals.push({
    label: "노출 잠재",
    impact: rank > 5 ? "positive" : "neutral",
    detail: `유사 상품 랭킹 참고 #${input.product.rank}`,
    weight: rank,
  });

  const trendBonus = input.keyword.trendPct > 8 ? 6 : input.keyword.trendPct < -8 ? -4 : 0;
  score += trendBonus;
  if (trendBonus !== 0) {
    signals.push({
      label: "키워드 추세",
      impact: trendBonus > 0 ? "positive" : "negative",
      detail: `최근 검색 추세 ${input.keyword.trendPct > 0 ? "상승" : "하락"} (${input.keyword.trendPct}%)`,
      weight: Math.abs(trendBonus),
    });
  }

  const spreadBonus =
    input.priceSpreadPct != null && input.priceSpreadPct > 25
      ? 5
      : input.priceSpreadPct != null && input.priceSpreadPct < 10
        ? -2
        : 0;
  score += spreadBonus;
  if (spreadBonus !== 0 && input.priceSpreadPct != null) {
    signals.push({
      label: "가격 분산",
      impact: spreadBonus > 0 ? "positive" : "neutral",
      detail:
        spreadBonus > 0
          ? `경쟁가 스프레드 ${input.priceSpreadPct}% — 틈새 포지셔닝 가능`
          : `경쟁가가 촘촘(${input.priceSpreadPct}%) — 차별화 필수`,
      weight: Math.abs(spreadBonus),
    });
  }

  if (input.highThreatCompetitors != null && input.highThreatCompetitors >= 2) {
    score -= 4;
    signals.push({
      label: "고위험 경쟁",
      impact: "negative",
      detail: `저가·고랭킹 경쟁사 ${input.highThreatCompetitors}곳 — 가격 전쟁 주의`,
      weight: 4,
    });
  }

  return { score: Math.min(99, Math.max(0, Math.round(score))), signals };
}

export function buildActionSteps(mode: "consignment" | "import", input: {
  keyword: string;
  productName: string;
  priceKrw: number;
  supplierLabel: string;
  supplierCost: number;
}): string[] {
  if (mode === "consignment") {
    return [
      `「${input.keyword}」 키워드로 토스쇼핑 상품명·검색어 등록`,
      `위탁 공급처 확보 (목표 공급가 ${input.supplierCost.toLocaleString()}원 이하)`,
      `판매가 ${input.priceKrw.toLocaleString()}원 설정 · 경쟁가 대비 -100원 내외 유지`,
      `썸네일·상세: 상위 3개 경쟁 상품 대비 차별 포인트 2개 이상`,
      `출고 3일 이내 · 리뷰 10개 목표 (첫 2주 프로모션)`,
    ];
  }
  return [
    `${input.supplierLabel} 소싱 견적 (FOB $${(input.supplierCost / 1380).toFixed(2)} 목표)`,
    `통관·관세·국제배송 랜딩비 확정 후 마진 재계산`,
    `「${input.keyword}」 국내 키워드 SEO · ${input.productName} 등록`,
    `판매가 ${input.priceKrw.toLocaleString()}원 · 국내 중위가 -2% 전략`,
    `KC/인증 필요 카테고리면 사전 확인 후 입고`,
  ];
}

export function assessRisks(input: {
  marginPct: number;
  competitionIntensity: number;
  dataQuality: MarketContext["dataQuality"];
  highThreatCompetitors: number;
}): string[] {
  const risks: string[] = [];
  if (input.dataQuality === "demo") {
    risks.push("데모 데이터 기반 — 입점 후 API 연동 시 추천가·경쟁사가 변경될 수 있음");
  } else if (input.dataQuality === "mixed") {
    risks.push("일부 실데이터·일부 시뮬레이션 혼합 — 입점 후 정밀도 상승");
  }
  if (input.marginPct < 10) risks.push("마진 10% 미만 — 프로모션·반품 시 적자 가능");
  if (input.competitionIntensity > 1.8) risks.push("경쟁 과열 구간 — 광고비 없이 상위 노출 어려움");
  if (input.highThreatCompetitors >= 2) risks.push("저가·고랭킹 경쟁사 2곳 이상 — 가격 전쟁 주의");
  if (risks.length === 0) risks.push("현재 데이터 기준 특이 리스크 낮음 — 입점 후 1주 재분석 권장");
  return risks;
}

export function rankKeywordsForSourcing(
  catalog: CatalogProduct[],
  marketKeywords?: Record<string, MarketKeywordMetrics>,
  limit = 40,
): KeywordIntel[] {
  const seen = new Set<string>();
  const list: KeywordIntel[] = [];

  for (const d of getDiscoveryKeywords()) {
    if (seen.has(d.keyword)) continue;
    seen.add(d.keyword);
    list.push(buildKeywordIntel(d.keyword, catalog, marketKeywords));
  }

  for (const p of catalog) {
    // 발굴 표본은 자기를 찾아낸 검색어를 알고 있다 — 그 구절을 그대로 쓴다.
    //
    // 상품명을 공백으로 쪼개 첫 두 낱말을 키워드로 삼으면 "주방 집게"가
    // "주방"·"집게"가 된다. 그건 우리가 실제로 상품을 찾은 검색어가 아니라
    // 훨씬 경쟁이 센 헤드 키워드이고, 위탁판매의 전제인 틈새 공략과 정반대다.
    // (상위셀러 전술의 롱테일 항목 두 개가 이것 때문에 늘 탈락했다.)
    if (p.sourceKeyword) {
      if (seen.has(p.sourceKeyword)) continue;
      seen.add(p.sourceKeyword);
      list.push(buildKeywordIntel(p.sourceKeyword, catalog, marketKeywords));
      continue;
    }
    const words = p.name.split(/\s+/).filter((w) => w.length >= 2);
    for (const w of words.slice(0, 2)) {
      if (seen.has(w)) continue;
      seen.add(w);
      list.push(buildKeywordIntel(w, catalog, marketKeywords));
    }
  }

  return list
    .sort((a, b) => {
      const scoreA = a.searchVolume / Math.max(a.competitionIntensity, 0.3);
      const scoreB = b.searchVolume / Math.max(b.competitionIntensity, 0.3);
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

export function pickBestProductForKeyword(
  keyword: string,
  category: TossShopCategory,
  catalog: CatalogProduct[],
  marketKeywords?: Record<string, MarketKeywordMetrics>,
): CatalogProduct | null {
  const intel = buildKeywordIntel(keyword, catalog, marketKeywords);
  const candidates = catalog
    .filter(
      (p) =>
        p.category === category ||
        p.name.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().split(/\s+/).some((part) => p.name.toLowerCase().includes(part)),
    )
    .map((p) => {
      const competitors = competitorsForProduct(p, catalog);
      const supplier = estimateSupplierCost(p.priceKrw, p.category);
      const pricing = buildPricingBreakdown(supplier, competitors);
      const { score } = scoreOpportunity({
        keyword: intel,
        marginPct: pricing.marginPct,
        product: p,
        competitorCount: competitors.length,
        winPriceGap: pricing.competitorLowKrw - pricing.undercutKrw,
      });
      return { product: p, score, pricing };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.product ?? null;
}

export function marketContext(
  catalog: CatalogProduct[],
  marketKeywords?: Record<string, MarketKeywordMetrics>,
): MarketContext {
  return {
    catalogSize: catalog.length,
    marketKeywordCount: marketKeywords ? Object.keys(marketKeywords).length : 0,
    dataQuality: inferDataQuality(catalog),
    analyzedAt: new Date().toISOString(),
  };
}