import type { CompetitorProduct } from "../sourcing-detail/competitor-research";

export type MarketFeeProfile = {
  id: string;
  label: string;
  feeRate: number;
  adRate: number;
  otherRate: number;
};

export const MARKET_FEE_PROFILES: MarketFeeProfile[] = [
  { id: "coupang", label: "쿠팡", feeRate: 0.108, adRate: 0.08, otherRate: 0.02 },
  { id: "smartstore", label: "스마트스토어", feeRate: 0.055, adRate: 0.07, otherRate: 0.015 },
  { id: "elevenst", label: "11번가", feeRate: 0.11, adRate: 0.06, otherRate: 0.02 },
  { id: "gmarket", label: "G마켓", feeRate: 0.12, adRate: 0.06, otherRate: 0.02 },
  { id: "auction", label: "옥션", feeRate: 0.12, adRate: 0.05, otherRate: 0.02 },
];

export type CostInputs = {
  costKrw: number;
  fulfillmentKrw?: number;
  targetMarginRate?: number;
  marketId?: string;
};

export type PricingRecommendation = {
  marketId: string;
  marketLabel: string;
  costKrw: number;
  fulfillmentKrw: number;
  totalCostKrw: number;
  competitorMin?: number;
  competitorMedian?: number;
  competitorMax?: number;
  competitorSamples: number;
  recommendedPriceKrw: number;
  vsCompetitorPct?: number;
  estimatedFeeKrw: number;
  estimatedAdKrw: number;
  estimatedNetKrw: number;
  estimatedMarginRate: number;
  breakEvenPriceKrw: number;
  rationale: string;
  priceBand: { aggressive: number; balanced: number; premium: number };
};

function median(nums: number[]): number | undefined {
  if (nums.length === 0) return undefined;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
}

function roundPrice(n: number): number {
  return Math.max(1000, Math.round(n / 100) * 100);
}

export function calcPricing(params: {
  costs: CostInputs;
  competitors: CompetitorProduct[];
  productName?: string;
}): PricingRecommendation {
  const profile =
    MARKET_FEE_PROFILES.find((m) => m.id === (params.costs.marketId ?? "coupang")) ??
    MARKET_FEE_PROFILES[0]!;

  const costKrw = Math.max(0, Number(params.costs.costKrw) || 0);
  const fulfillmentKrw = Math.max(0, Number(params.costs.fulfillmentKrw) || 0);
  const totalCost = costKrw + fulfillmentKrw;
  const targetMargin = Math.min(0.6, Math.max(0.05, params.costs.targetMarginRate ?? 0.25));

  const prices = params.competitors
    .map((c) => c.price)
    .filter((p): p is number => typeof p === "number" && p > 0);

  const competitorMin = prices.length ? Math.min(...prices) : undefined;
  const competitorMax = prices.length ? Math.max(...prices) : undefined;
  const competitorMedian = median(prices);

  const takeRate = profile.feeRate + profile.adRate + profile.otherRate;
  const denom = 1 - takeRate - targetMargin;
  const marginBased = denom > 0.05 ? totalCost / denom : totalCost * 2.2;

  const breakEvenDenom = 1 - takeRate;
  const breakEvenPriceKrw = roundPrice(
    breakEvenDenom > 0.05 ? totalCost / breakEvenDenom : totalCost * 1.5,
  );

  let balanced = marginBased;
  if (competitorMedian) {
    balanced = marginBased * 0.45 + competitorMedian * 0.55;
    if (competitorMin && balanced > competitorMin * 1.15) {
      balanced = competitorMin * 1.05;
    }
  }

  const aggressive = competitorMin
    ? Math.min(balanced * 0.92, competitorMin * 0.98)
    : balanced * 0.9;
  const premium = competitorMedian
    ? Math.max(balanced * 1.12, competitorMedian * 1.08)
    : balanced * 1.15;

  const recommendedPriceKrw = roundPrice(balanced);
  const feeKrw = Math.round(recommendedPriceKrw * profile.feeRate);
  const adKrw = Math.round(recommendedPriceKrw * profile.adRate);
  const otherKrw = Math.round(recommendedPriceKrw * profile.otherRate);
  const net = recommendedPriceKrw - feeKrw - adKrw - otherKrw - totalCost;
  const marginRate = recommendedPriceKrw > 0 ? net / recommendedPriceKrw : 0;

  const vsCompetitorPct =
    competitorMedian && competitorMedian > 0
      ? Math.round(((recommendedPriceKrw - competitorMedian) / competitorMedian) * 1000) / 10
      : undefined;

  let rationale = `${profile.label} 수수료·광고·원가 반영 후 목표 마진 ${(targetMargin * 100).toFixed(0)}% 기준.`;
  if (competitorMedian) {
    rationale += ` 경쟁 중앙값 ${competitorMedian.toLocaleString()}원 대비 ${vsCompetitorPct}% 수준.`;
  } else {
    rationale += " 경쟁가 데이터 없어 원가·수수료 기반으로 산정.";
  }

  return {
    marketId: profile.id,
    marketLabel: profile.label,
    costKrw,
    fulfillmentKrw,
    totalCostKrw: totalCost,
    competitorMin,
    competitorMedian,
    competitorMax,
    competitorSamples: prices.length,
    recommendedPriceKrw,
    vsCompetitorPct,
    estimatedFeeKrw: feeKrw,
    estimatedAdKrw: adKrw,
    estimatedNetKrw: net,
    estimatedMarginRate: Math.round(marginRate * 1000) / 10 / 100,
    breakEvenPriceKrw,
    rationale,
    priceBand: {
      aggressive: roundPrice(aggressive),
      balanced: recommendedPriceKrw,
      premium: roundPrice(premium),
    },
  };
}
