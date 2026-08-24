import type { CatalogProduct, CompetitorPriceRef } from "../types";
import { computeFees, type TossFeeContext } from "./fee-model";

/**
 * 수수료는 fee-model.ts가 단일 진실원이다 (배송 인센티브 0% · 광고 유입 0%).
 * ctx를 주지 않으면 인센티브 없음(판매수수료 8%)으로 보수적으로 계산한다 —
 * 낙관값을 기본값으로 두면 마진이 조용히 부풀려지기 때문.
 */
export function estimatePlatformFees(priceKrw: number, ctx: TossFeeContext = {}): number {
  return computeFees(priceKrw, ctx).totalFeeKrw;
}

/** Match or undercut competitors while keeping minimum margin. */
export function autoMatchPrice(
  supplierCostKrw: number,
  competitors: CompetitorPriceRef[],
  minMarginPct = 12,
): { priceKrw: number; strategy: string } {
  if (!competitors.length) {
    const fallback = Math.round(supplierCostKrw * 1.35);
    return { priceKrw: fallback, strategy: "공급가 +35% (경쟁 데이터 없음)" };
  }
  const stats = priceStatistics(competitors.map((c) => c.priceKrw));
  const minPrice = Math.round(supplierCostKrw * (1 + minMarginPct / 100));

  let target = Math.min(stats.low - 100, Math.round(stats.median * 0.98));
  if (stats.low === stats.median && stats.low > 0) {
    target = Math.round(stats.low * 0.99);
  }
  if (target < minPrice) target = minPrice;

  let strategy: string;
  if (target <= stats.low) {
    strategy = `최저가 ${stats.low.toLocaleString()}원 대비 -${(stats.low - target).toLocaleString()}원 (Buy Box 유리)`;
  } else if (target <= stats.median) {
    strategy = `중위가 ${stats.median.toLocaleString()}원 대비 -${Math.round(((stats.median - target) / stats.median) * 100)}%`;
  } else {
    strategy = `프리미엄 · 중위가 +${Math.round(((target - stats.median) / Math.max(stats.median, 1)) * 100)}%`;
  }

  return { priceKrw: Math.max(target, minPrice), strategy };
}

export function marginPct(costKrw: number, sellKrw: number, ctx: TossFeeContext = {}): number {
  const fees = estimatePlatformFees(sellKrw, ctx);
  const profit = sellKrw - costKrw - fees;
  return Math.round((profit / sellKrw) * 1000) / 10;
}

export function priceStatistics(prices: number[]): {
  low: number;
  median: number;
  high: number;
  avg: number;
} {
  if (!prices.length) return { low: 0, median: 0, high: 0, avg: 0 };
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return {
    low: sorted[0],
    median,
    high: sorted[sorted.length - 1],
    avg: Math.round(sorted.reduce((s, p) => s + p, 0) / sorted.length),
  };
}

export function competitorsForProduct(
  product: CatalogProduct,
  catalog: CatalogProduct[],
): CompetitorPriceRef[] {
  return catalog
    .filter(
      (p) =>
        p.id !== product.id &&
        (p.category === product.category ||
          p.name.split(" ").some((w) => product.name.includes(w) && w.length > 1)),
    )
    .sort((a, b) => a.priceKrw - b.priceKrw)
    .slice(0, 12)
    .map((p) => ({ sellerName: p.sellerName, priceKrw: p.priceKrw, rank: p.rank }));
}

export function estimateSupplierCost(marketPriceKrw: number, category: string): number {
  const rates: Record<string, number> = {
    food: 0.55,
    beauty: 0.42,
    home: 0.48,
    digital: 0.58,
    fashion: 0.45,
    health: 0.5,
  };
  const rate = rates[category] ?? 0.5;
  return Math.round(marketPriceKrw * rate);
}
