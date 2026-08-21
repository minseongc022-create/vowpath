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
  const sorted = [...competitors].sort((a, b) => a.priceKrw - b.priceKrw);
  const lowest = sorted[0].priceKrw;
  const median = sorted[Math.floor(sorted.length / 2)].priceKrw;
  const minPrice = Math.round(supplierCostKrw * (1 + minMarginPct / 100));

  let target = Math.min(lowest - 100, Math.round(median * 0.98));
  if (target < minPrice) target = minPrice;

  const strategy =
    target <= lowest
      ? `최저가 ${lowest.toLocaleString()}원 대비 -100원 매칭`
      : `중위가 ${median.toLocaleString()}원 기준 -2%`;

  return { priceKrw: Math.max(target, minPrice), strategy };
}

export function marginPct(costKrw: number, sellKrw: number): number {
  const fees = estimatePlatformFees(sellKrw);
  const profit = sellKrw - costKrw - fees;
  return Math.round((profit / sellKrw) * 1000) / 10;
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
    .slice(0, 8)
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
