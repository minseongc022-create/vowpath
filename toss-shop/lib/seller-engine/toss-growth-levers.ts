/**
 * 토스쇼핑 성장 레버 — 광고 경제성 + 장바구니 쿠폰
 *
 * 출처: shopping-docs.toss.im 공식 문서 (2026-08).
 *  · 광고 소개        /ads/intro          "광고 클릭 후 7일 내 판매건은 수수료 0%"
 *  · 장바구니 알림 쿠폰 /dev/api-1/undefined "장바구니 고객 구매전환율 +45% (토스 내부 실험)"
 *  · 광고 운영하기     /ads/setup/tips      "대표 노출 미선정이면 `노출 제한`"
 *
 * ★ 토스 광고는 다른 플랫폼과 손익 구조가 다르다:
 *   광고로 팔리면 판매수수료(8%)가 면제되므로, 광고비가 그 면제분보다 싸면
 *   광고를 돌릴수록 순이익이 늘어난다. 그래서 "얼마까지 CPC를 내도 되는가"가
 *   감이 아니라 산수로 정확히 나온다.
 *
 * ⚠️ 단, 배송 인센티브로 이미 수수료가 0%인 옵션은 광고의 수수료 면제 효과가
 *    중복되지 않는다 → 그 경우 광고비는 순수 비용이다. 이 상호작용을 놓치면
 *    광고를 켤수록 손해가 난다.
 */

import { TOSS_DEFAULT_SALES_FEE_RATE } from "./toss-policy-engine";

export const GROWTH_LEVERS_VERSION = "1.0";

/** 공식 문서 기준: 광고 클릭 후 7일 내 판매는 판매수수료 0% */
export const AD_ATTRIBUTION_WINDOW_DAYS = 7;
/** 공식 문서 기준: 장바구니 이탈 고객 쿠폰의 전환율 상승폭 (토스 내부 실험) */
export const CART_COUPON_CVR_UPLIFT_PCT = 45;

// ─────────────────────────────────────────────────────────────
// 광고 경제성
// ─────────────────────────────────────────────────────────────

export type AdEconomicsInput = {
  priceKrw: number;
  /** 단위 순익 (수수료 차감 전, 즉 판매가 - 공급가 - 배송비) */
  grossMarginKrw: number;
  /** 광고 클릭 → 구매 전환율 % */
  conversionRatePct: number;
  /** 이 옵션이 이미 배송 인센티브로 수수료 0%인가 */
  alreadyFeeFree: boolean;
  /** 현재 입찰 CPC (없으면 손익분기만 계산) */
  currentCpcKrw?: number;
};

export type AdEconomics = {
  /** 광고가 손해가 되지 않는 최대 CPC */
  breakevenCpcKrw: number;
  /** 수수료 면제로 아끼는 금액 (판매 1건당) */
  feeSavedPerSaleKrw: number;
  /** 판매 1건을 만드는 데 드는 광고비 */
  adCostPerSaleKrw?: number;
  /** 광고를 켰을 때 건당 순이익 변화 */
  netDeltaPerSaleKrw?: number;
  recommendation: "run" | "reduce_bid" | "stop" | "cannot_bid";
  reason: string;
};

/**
 * 광고 손익분기 CPC.
 *
 * 광고 없이 팔면 판매수수료 8%를 낸다. 광고로 팔면 그게 0%다.
 * 따라서 판매 1건당 아끼는 돈 = 판매가 × 8%.
 * 판매 1건을 만들려면 (100/전환율)번 클릭이 필요하므로
 *   손익분기 CPC = 판매가 × 8% × 전환율
 * 이보다 싸게 입찰하면 광고가 순이익을 늘린다.
 */
export function computeAdEconomics(input: AdEconomicsInput): AdEconomics {
  const cvr = Math.max(0, input.conversionRatePct) / 100;

  // 이미 수수료 0%면 광고의 면제 효과가 없다 — 광고비는 순수 비용
  const feeSaved = input.alreadyFeeFree
    ? 0
    : Math.round(input.priceKrw * TOSS_DEFAULT_SALES_FEE_RATE);

  const breakeven = cvr > 0 ? Math.floor(feeSaved * cvr) : 0;

  if (cvr <= 0) {
    return {
      breakevenCpcKrw: 0,
      feeSavedPerSaleKrw: feeSaved,
      recommendation: "cannot_bid",
      reason: "전환율 데이터 없음 — 손익분기 CPC를 계산할 수 없다. 소액으로 전환율부터 측정할 것",
    };
  }

  if (input.alreadyFeeFree) {
    // 수수료 면제가 중복되지 않으므로, 광고는 '추가 노출'의 대가로만 정당화된다
    const costPerSale = input.currentCpcKrw ? Math.round(input.currentCpcKrw / cvr) : undefined;
    return {
      breakevenCpcKrw: 0,
      feeSavedPerSaleKrw: 0,
      adCostPerSaleKrw: costPerSale,
      netDeltaPerSaleKrw: costPerSale ? -costPerSale : undefined,
      recommendation: costPerSale && costPerSale < input.grossMarginKrw * 0.3 ? "run" : "reduce_bid",
      reason:
        "이미 배송 인센티브로 수수료 0% — 광고의 수수료 면제 효과가 중복되지 않는다. " +
        "광고비는 순수 비용이므로 노출 확대가 목적일 때만 소액 유지",
    };
  }

  const costPerSale = input.currentCpcKrw ? Math.round(input.currentCpcKrw / cvr) : undefined;
  const netDelta = costPerSale !== undefined ? feeSaved - costPerSale : undefined;

  let recommendation: AdEconomics["recommendation"] = "run";
  let reason = `손익분기 CPC ${breakeven}원 — 이하로 입찰하면 수수료 면제분(건당 ${feeSaved.toLocaleString()}원)이 광고비보다 커서 순이익이 는다`;

  if (input.currentCpcKrw !== undefined) {
    if (input.currentCpcKrw > breakeven) {
      recommendation = netDelta !== undefined && netDelta < -input.grossMarginKrw * 0.5 ? "stop" : "reduce_bid";
      reason =
        `현재 CPC ${input.currentCpcKrw}원 > 손익분기 ${breakeven}원 — 건당 ${Math.abs(netDelta ?? 0).toLocaleString()}원 손해. ` +
        `${breakeven}원 이하로 낮출 것`;
    } else {
      reason = `현재 CPC ${input.currentCpcKrw}원 ≤ 손익분기 ${breakeven}원 — 건당 ${(netDelta ?? 0).toLocaleString()}원 이득`;
    }
  }

  return {
    breakevenCpcKrw: breakeven,
    feeSavedPerSaleKrw: feeSaved,
    adCostPerSaleKrw: costPerSale,
    netDeltaPerSaleKrw: netDelta,
    recommendation,
    reason,
  };
}

// ─────────────────────────────────────────────────────────────
// 장바구니 알림 쿠폰
// ─────────────────────────────────────────────────────────────

export type CartCouponPlan = {
  /** 쿠폰 할인액 */
  discountKrw: number;
  discountPct: number;
  /** 쿠폰 적용 후에도 남는 단위 순익 */
  netAfterCouponKrw: number;
  /** 전환율 상승을 반영한 기대 순익 변화 */
  expectedNetDeltaKrw: number;
  worthIt: boolean;
  reason: string;
};

/**
 * 장바구니 이탈 고객 쿠폰 설계.
 *
 * 공식 문서상 전환율 +45% 효과가 확인됐다. 쿠폰은 이탈 고객에게만 나가므로
 * 할인 비용은 '원래 안 팔렸을 건'에서만 발생한다 → 쿠폰 비용보다 추가 판매의
 * 순익이 크면 무조건 이득이다.
 *
 * 판단: 추가 전환분의 순익 > 전체 쿠폰 사용분의 할인 비용
 */
export function planCartCoupon(input: {
  priceKrw: number;
  /** 쿠폰 없을 때 단위 순익 */
  netProfitPerUnitKrw: number;
  /** 장바구니 이탈 고객 수(기간) */
  abandonedCarts: number;
  /** 쿠폰 없을 때 이탈 고객의 자연 회수 전환율 % */
  baselineRecoveryPct?: number;
  /** 시도할 할인율 % */
  discountPct?: number;
}): CartCouponPlan {
  const discountPct = input.discountPct ?? 5;
  const discount = Math.round(input.priceKrw * (discountPct / 100));
  const netAfter = input.netProfitPerUnitKrw - discount;

  const baseline = (input.baselineRecoveryPct ?? 8) / 100;
  const uplifted = baseline * (1 + CART_COUPON_CVR_UPLIFT_PCT / 100);

  const baseSales = input.abandonedCarts * baseline;
  const upliftedSales = input.abandonedCarts * uplifted;
  const extraSales = upliftedSales - baseSales;

  // 쿠폰은 회수된 전 건에 적용된다 (원래 살 사람에게도 할인이 나감)
  const couponCost = upliftedSales * discount;
  const extraGross = extraSales * input.netProfitPerUnitKrw;
  const expectedDelta = Math.round(extraGross - couponCost);

  const worthIt = netAfter > 0 && expectedDelta > 0;

  return {
    discountKrw: discount,
    discountPct,
    netAfterCouponKrw: netAfter,
    expectedNetDeltaKrw: expectedDelta,
    worthIt,
    reason:
      netAfter <= 0
        ? `할인 ${discount.toLocaleString()}원이 단위순익 ${input.netProfitPerUnitKrw.toLocaleString()}원을 넘는다 — 팔수록 손해`
        : expectedDelta > 0
          ? `이탈 ${input.abandonedCarts}건 · 회수 전환 +${CART_COUPON_CVR_UPLIFT_PCT}% → 추가 ${extraSales.toFixed(1)}건, ` +
            `쿠폰비용 차감 후 기대 +${expectedDelta.toLocaleString()}원`
          : `추가 전환 순익(${Math.round(extraGross).toLocaleString()}원)보다 쿠폰 비용(${Math.round(couponCost).toLocaleString()}원)이 크다 — 할인율을 낮출 것`,
  };
}

/** 손해 안 나는 최대 할인율을 찾는다 */
export function bestCartCouponDiscount(input: {
  priceKrw: number;
  netProfitPerUnitKrw: number;
  abandonedCarts: number;
  baselineRecoveryPct?: number;
}): CartCouponPlan {
  let best: CartCouponPlan | null = null;
  for (const pct of [3, 5, 7, 10, 15]) {
    const plan = planCartCoupon({ ...input, discountPct: pct });
    if (!plan.worthIt) continue;
    if (!best || plan.expectedNetDeltaKrw > best.expectedNetDeltaKrw) best = plan;
  }
  return best ?? planCartCoupon({ ...input, discountPct: 3 });
}
