/**
 * MatchCut unit economics — ≥30% gross margin at worst-case OpenAI usage.
 * Pack credits are sized so full utilization on standard pages stays profitable.
 */

export const MIN_GROSS_MARGIN_RATE = 0.3;
export const PAYMENT_FEE_RATE = 0.05;
/** Policy floor — generous pack credits don't lower per-action pricing. */
export const POLICY_FLOOR_CREDIT_KRW = 95;
/** Safety buffer on worst-case API estimates (retries, QA, vision). */
export const API_COST_BUFFER = 1.15;

/**
 * Worst-case API cost per operation (KRW, ~USD×1,400).
 * Medium image quality + single QA attempt (see vision-generate).
 * Sized for pack-level margin at 19,900₩ / ~20 standard pages — not inflated padding.
 */
export const WORST_API_COST_KRW = {
  match: 100,
  generateOverhead: 150,
  angleEdit: 250,
  thumbnailMedium: 35,
  fixAngle: 400,
  adCard: 250,
  pricing: 50,
  marketRegister: 60,
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
    n * WORST_API_COST_KRW.angleEdit +
    thumbs * WORST_API_COST_KRW.thumbnailMedium
  );
}

export function worstStandardPageApiKrw(): number {
  return WORST_API_COST_KRW.match + worstGeneratePackageApiKrw(1);
}

export function worstFullPageApiKrw(angles = 3): number {
  return WORST_API_COST_KRW.match + worstGeneratePackageApiKrw(angles);
}

export function grossMarginRate(revenueKrw: number, apiCostKrw: number): number {
  if (revenueKrw <= 0) return 0;
  const netRevenue = revenueKrw * (1 - PAYMENT_FEE_RATE);
  return (netRevenue - apiCostKrw) / netRevenue;
}

export function standardPagesInPack(pack: SellablePack, creditsPerStandardPage: number): number {
  if (creditsPerStandardPage <= 0) return 0;
  return Math.floor(pack.credits / creditsPerStandardPage);
}

/** Worst-case API if every credit in the pack goes to standard pages (full utilization). */
export function worstPackStandardPageApiKrw(pack: SellablePack, creditsPerStandardPage: number): number {
  const pages = standardPagesInPack(pack, creditsPerStandardPage);
  return pages * worstStandardPageApiKrw();
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

/** Pack sold at list price — customer uses all credits on standard pages at worst API. */
export function assertPackWorstCaseMargin(params: {
  pack: SellablePack;
  creditsPerStandardPage: number;
}): void {
  const pages = standardPagesInPack(params.pack, params.creditsPerStandardPage);
  if (pages <= 0) {
    throw new Error(`Pack ${params.pack.id} yields 0 standard pages`);
  }
  const apiCost = worstPackStandardPageApiKrw(params.pack, params.creditsPerStandardPage);
  const margin = grossMarginRate(params.pack.priceKrw, apiCost);
  if (margin < MIN_GROSS_MARGIN_RATE) {
    throw new Error(
      `Pack ${params.pack.id} worst-case margin ${(margin * 100).toFixed(1)}% below ${MIN_GROSS_MARGIN_RATE * 100}% (${pages} pages, API ${apiCost}₩)`,
    );
  }
}
