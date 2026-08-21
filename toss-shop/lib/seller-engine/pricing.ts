import type { CatalogProduct, CompetitorPriceRef } from "../types";

const PLATFORM_FEE_RATE = 0.08;
const PAYMENT_FEE_RATE = 0.025;

export function estimatePlatformFees(priceKrw: number): number {
  return Math.round(priceKrw * (PLATFORM_FEE_RATE + PAYMENT_FEE_RATE));
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

export function marginPct(costKrw: number, sellKrw: number): number {
  const fees = estimatePlatformFees(sellKrw);
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
