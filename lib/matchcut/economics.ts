/**
 * MatchCut unit economics — credit costs must stay ≥50% gross margin
 * even at worst-case OpenAI usage on the cheapest credit pack.
 */

export const MIN_GROSS_MARGIN_RATE = 0.5;
export const PAYMENT_FEE_RATE = 0.05;
/** Safety buffer on worst-case API estimates (retries, QA, vision) */
export const API_COST_BUFFER = 1.2;

/** Worst-case API cost per operation (KRW, ~USD×1,400) */
export const WORST_API_COST_KRW = {
  match: 450,
  generateOverhead: 900,
  angleHighEdit: 1100,
  thumbnailMedium: 120,
  fixAngle: 950,
  adCard: 550,
  pricing: 80,
  marketRegister: 100,
} as const;

export type SellablePack = { id: string; credits: number; priceKrw: number };

/** Lowest effective KRW per credit across all paid packs — margin floor. */
export function floorCreditKrw(packs: SellablePack[]): number {
  let floor = Infinity;
  for (const p of packs) {
    if (p.credits <= 0 || p.priceKrw <= 0) continue;
    floor = Math.min(floor, p.priceKrw / p.credits);
  }
  return floor === Infinity ? 100 : floor;
}

/** Minimum credits so gross margin ≥ MIN_GROSS_MARGIN_RATE after payment fees. */
export function minCreditsForMargin(apiCostKrw: number, floorKrwPerCredit: number): number {
  const safeCost = apiCostKrw * API_COST_BUFFER;
  const netRevenueNeeded = safeCost / (1 - MIN_GROSS_MARGIN_RATE);
  const grossRevenueNeeded = netRevenueNeeded / (1 - PAYMENT_FEE_RATE);
  return Math.max(1, Math.ceil(grossRevenueNeeded / floorKrwPerCredit));
}

export function worstGeneratePackageApiKrw(angles: number, withThumbnails = true): number {
  const n = Math.min(5, Math.max(1, Math.round(angles)));
  const thumbs = withThumbnails ? 3 : 0;
  return (
    WORST_API_COST_KRW.generateOverhead +
    n * WORST_API_COST_KRW.angleHighEdit +
    thumbs * WORST_API_COST_KRW.thumbnailMedium
  );
}

export function grossMarginRate(revenueKrw: number, apiCostKrw: number): number {
  if (revenueKrw <= 0) return 0;
  const netRevenue = revenueKrw * (1 - PAYMENT_FEE_RATE);
  return (netRevenue - apiCostKrw) / netRevenue;
}

export function assertMarginFloor(params: {
  credits: number;
  apiCostKrw: number;
  floorKrwPerCredit: number;
}): void {
  const revenue = params.credits * params.floorKrwPerCredit;
  const margin = grossMarginRate(revenue, params.apiCostKrw);
  if (margin < MIN_GROSS_MARGIN_RATE) {
    throw new Error(
      `Margin ${(margin * 100).toFixed(1)}% below floor ${MIN_GROSS_MARGIN_RATE * 100}%`,
    );
  }
}
