import type { CatalogProduct, CompetitorPriceRef } from "../types";
import { computeFees, type TossFeeContext } from "./fee-model";
import { applyCharmPricing, computePriceFloor } from "./price-floor";
import { assessKeywordRelevance } from "./keyword-relevance";

/**
 * 수수료는 fee-model.ts가 단일 진실원이다 (배송 인센티브 0% · 광고 유입 0%).
 * ctx를 주지 않으면 인센티브 없음(판매수수료 8%)으로 보수적으로 계산한다 —
 * 낙관값을 기본값으로 두면 마진이 조용히 부풀려지기 때문.
 */
export function estimatePlatformFees(priceKrw: number, ctx: TossFeeContext = {}): number {
  return computeFees(priceKrw, ctx).totalFeeKrw;
}

/**
 * 경쟁가에 맞추되 **진짜 마진 하한**을 지킨다.
 *
 * ⚠️ 종전엔 하한을 `공급가 × (1 + minMarginPct/100)`으로 잡았다. 그건 원가
 * 인상률이지 마진이 아니어서, 12%를 넣으면 실제 마진은 0.2%가 나왔다
 * (근거와 계산은 price-floor.ts 참조). 이제 하한은 수수료·광고비·반품충당을
 * 모두 반영해 역산한다.
 *
 * 하한이 경쟁 최저가보다 높으면 **그 사실을 그대로 돌려준다.** 예전처럼
 * 하한으로 눌러 담으면 "경쟁가보다 비싼데 왜 최저가 전략이라고 하지"라는
 * 상태가 되고, 그 가격표로 광고까지 켜지면 돈만 나간다. 팔 수 없는 상품은
 * 팔 수 없다고 말하는 게 맞다 — 판단은 게이트가 한다.
 */
export function autoMatchPrice(
  supplierCostKrw: number,
  competitors: CompetitorPriceRef[],
  minMarginPct = 12,
  feeCtx: TossFeeContext = {},
  opts: { adCostRatePct?: number } = {},
): { priceKrw: number; strategy: string; floorKrw: number | null; belowFloor: boolean } {
  const floor = computePriceFloor({
    supplierCostKrw,
    targetMarginPct: minMarginPct,
    feeCtx,
    adCostRatePct: opts.adCostRatePct,
  });
  const minPrice = floor.floorKrw;

  if (minPrice === null) {
    // 어떤 가격으로도 목표 마진이 안 나온다 — 임의의 숫자를 만들지 않는다
    return { priceKrw: 0, strategy: floor.reason, floorKrw: null, belowFloor: true };
  }

  if (!competitors.length) {
    const charm = applyCharmPricing({ priceKrw: minPrice, floorKrw: minPrice });
    return {
      priceKrw: charm.priceKrw,
      strategy: `경쟁 데이터 없음 — 마진 ${minMarginPct}% 하한가 ${charm.priceKrw.toLocaleString()}원`,
      floorKrw: minPrice,
      belowFloor: false,
    };
  }

  const stats = priceStatistics(competitors.map((c) => c.priceKrw));

  let target = Math.min(stats.low - 100, Math.round(stats.median * 0.98));
  if (stats.low === stats.median && stats.low > 0) {
    target = Math.round(stats.low * 0.99);
  }

  // 경쟁가로는 하한을 못 맞추는 상황 — 숨기지 않고 드러낸다
  const belowFloor = target < minPrice;
  if (belowFloor) target = minPrice;

  const charm = applyCharmPricing({
    priceKrw: target,
    floorKrw: minPrice,
    // 매력가격 올림이 경쟁 최고가를 넘지 않게 한다
    ceilingKrw: stats.high > 0 ? stats.high : undefined,
  });
  const priceKrw = charm.priceKrw;

  let strategy: string;
  if (belowFloor) {
    strategy =
      `⚠️ 경쟁 최저가 ${stats.low.toLocaleString()}원으로는 마진 ${minMarginPct}%가 안 나온다 — ` +
      `하한 ${minPrice.toLocaleString()}원 적용 (경쟁가 대비 +${Math.round(((priceKrw - stats.low) / Math.max(stats.low, 1)) * 100)}%)`;
  } else if (priceKrw <= stats.low) {
    strategy = `최저가 ${stats.low.toLocaleString()}원 대비 -${(stats.low - priceKrw).toLocaleString()}원 (Buy Box 유리)`;
  } else if (priceKrw <= stats.median) {
    strategy = `중위가 ${stats.median.toLocaleString()}원 대비 -${Math.round(((stats.median - priceKrw) / stats.median) * 100)}%`;
  } else {
    strategy = `프리미엄 · 중위가 +${Math.round(((priceKrw - stats.median) / Math.max(stats.median, 1)) * 100)}%`;
  }

  return { priceKrw, strategy, floorKrw: minPrice, belowFloor };
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

/**
 * 이 상품의 경쟁 상품들.
 *
 * ⚠️ 종전 조건은 `p.category === product.category || 토큰 하나라도 겹침`이었다.
 * 두 조건 모두 너무 헐거웠다:
 *
 *  · 카테고리만 같으면 통과 → 「생수 2L」의 경쟁자로 「커피 원두」가 들어온다
 *  · 2글자 이상 토큰 하나만 겹쳐도 통과 → "대용량", "세트" 같은 수식어 하나로
 *    전혀 다른 물건이 경쟁자가 된다
 *
 * 경쟁가는 판매가를 정하는 기준이다. 여기가 오염되면 **엉뚱한 상품 가격에
 * 맞춰 값을 매기게 된다** — 남의 물건 가격을 보고 내 물건 값을 정하는 셈이라
 * 최저가 경쟁에서 지거나, 반대로 팔리지 않는 가격이 된다.
 *
 * 그래서 같은 물건인지를 관련성 판정으로 확인한다. 판정을 못 하겠으면
 * 경쟁자로 세지 않는다 — 잘못된 경쟁가가 들어오는 것보다 데이터가 없는 게 낫다
 * (경쟁 데이터가 없으면 autoMatchPrice가 마진 하한가를 쓴다).
 */
export function competitorsForProduct(
  product: CatalogProduct,
  catalog: CatalogProduct[],
): CompetitorPriceRef[] {
  return catalog
    .filter((p) => {
      if (p.id === product.id) return false;
      // 같은 물건을 파는가 — 상품명끼리 맞대어 본다
      return assessKeywordRelevance({ keyword: product.name, productName: p.name }).relevant;
    })
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
