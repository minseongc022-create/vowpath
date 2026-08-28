import type {
  CatalogProduct,
  CompetitorPriceRef,
  PricingBreakdown,
  ProfitPlaybookItem,
  PricingScenario,
  RevenueForecast,
  TossShopCategory,
} from "../types";
import { estimatePlatformFees, marginPct, priceStatistics } from "./pricing";
import type { TossFeeContext } from "./fee-model";
import { computePriceFloor } from "./price-floor";

type KeywordIntelInput = {
  keyword: string;
  category: TossShopCategory;
  searchVolume: number;
  competitionIntensity: number;
  trendPct?: number;
};

const CATEGORY_CLUSTER: Record<TossShopCategory, string[]> = {
  food: ["유기농", "신선", "간편식", "건강간식"],
  beauty: ["기초", "선케어", "선물", "데일리"],
  home: ["수납", "청소", "침구", "주방"],
  digital: ["무선", "충전", "액세서리", "스마트"],
  fashion: ["데일리", "캐주얼", "시즌", "베이직"],
  health: ["영양", "프로틴", "면역", "건강식품"],
};

export const SELLER_AI_ENGINE_VERSION = "jarvis-1.1";

/** Category seasonality multiplier by calendar month (1–12). */
const SEASONALITY: Record<TossShopCategory, number[]> = {
  food: [0.95, 0.9, 1.0, 1.05, 1.1, 1.0, 0.95, 1.0, 1.05, 1.0, 1.15, 1.2],
  beauty: [0.9, 1.0, 1.05, 1.0, 1.0, 0.95, 0.95, 1.0, 1.05, 1.0, 1.1, 1.25],
  home: [0.85, 0.9, 1.05, 1.1, 1.05, 1.0, 0.95, 0.95, 1.0, 1.05, 1.15, 1.2],
  digital: [1.1, 0.95, 0.95, 1.0, 1.0, 1.05, 1.1, 1.05, 1.0, 1.0, 1.15, 1.25],
  fashion: [0.8, 0.85, 1.1, 1.15, 1.05, 0.95, 0.9, 0.95, 1.1, 1.15, 1.2, 1.1],
  health: [1.0, 0.95, 1.0, 1.0, 1.0, 1.0, 0.95, 1.0, 1.05, 1.0, 1.05, 1.1],
};

function seasonalityMultiplier(category: TossShopCategory, at = new Date()): number {
  return SEASONALITY[category][at.getMonth()] ?? 1;
}

/** Estimate daily conversion share from search volume given price position. */
export function estimateDailyUnits(input: {
  searchVolume: number;
  competitionIntensity: number;
  priceKrw: number;
  competitorLowKrw: number;
  competitorMedianKrw: number;
  category: TossShopCategory;
  trendPct?: number;
}): number {
  const base = input.searchVolume / 650;
  const season = seasonalityMultiplier(input.category);
  const trendBoost = 1 + (input.trendPct ?? 0) / 200;

  let priceFactor = 1;
  if (input.competitorLowKrw > 0) {
    const gap = (input.priceKrw - input.competitorLowKrw) / input.competitorLowKrw;
    if (gap <= 0) priceFactor = 1.35;
    else if (gap <= 0.05) priceFactor = 1.1;
    else if (gap <= 0.12) priceFactor = 0.85;
    else priceFactor = 0.55;
  }

  const compPenalty = 1 / (1 + input.competitionIntensity * 0.35);
  const units = base * season * trendBoost * priceFactor * compPenalty;
  return Math.max(0.5, Math.round(units * 10) / 10);
}

export function netProfitPerUnit(
  supplierCostKrw: number,
  priceKrw: number,
  feeCtx: TossFeeContext = {},
): number {
  return priceKrw - supplierCostKrw - estimatePlatformFees(priceKrw, feeCtx);
}

export function buildPricingScenarios(
  supplierCostKrw: number,
  competitors: CompetitorPriceRef[],
  intel: KeywordIntelInput,
  minMarginPct = 12,
  feeCtx: TossFeeContext = {},
): PricingScenario[] {
  const stats = priceStatistics(competitors.map((c) => c.priceKrw));
  // 하한은 수수료·광고비를 반영해 역산한다 (price-floor.ts).
  // 종전의 `공급가 × (1 + m/100)`은 원가 인상률이라 마진을 지키지 못했다.
  // 역산이 불가능한 경우(비용률+목표마진 ≥ 100%)엔 시나리오를 만들지 않는다 —
  // 어떤 가격을 제시해도 목표 마진이 안 나오는 상황이기 때문.
  const floorResult = computePriceFloor({
    supplierCostKrw,
    targetMarginPct: minMarginPct,
    feeCtx,
  });
  if (floorResult.floorKrw === null) return [];
  const floor = floorResult.floorKrw;

  const candidates: { id: PricingScenario["id"]; price: number; label: string; strategy: string }[] = [];

  if (stats.low > 0) {
    candidates.push({
      id: "volume",
      price: Math.max(floor, stats.low - 100),
      label: "볼륨 극대화",
      strategy: "최저가 -100원 · 전환율 최우선",
    });
  }
  candidates.push({
    id: "balanced",
    price: Math.max(
      floor,
      stats.median > 0 ? Math.round(stats.median * 0.98) : Math.round(supplierCostKrw * 1.35),
    ),
    label: "수익 균형",
    strategy: "중위가 -2% · 마진·전환 균형",
  });
  if (stats.high > 0) {
    candidates.push({
      id: "margin",
      price: Math.max(floor, Math.round(stats.median * 1.05)),
      label: "마진 극대화",
      strategy: "프리미엄 · 건당 이익 최우선",
    });
  }

  const scenarios: PricingScenario[] = candidates.map((c) => {
    const profit = netProfitPerUnit(supplierCostKrw, c.price, feeCtx);
    const dailyUnits = estimateDailyUnits({
      searchVolume: intel.searchVolume,
      competitionIntensity: intel.competitionIntensity,
      priceKrw: c.price,
      competitorLowKrw: stats.low,
      competitorMedianKrw: stats.median,
      category: intel.category,
      trendPct: intel.trendPct,
    });
    const dailyProfitKrw = Math.round(profit * dailyUnits);
    const monthlyProfitKrw = Math.round(dailyProfitKrw * 30);
    return {
      id: c.id,
      label: c.label,
      priceKrw: c.price,
      strategy: c.strategy,
      marginPct: marginPct(supplierCostKrw, c.price, feeCtx),
      netProfitKrw: profit,
      estimatedDailyUnits: dailyUnits,
      estimatedDailyProfitKrw: dailyProfitKrw,
      estimatedMonthlyProfitKrw: monthlyProfitKrw,
    };
  });

  return scenarios.sort((a, b) => b.estimatedMonthlyProfitKrw - a.estimatedMonthlyProfitKrw);
}

export function selectOptimalScenario(scenarios: PricingScenario[]): PricingScenario {
  return scenarios.reduce((best, s) =>
    s.estimatedMonthlyProfitKrw > best.estimatedMonthlyProfitKrw ? s : best,
  );
}

export function buildRevenueForecast(input: {
  dailyProfitKrw: number;
  dailyUnits: number;
  marginPct: number;
  winScore: number;
  seasonalityMultiplier: number;
}): RevenueForecast {
  const daily = input.dailyProfitKrw;
  const weekly = Math.round(daily * 7);
  const monthly = Math.round(daily * 30);
  const optimistic = Math.round(monthly * (1 + input.winScore / 200));
  const conservative = Math.round(monthly * (0.55 + input.marginPct / 100));

  return {
    dailyProfitKrw: daily,
    weeklyProfitKrw: weekly,
    monthlyProfitKrw: monthly,
    optimisticMonthlyKrw: optimistic,
    conservativeMonthlyKrw: conservative,
    seasonalityNote:
      input.seasonalityMultiplier >= 1.1
        ? "시즌 수요 상승 구간 — 재고·광고 예산 확대 권장"
        : input.seasonalityMultiplier <= 0.9
          ? "비수기 — 마진형 SKU 비중 확대"
          : "평시 — 균형 전략 유지",
  };
}

export function computeProfitScore(input: {
  monthlyProfitKrw: number;
  marginPct: number;
  winScore: number;
  competitionIntensity: number;
}): number {
  const profitPart = Math.min(input.monthlyProfitKrw / 800_000, 1) * 45;
  const marginPart = Math.min(Math.max(input.marginPct, 0) / 30, 1) * 25;
  const winPart = (input.winScore / 99) * 20;
  const compPart = Math.max(0, (2 - input.competitionIntensity) / 2) * 10;
  return Math.min(99, Math.round(profitPart + marginPart + winPart + compPart));
}

export function buildKeywordCluster(keyword: string, category: TossShopCategory): string[] {
  const extras = CATEGORY_CLUSTER[category] ?? [];
  const cluster = [keyword, ...extras.map((e) => `${keyword} ${e}`), category];
  return [...new Set(cluster)].slice(0, 6);
}

export function buildMoatOpportunities(input: {
  product: CatalogProduct;
  competitors: CompetitorPriceRef[];
  landscapeDominance: string;
  avgReviewCount: number;
}): string[] {
  const ops: string[] = [];
  const stats = priceStatistics(input.competitors.map((c) => c.priceKrw));

  if (input.landscapeDominance === "fragmented") {
    ops.push("가격 분산 큼 — 중간 가격대 + 빠른 배송으로 틈새 공략");
  }
  if (input.product.reviewCount < input.avgReviewCount * 0.5) {
    ops.push("리뷰 밀도 낮음 — 초기 2주 리뷰 이벤트로 신뢰 격차 메우기");
  }
  if (stats.high > stats.median * 1.3) {
    ops.push(`프리미엄 구간(${stats.high.toLocaleString()}원+) 존재 — 고급 패키징·구성 차별화`);
  }
  if (input.competitors.filter((c) => c.rank <= 5).length >= 3) {
    ops.push("상위 5개 셀러 집중 — 썸네일·상품명 A/B 테스트 필수");
  }
  if (ops.length === 0) {
    ops.push("번들·증정·당일출고 중 1가지 이상으로 전환율 차별화");
  }
  return ops.slice(0, 4);
}

export function buildProfitPlaybook(input: {
  keyword: string;
  priceKrw: number;
  monthlyProfitKrw: number;
  moatOps: string[];
  mode: "consignment" | "import";
}): ProfitPlaybookItem[] {
  const base = input.monthlyProfitKrw;
  const items: ProfitPlaybookItem[] = [
    {
      priority: 1,
      action: `「${input.keyword}」 키워드 상품 등록 · 판매가 ${input.priceKrw.toLocaleString()}원`,
      expectedImpactKrw: Math.round(base * 0.4),
      timeframe: "1–3일",
      roi: "high",
    },
    {
      priority: 2,
      action: "상위 3 경쟁사 썸네일·상세 분석 후 차별 포인트 2개 반영",
      expectedImpactKrw: Math.round(base * 0.15),
      timeframe: "3–5일",
      roi: "high",
    },
    {
      priority: 3,
      action: input.mode === "consignment" ? "위탁 공급처 MOQ·출고 SLA 협상" : "랜딩비 5% 절감 재견적",
      expectedImpactKrw: Math.round(base * 0.12),
      timeframe: "1주",
      roi: "medium",
    },
    {
      priority: 4,
      action: input.moatOps[0] ?? "리뷰 10개 목표 프로모션",
      expectedImpactKrw: Math.round(base * 0.1),
      timeframe: "2주",
      roi: "medium",
    },
    {
      priority: 5,
      action: "연관 키워드 3개 추가 등록 · 검색 노출 확대",
      expectedImpactKrw: Math.round(base * 0.08),
      timeframe: "2주",
      roi: "medium",
    },
  ];
  return items;
}

export function applyScenarioToPricing(
  supplierCostKrw: number,
  scenario: PricingScenario,
  competitors: CompetitorPriceRef[],
  feeCtx: TossFeeContext = {},
): PricingBreakdown {
  const stats = priceStatistics(competitors.map((c) => c.priceKrw));
  const priceKrw = scenario.priceKrw;
  const fees = estimatePlatformFees(priceKrw, feeCtx);
  return {
    supplierCostKrw,
    platformFeesKrw: fees,
    netProfitKrw: scenario.netProfitKrw,
    marginPct: scenario.marginPct,
    strategy: scenario.strategy,
    priceFloorKrw: Math.round(supplierCostKrw * 1.12),
    priceCeilingKrw: stats.high > 0 ? Math.round(stats.high * 0.95) : Math.round(priceKrw * 1.2),
    competitorLowKrw: stats.low,
    competitorMedianKrw: stats.median,
    competitorHighKrw: stats.high,
    undercutKrw: priceKrw,
  };
}

export function buildPortfolioBrief(picks: { monthlyProfitKrw: number; profitScore: number; keyword: string }[]): {
  totalMonthlyProfitKrw: number;
  avgProfitScore: number;
  topKeyword: string;
  engineVersion: string;
} {
  if (!picks.length) {
    return { totalMonthlyProfitKrw: 0, avgProfitScore: 0, topKeyword: "", engineVersion: SELLER_AI_ENGINE_VERSION };
  }
  const total = picks.reduce((s, p) => s + p.monthlyProfitKrw, 0);
  const avg = Math.round(picks.reduce((s, p) => s + p.profitScore, 0) / picks.length);
  const top = [...picks].sort((a, b) => b.monthlyProfitKrw - a.monthlyProfitKrw)[0];
  return {
    totalMonthlyProfitKrw: total,
    avgProfitScore: avg,
    topKeyword: top.keyword,
    engineVersion: SELLER_AI_ENGINE_VERSION,
  };
}

export type V4Enrichment = {
  pricingScenarios: PricingScenario[];
  optimal: PricingScenario;
  pricing: PricingBreakdown;
  revenueForecast: RevenueForecast;
  profitScore: number;
  keywordCluster: string[];
  moatOpportunities: string[];
  profitPlaybook: ProfitPlaybookItem[];
  dailyUnits: number;
  v4: {
    engineVersion: string;
    profitScore: number;
    recommendedScenarioId: PricingScenario["id"];
    keywordCluster: string[];
    moatOpportunities: string[];
  };
};

export function buildV4Enrichment(input: {
  supplierCostKrw: number;
  competitors: CompetitorPriceRef[];
  intel: KeywordIntelInput;
  product: CatalogProduct;
  winScore: number;
  landscapeDominance: string;
  avgReviewCount: number;
  mode: "consignment" | "import";
  minMarginPct?: number;
  /**
   * 수수료 맥락. 공급처가 1등급·당일발송으로 검증되면 배송 인센티브로
   * 판매수수료가 0%가 되어 전 시나리오 마진이 8%p 올라간다.
   * 미지정 시 보수적으로 8% — 낙관값을 기본으로 두지 않는다.
   */
  feeCtx?: TossFeeContext;
}): V4Enrichment {
  const feeCtx = input.feeCtx ?? {};
  const scenarios = buildPricingScenarios(
    input.supplierCostKrw,
    input.competitors,
    input.intel,
    input.minMarginPct ?? 12,
    feeCtx,
  );
  const optimal = selectOptimalScenario(scenarios);
  const pricing = applyScenarioToPricing(input.supplierCostKrw, optimal, input.competitors, feeCtx);
  const season = seasonalityMultiplier(input.intel.category);
  const revenueForecast = buildRevenueForecast({
    dailyProfitKrw: optimal.estimatedDailyProfitKrw,
    dailyUnits: optimal.estimatedDailyUnits,
    marginPct: optimal.marginPct,
    winScore: input.winScore,
    seasonalityMultiplier: season,
  });
  const profitScore = computeProfitScore({
    monthlyProfitKrw: optimal.estimatedMonthlyProfitKrw,
    marginPct: optimal.marginPct,
    winScore: input.winScore,
    competitionIntensity: input.intel.competitionIntensity,
  });
  const keywordCluster = buildKeywordCluster(input.intel.keyword, input.intel.category);
  const moatOpportunities = buildMoatOpportunities({
    product: input.product,
    competitors: input.competitors,
    landscapeDominance: input.landscapeDominance,
    avgReviewCount: input.avgReviewCount,
  });
  const profitPlaybook = buildProfitPlaybook({
    keyword: input.intel.keyword,
    priceKrw: optimal.priceKrw,
    monthlyProfitKrw: optimal.estimatedMonthlyProfitKrw,
    moatOps: moatOpportunities,
    mode: input.mode,
  });

  return {
    pricingScenarios: scenarios,
    optimal,
    pricing,
    revenueForecast,
    profitScore,
    keywordCluster,
    moatOpportunities,
    profitPlaybook,
    dailyUnits: optimal.estimatedDailyUnits,
    v4: {
      engineVersion: SELLER_AI_ENGINE_VERSION,
      profitScore,
      recommendedScenarioId: optimal.id,
      keywordCluster,
      moatOpportunities,
    },
  };
}
