/**
 * 토스쇼핑 수수료 단일 진실원(single source of truth)
 *
 * ★ 왜 별도 모듈인가 — 토스에는 판매수수료 0% 경로가 **두 개**다:
 *
 *  1) 배송 품질 우수 인센티브 — 4조건(페널티 0 · 오늘출발 · 7영업일 발송이력 ·
 *     발송기한 준수율 100%)을 전부 채우면 그 옵션의 판매수수료가 0%가 된다.
 *  2) 광고 유입 — 광고 클릭 후 7일 내 판매분은 판매수수료가 면제된다.
 *
 * 그리고 **두 개는 중복되지 않는다.** 이미 인센티브로 0%인 건에 광고를 태우면
 * 면제할 수수료가 없으므로 광고비는 순수 비용이 된다. 이 상호작용을 놓치면
 * 광고를 켤수록 손해가 난다 (toss-growth-levers.ts의 경고와 동일한 규칙).
 *
 * 이 모듈이 생기기 전에는 pricing.ts가 `0.08 + 0.025`를 하드코딩하고 있었고,
 * toss-policy-engine의 인센티브 판정은 아무도 호출하지 않는 dead code였다.
 * 결과적으로 **모든 위탁 SKU의 마진이 8%p 낮게 계산**되어, 마진 게이트(15%)에서
 * 실제로는 통과할 SKU가 탈락하고 있었다.
 *
 * ⚠️ 낙관 금지 원칙:
 * 인센티브 마진은 **공급처가 실제로 1등급·당일발송일 때만** 적용한다.
 * 오늘출발은 남의 창고에 거는 약속이라, 공급처가 못 지키면 준수율 100%가
 * 깨지고 인센티브가 통째로 날아간다. 공급처 미확인 상태에서 0%를 가정하는 건
 * supplier-quality.ts가 금지한 "추측 통과"와 같은 실수다.
 */

import { TOSS_DEFAULT_SALES_FEE_RATE, TOSS_PAYMENT_FEE_RATE } from "./toss-policy-engine";

export const FEE_MODEL_VERSION = "1.0";

export type TossFeeContext = {
  /**
   * 배송 인센티브로 판매수수료 0%를 **실제로 받을 수 있는가**.
   * 공급처가 1등급·당일발송으로 검증된 경우에만 true여야 한다.
   * 미확인/추정이면 false — 낙관적으로 켜면 마진이 부풀려진다.
   */
  deliveryIncentiveEligible?: boolean;
  /**
   * 광고 유입 판매 비중 % (0–100). 광고 클릭 후 7일 내 판매분은 수수료 면제.
   * 실측값이 없으면 0으로 두는 것이 안전하다 — 광고는 비용도 같이 들기 때문에
   * 여기만 올리면 마진이 실제보다 좋아 보인다.
   */
  adAttributedSharePct?: number;
};

export type FeeBreakdown = {
  engineVersion: string;
  /** 실제 적용되는 판매수수료율 (0 ~ 0.08) */
  salesFeeRate: number;
  paymentFeeRate: number;
  salesFeeKrw: number;
  paymentFeeKrw: number;
  totalFeeKrw: number;
  /** 배송 인센티브가 적용되었는가 */
  incentiveApplied: boolean;
  /** 인센티브 대비 아직 내고 있는 판매수수료 (개선 여지) */
  recoverableFeeKrw: number;
  note: string;
};

function clampShare(pct: number | undefined): number {
  if (pct === undefined || !Number.isFinite(pct)) return 0;
  return Math.min(100, Math.max(0, pct)) / 100;
}

/**
 * 실효 판매수수료율.
 *
 * 배송 인센티브가 걸리면 그 옵션 전체가 0%다 (광고 여부와 무관).
 * 인센티브가 없으면 광고 유입분만 면제되므로, 광고 비중만큼 가중평균된다:
 *   실효율 = 8% × (1 - 광고유입비중)
 */
export function effectiveSalesFeeRate(ctx: TossFeeContext = {}): number {
  if (ctx.deliveryIncentiveEligible) return 0;
  const adShare = clampShare(ctx.adAttributedSharePct);
  return TOSS_DEFAULT_SALES_FEE_RATE * (1 - adShare);
}

/** 결제수수료는 인센티브·광고와 무관하게 항상 남는다 */
export function computeFees(priceKrw: number, ctx: TossFeeContext = {}): FeeBreakdown {
  const salesRate = effectiveSalesFeeRate(ctx);
  const salesFeeKrw = Math.round(priceKrw * salesRate);
  const paymentFeeKrw = Math.round(priceKrw * TOSS_PAYMENT_FEE_RATE);
  const incentiveApplied = Boolean(ctx.deliveryIncentiveEligible);

  return {
    engineVersion: FEE_MODEL_VERSION,
    salesFeeRate: salesRate,
    paymentFeeRate: TOSS_PAYMENT_FEE_RATE,
    salesFeeKrw,
    paymentFeeKrw,
    totalFeeKrw: salesFeeKrw + paymentFeeKrw,
    incentiveApplied,
    recoverableFeeKrw: salesFeeKrw,
    note: incentiveApplied
      ? "배송 인센티브 적용 — 판매수수료 0% (결제수수료 2.5%만)"
      : salesRate < TOSS_DEFAULT_SALES_FEE_RATE
        ? `광고 유입 ${Math.round(clampShare(ctx.adAttributedSharePct) * 100)}% 면제 반영 — 실효 판매수수료 ${(salesRate * 100).toFixed(1)}%`
        : `판매수수료 ${(TOSS_DEFAULT_SALES_FEE_RATE * 100).toFixed(0)}% — 오늘출발 공급처로 전환 시 건당 ${salesFeeKrw.toLocaleString()}원 회수 가능`,
  };
}

/**
 * 인센티브를 받았을 때 건당 늘어나는 순익.
 * 소싱 판단에 직접 쓰인다 — 이 값이 크면 오늘출발 공급처를 찾을 가치가 있다.
 */
export function incentiveUpliftKrw(priceKrw: number): number {
  return Math.round(priceKrw * TOSS_DEFAULT_SALES_FEE_RATE);
}

/**
 * 인센티브 적용/미적용 두 시나리오를 같이 보여준다.
 * "오늘출발 공급처로 바꾸면 얼마나 좋아지는가"를 셀러가 숫자로 보게 하는 용도.
 */
export type FeeScenarioComparison = {
  withoutIncentive: FeeBreakdown;
  withIncentive: FeeBreakdown;
  upliftKrw: number;
  upliftMarginPct: number;
};

export function compareFeeScenarios(
  priceKrw: number,
  ctx: TossFeeContext = {},
): FeeScenarioComparison {
  const without = computeFees(priceKrw, { ...ctx, deliveryIncentiveEligible: false });
  const withInc = computeFees(priceKrw, { ...ctx, deliveryIncentiveEligible: true });
  const uplift = without.totalFeeKrw - withInc.totalFeeKrw;
  return {
    withoutIncentive: without,
    withIncentive: withInc,
    upliftKrw: uplift,
    upliftMarginPct: priceKrw > 0 ? Math.round((uplift / priceKrw) * 1000) / 10 : 0,
  };
}
