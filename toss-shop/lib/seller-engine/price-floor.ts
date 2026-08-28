/**
 * 가격 하한 — "이 가격에 팔면 진짜로 얼마가 남는가"의 단일 진실원
 *
 * ★ 왜 이 모듈이 생겼는가 — 마진 하한이 마진을 지키지 못하고 있었다
 *
 * 세 곳(pricing.autoMatchPrice · intelligence.buildPricingBreakdown ·
 * revenue-engine.buildPricingScenarios)이 똑같이 이렇게 계산하고 있었다:
 *
 *     floor = 공급가 × (1 + 목표마진 / 100)
 *
 * 이건 **원가 대비 인상률**이지 마진이 아니다. 마진은 판매가 기준으로,
 * 수수료를 뺀 뒤에 재는 값이다. 둘의 차이가 얼마나 큰지 실제로 넣어보면:
 *
 *     공급가 10,000원, 목표마진 12% → floor = 11,200원
 *     수수료(판매 8% + 결제 2.5%) = 11,200 × 0.105 = 1,176원
 *     순익 = 11,200 − 10,000 − 1,176 = 24원
 *     실제 마진 = 24 / 11,200 = **0.2%**
 *
 * 목표 12%를 넣었는데 0.2%가 나온다. 그리고 consignment.ts에 남아 있는
 * 실측 기록이 정확히 이 숫자다 — "모든 후보가 「마진 0.2%」로 탈락했다."
 * 당시엔 원인을 공급처 재검색 불일치로 봤지만, 재검색을 고친 뒤에도 이 공식이
 * 그대로 남아 같은 0.2%를 계속 만들고 있었다. 확실성 게이트는 15%를 요구하므로,
 * **가격 엔진이 게이트를 통과할 수 없는 가격만 만들어내는 구조**였다.
 *
 * ★ 올바른 역산
 *
 * 판매가 P, 공급가 C, 판매가 비례 비용률 r(수수료 + 광고), 건당 고정비 F,
 * 목표 마진 t 일 때:
 *
 *     (P − C − rP − F) / P ≥ t
 *     P(1 − r − t) ≥ C + F
 *     P ≥ (C + F) / (1 − r − t)
 *
 * 분모가 0 이하면 그 목표 마진은 어떤 가격으로도 달성할 수 없다 —
 * 가격을 올려도 비용이 같은 비율로 따라 오르기 때문이다. 그때는 도달 불가로
 * 보고한다. 임의의 큰 수를 돌려주면 그 위에 계산이 계속 쌓인다.
 *
 * ★ 광고비를 왜 하한에 넣는가
 *
 * 마진 15%로 팔면서 매출의 10%를 광고에 쓰면 실제로 남는 건 5%다. 광고를 켤
 * 상품인데 광고비를 뺀 적이 없으면, 게이트를 통과한 SKU가 광고를 켜는 순간
 * 적자로 바뀐다. ad-strategy-engine이 이미 보수적 전환율 가정을 갖고 있으므로
 * 같은 가정을 여기서도 쓴다 — 두 곳이 다른 가정을 쓰면 손익분기가 어긋난다.
 *
 * ★ 낙관 금지
 *
 * 광고 없이 팔 계획이면 광고비는 0으로 두면 된다. 하지만 기본값은 "광고를 켠다"
 * 쪽이다. 위탁 신규 SKU는 초기 노출이 없어 광고 없이는 사실상 안 팔리기 때문에,
 * 광고비 0을 기본값으로 두는 건 대부분의 경우 마진을 부풀리는 가정이 된다.
 */

import { effectiveSalesFeeRate, type TossFeeContext } from "./fee-model";
import { TOSS_PAYMENT_FEE_RATE } from "./toss-policy-engine";

export const PRICE_FLOOR_VERSION = "1.0";

/**
 * 광고를 켠 SKU가 매출에서 광고비로 쓰게 되는 비율(ACoS) 기본 가정.
 *
 * ad-strategy-engine의 손익분기 계산과 같은 뿌리에서 나온 값이다. 그쪽은
 * "전환율 2% · 증분 70%"를 가정해 CPC 상한을 잡고, 그 상한의 65%로 입찰한다.
 * 그렇게 입찰했을 때 매출 대비 광고비는 대략 순익의 절반 수준에서 움직인다.
 * 여기서는 그보다 보수적으로, **판매가의 8%**를 기본 광고비로 잡는다.
 *
 * ⚠️ 이건 실측이 아니라 가정이다. 등록 후 실제 광고 데이터가 쌓이면
 * `adCostRatePct`에 실측을 넣어 이 값을 대체해야 한다.
 */
export const ASSUMED_AD_COST_RATE_PCT = 8;

/**
 * 반품 충당 — 판매가 대비 몇 %를 미리 떼어 둘 것인가.
 *
 * 위탁은 청약철회 왕복 배송비를 셀러가 떠안는 경우가 생긴다. 반품률이 2%이고
 * 건당 왕복 5,000원이면 판매가 20,000원 기준 매출의 0.5%다. 카테고리별 실측이
 * 없으므로 전 카테고리 공통으로 보수적인 1%를 쓴다.
 *
 * ⚠️ 실측 반품률이 생기면 카테고리별로 갈라야 한다. 패션은 이보다 훨씬 높다.
 */
export const ASSUMED_RETURN_RESERVE_RATE_PCT = 1;

export type PriceFloorInput = {
  /** 입고 배송비까지 포함한 실제 원가 (landed cost) */
  supplierCostKrw: number;
  /** 목표 순마진 % — 판매가 기준, 모든 비용을 뺀 뒤 */
  targetMarginPct: number;
  /** 수수료 맥락 (배송 인센티브·광고 유입 면제) */
  feeCtx?: TossFeeContext;
  /**
   * 광고비율 % — 실측이 있으면 넣는다.
   * 광고를 아예 안 걸 SKU면 0을 명시한다. 미지정이면 보수적 기본값.
   */
  adCostRatePct?: number;
  /** 반품 충당률 % — 미지정이면 기본값 */
  returnReserveRatePct?: number;
  /** 건당 고정비 (포장·부자재 등). 위탁은 보통 0 */
  fixedCostPerUnitKrw?: number;
};

export type PriceFloorResult = {
  engineVersion: string;
  /** 목표 마진을 만족하는 최소 판매가. 도달 불가면 null */
  floorKrw: number | null;
  /** 판매가에 비례해 빠지는 총 비용률 (수수료 + 광고 + 반품충당) */
  variableCostRate: number;
  /** 이 목표 마진이 달성 가능한가 */
  achievable: boolean;
  /** 사람이 읽는 근거 */
  reason: string;
  breakdown: {
    salesFeeRate: number;
    paymentFeeRate: number;
    adCostRate: number;
    returnReserveRate: number;
    fixedCostPerUnitKrw: number;
  };
};

function rate(pct: number | undefined, fallback: number): number {
  if (pct === undefined || !Number.isFinite(pct)) return fallback / 100;
  return Math.max(0, pct) / 100;
}

/**
 * 목표 마진을 만족하는 최소 판매가를 역산한다.
 *
 * 달성 불가능한 목표(비용률 + 목표마진 ≥ 100%)면 `floorKrw: null`을 돌려준다.
 * 큰 수를 대신 넣지 않는다 — 호출부가 그걸 유효한 가격으로 착각하면
 * 팔리지 않을 가격표가 조용히 만들어진다.
 */
export function computePriceFloor(input: PriceFloorInput): PriceFloorResult {
  const feeCtx = input.feeCtx ?? {};
  const salesFeeRate = effectiveSalesFeeRate(feeCtx);
  const paymentFeeRate = TOSS_PAYMENT_FEE_RATE;
  const adCostRate = rate(input.adCostRatePct, ASSUMED_AD_COST_RATE_PCT);
  const returnReserveRate = rate(input.returnReserveRatePct, ASSUMED_RETURN_RESERVE_RATE_PCT);
  const fixedCost = Math.max(0, input.fixedCostPerUnitKrw ?? 0);

  const variableCostRate = salesFeeRate + paymentFeeRate + adCostRate + returnReserveRate;
  const target = Math.max(0, input.targetMarginPct) / 100;
  const denominator = 1 - variableCostRate - target;

  const breakdown = {
    salesFeeRate,
    paymentFeeRate,
    adCostRate,
    returnReserveRate,
    fixedCostPerUnitKrw: fixedCost,
  };

  if (denominator <= 0) {
    return {
      engineVersion: PRICE_FLOOR_VERSION,
      floorKrw: null,
      variableCostRate,
      achievable: false,
      reason:
        `목표 마진 ${input.targetMarginPct}% 달성 불가 — 판매가 비례 비용이 이미 ` +
        `${Math.round(variableCostRate * 100)}%라 가격을 올려도 비용이 같이 오른다. ` +
        `광고비를 줄이거나 배송 인센티브(판매수수료 0%)를 확보해야 한다.`,
      breakdown,
    };
  }

  const floorKrw = Math.ceil((input.supplierCostKrw + fixedCost) / denominator);

  return {
    engineVersion: PRICE_FLOOR_VERSION,
    floorKrw,
    variableCostRate,
    achievable: true,
    reason:
      `공급가 ${input.supplierCostKrw.toLocaleString()}원 · 비례비용 ${Math.round(variableCostRate * 100)}%` +
      `(수수료 ${Math.round((salesFeeRate + paymentFeeRate) * 100)}% · 광고 ${Math.round(adCostRate * 100)}%` +
      ` · 반품충당 ${Math.round(returnReserveRate * 100)}%)` +
      ` → 마진 ${input.targetMarginPct}% 최소가 ${floorKrw.toLocaleString()}원`,
    breakdown,
  };
}

/**
 * 이 가격에서 실제로 남는 마진 % — 광고·반품까지 뺀 값.
 *
 * `revenue-engine.netProfitPerUnit`은 수수료만 뺀다. 그건 "플랫폼에 내고 남는
 * 돈"이고, 이 함수는 "광고까지 돌린 뒤 실제로 손에 남는 돈"이다. 둘은 다르며,
 * 소싱 판단에 써야 하는 건 후자다.
 */
export function trueMarginPct(input: {
  supplierCostKrw: number;
  priceKrw: number;
  feeCtx?: TossFeeContext;
  adCostRatePct?: number;
  returnReserveRatePct?: number;
  fixedCostPerUnitKrw?: number;
}): number {
  if (input.priceKrw <= 0) return 0;
  const salesFeeRate = effectiveSalesFeeRate(input.feeCtx ?? {});
  const adCostRate = rate(input.adCostRatePct, ASSUMED_AD_COST_RATE_PCT);
  const returnReserveRate = rate(input.returnReserveRatePct, ASSUMED_RETURN_RESERVE_RATE_PCT);
  const fixedCost = Math.max(0, input.fixedCostPerUnitKrw ?? 0);

  const variableCost =
    input.priceKrw * (salesFeeRate + TOSS_PAYMENT_FEE_RATE + adCostRate + returnReserveRate);
  const net = input.priceKrw - input.supplierCostKrw - variableCost - fixedCost;
  return Math.round((net / input.priceKrw) * 1000) / 10;
}

/**
 * 광고비·반품충당까지 뺀 **개당 실순익(원)**.
 *
 * ★ 왜 별도로 필요한가
 *
 * `revenue-engine.netProfitPerUnit`은 수수료만 뺀다. 그 값이 그대로
 * `estimatedMonthlyProfitKrw`가 되고, 그게 다시
 *
 *   · 확실성 게이트의 "월 기여 30만원+" 판정
 *   · 자비스 신뢰도 점수
 *   · 목표 기여도 계산
 *   · 수익 확률 시뮬레이션의 단위 순익
 *
 * 으로 전부 흘러간다. 그런데 우리는 **광고를 켤 계획**이다. 광고비를 빼지
 * 않은 순익으로 이 판정을 하면, 게이트를 통과한 SKU가 광고를 켜는 순간
 * 기대치에 못 미친다. 매출의 8%를 광고에 쓰면 개당 순익이 판매가의 8%만큼
 * 줄어드는데, 저마진 상품에서 그건 순익의 절반이 넘기도 한다.
 *
 * 가격 하한은 이미 광고비를 반영하도록 고쳤다(computePriceFloor).
 * 수익 전망도 같은 기준을 써야 둘이 어긋나지 않는다.
 */
export function netProfitPerUnitAfterAds(input: {
  supplierCostKrw: number;
  priceKrw: number;
  feeCtx?: TossFeeContext;
  adCostRatePct?: number;
  returnReserveRatePct?: number;
  fixedCostPerUnitKrw?: number;
}): number {
  if (input.priceKrw <= 0) return 0;
  const salesFeeRate = effectiveSalesFeeRate(input.feeCtx ?? {});
  const adCostRate = rate(input.adCostRatePct, ASSUMED_AD_COST_RATE_PCT);
  const returnReserveRate = rate(input.returnReserveRatePct, ASSUMED_RETURN_RESERVE_RATE_PCT);
  const fixedCost = Math.max(0, input.fixedCostPerUnitKrw ?? 0);

  const variableCost =
    input.priceKrw * (salesFeeRate + TOSS_PAYMENT_FEE_RATE + adCostRate + returnReserveRate);
  return Math.round(input.priceKrw - input.supplierCostKrw - variableCost - fixedCost);
}

// ─────────────────────────────────────────────────────────────
// 매력가격 (구매심리)
// ─────────────────────────────────────────────────────────────

/**
 * 끝자리를 왜 다듬는가.
 *
 * 13,847원은 "계산해서 나온 값"으로 읽히고, 12,900원은 "정해진 값"으로 읽힌다.
 * 같은 가격대라도 후자가 신뢰를 준다. 끝자리 9는 국내 커머스에서 관습적으로
 * 자리잡아 어색하지 않으면서 한 단위 아래로 인식되는 효과가 있다.
 *
 * ★ 반드시 **올림**이다.
 * 매력가격을 만들겠다고 하한 아래로 내리면 마진이 깨진다. 심리 효과는
 * 마진을 깎아서까지 살 값어치가 없으므로, 하한 위에서 가장 가까운 매력가격을
 * 고른다. 그래서 이 함수는 절대 입력값보다 낮은 값을 돌려주지 않는다.
 */
export function toCharmPrice(priceKrw: number): number {
  if (!Number.isFinite(priceKrw) || priceKrw <= 0) return 0;

  // 가격대마다 자연스러운 끝자리 단위가 다르다.
  // 만원 미만에서 900원 단위는 촘촘하고, 10만원대에서 900원 단위는 지저분하다.
  const step = priceKrw < 10_000 ? 100 : priceKrw < 100_000 ? 1_000 : 10_000;
  const tail = priceKrw < 10_000 ? 90 : priceKrw < 100_000 ? 900 : 9_000;

  // step 격자 위에서 끝자리 tail을 붙였을 때 입력 이상이 되는 첫 값
  const base = Math.floor(priceKrw / step) * step;
  const candidate = base + tail;
  return candidate >= priceKrw ? candidate : candidate + step;
}

/**
 * 하한을 지키면서 매력가격으로 다듬는다.
 *
 * 천장(경쟁 최고가 등)이 주어졌는데 매력가격이 그걸 넘으면, 올림을 포기하고
 * 원래 가격을 그대로 쓴다 — 심리 효과보다 경쟁 구간 안에 있는 게 중요하다.
 */
export function applyCharmPricing(input: {
  priceKrw: number;
  floorKrw: number | null;
  ceilingKrw?: number;
}): { priceKrw: number; adjusted: boolean; note: string } {
  const floor = input.floorKrw ?? 0;
  const raw = Math.max(input.priceKrw, floor);
  const charm = toCharmPrice(raw);

  if (input.ceilingKrw && charm > input.ceilingKrw) {
    return {
      priceKrw: raw,
      adjusted: false,
      note: `매력가격 ${charm.toLocaleString()}원은 상한 ${input.ceilingKrw.toLocaleString()}원 초과 — 원가격 유지`,
    };
  }

  return {
    priceKrw: charm,
    adjusted: charm !== input.priceKrw,
    note:
      charm === input.priceKrw
        ? "이미 매력가격"
        : `${input.priceKrw.toLocaleString()}원 → ${charm.toLocaleString()}원 (끝자리 정리)`,
  };
}
