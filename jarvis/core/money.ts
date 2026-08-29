/**
 * 돈 계산 — 단일 진실원
 *
 * ★ 이 파일이 존재하는 이유
 *
 * 옛 구현이 꼬인 원인은 하나였다: **같은 계산이 여러 곳에 있었다.**
 * 실제로 터진 사고들이 전부 같은 모양이었다.
 *
 *  · 마진을 `(판매가-원가)/판매가`로 재는 곳과 수수료·광고비까지 빼고 재는
 *    곳이 따로 있었다 → 게이트가 통과시킨 마진과 실제 팔릴 때 마진이 달랐다.
 *  · 광고 손익분기를 `판매가×8%×전환율`로 재는 곳과 `(순이익+면제분)×전환율×
 *    증분`으로 재는 곳이 따로 있었다 → 2만원 상품 상한이 한쪽은 32원,
 *    한쪽은 200원이었다.
 *  · 원가를 `landed(배송비 포함)`로 쓰는 곳과 `unitPrice(배송비 제외)`로
 *    쓰는 곳이 따로 있었다 → 같은 상품의 마진이 화면마다 달랐다.
 *
 * 전부 "고치면 되는 버그"가 아니라 **구조가 만들어낸 버그**다. 두 곳에 있으면
 * 언젠가 어긋난다. 그래서 이 파일 밖에서는 돈 계산을 하지 않는다.
 *
 * ★ 규칙
 *
 *  1. 판매가·원가·마진·수수료·손익분기 CPC는 **전부 여기서만** 계산한다.
 *  2. 원가는 항상 `landed`다 — 입고 배송비가 이미 포함된 값. 배송비를 밖에서
 *     또 더하면 이중 계상이다.
 *  3. 마진은 항상 `실마진`이다 — 수수료·광고비·반품충당까지 다 뺀 뒤의 값.
 *     "팔면 남는 돈"이 아닌 마진은 의사결정에 쓸 수 없다.
 */

// ─────────────────────────────────────────────────────────────
// 토스쇼핑 공식 수수료 (shopping-docs.toss.im, 2026-08 확인)
// ─────────────────────────────────────────────────────────────

/** 판매수수료 8% — 광고 유입 판매(클릭 후 7일 내)이거나 배송 인센티브면 0% */
export const SALES_FEE_RATE = 0.08;

/** 결제수수료 2.5% — 면제 조건 없음, 항상 나간다 */
export const PAYMENT_FEE_RATE = 0.025;

/** 광고 클릭 후 이 기간 내 판매는 판매수수료 0% (공식 문서) */
export const AD_ATTRIBUTION_WINDOW_DAYS = 7;

// ─────────────────────────────────────────────────────────────
// 운영 가정 — 실측이 쌓이기 전까지 쓰는 보수적 기본값
//
// 전부 "낙관적으로 잡으면 손해 보는" 방향으로만 기울여 놓는다.
// 실제가 더 좋으면 이득일 뿐이지만, 낙관이 틀리면 적자다.
// ─────────────────────────────────────────────────────────────

/** 매출 대비 광고비 비중 — 마진 계산에서 미리 뺀다 */
export const AD_COST_RATE = 0.08;

/** 반품·교환 충당 — 위탁도 반품 왕복비가 실제로 나간다 */
export const RETURN_RESERVE_RATE = 0.01;

/** 광고 클릭 → 구매 전환율(%). 실측 없을 때만 */
export const ASSUMED_CVR_PCT = 2;

/** 광고로 팔린 것 중 광고 없었으면 안 팔렸을 비중. 나머지는 잠식이라 이익이 아니다 */
export const ASSUMED_INCREMENTALITY = 0.7;

/** 손익분기의 몇 %까지 입찰하는가 — 딱 맞춰 걸면 이익이 0이다 */
export const BID_SAFETY_RATIO = 0.65;

// ─────────────────────────────────────────────────────────────
// 수수료
// ─────────────────────────────────────────────────────────────

export type FeeContext = {
  /**
   * 배송 인센티브(당일발송 우수 공급처)로 판매수수료가 이미 0%인가.
   *
   * ⚠️ **실증된 경우에만** true여야 한다. 추정으로 켜면 마진이 8% 부풀고,
   * 그 부풀린 마진으로 게이트를 통과한 상품은 실제로 팔 때 적자다.
   */
  deliveryIncentive?: boolean;
};

export type FeeBreakdown = {
  salesFeeKrw: number;
  paymentFeeKrw: number;
  totalFeeKrw: number;
  salesFeeRate: number;
};

/** 판매가에서 실제로 빠져나가는 수수료 */
export function computeFees(priceKrw: number, ctx: FeeContext = {}): FeeBreakdown {
  const salesFeeRate = ctx.deliveryIncentive ? 0 : SALES_FEE_RATE;
  const salesFeeKrw = Math.round(priceKrw * salesFeeRate);
  const paymentFeeKrw = Math.round(priceKrw * PAYMENT_FEE_RATE);
  return {
    salesFeeKrw,
    paymentFeeKrw,
    totalFeeKrw: salesFeeKrw + paymentFeeKrw,
    salesFeeRate,
  };
}

// ─────────────────────────────────────────────────────────────
// 순이익 · 마진
// ─────────────────────────────────────────────────────────────

export type ProfitInput = {
  /** 판매가 */
  priceKrw: number;
  /** 공급단가 — **landed**(입고 배송비 포함). 밖에서 배송비를 또 더하지 말 것 */
  landedCostKrw: number;
  fees?: FeeContext;
  /**
   * 광고를 켤 상품인가. 켤 거면 광고비를 미리 빼고 마진을 재야 한다.
   * 광고비를 안 뺀 마진으로 게이트를 통과시키면 광고 켜는 순간 적자가 된다.
   */
  withAds?: boolean;
};

export type Profit = {
  priceKrw: number;
  landedCostKrw: number;
  fees: FeeBreakdown;
  adCostKrw: number;
  returnReserveKrw: number;
  /** 개당 순이익 — 이 상품을 하나 팔면 실제로 남는 돈 */
  netProfitKrw: number;
  /** 실마진율 % — 순이익 / 판매가 */
  marginPct: number;
};

/**
 * 개당 순이익과 실마진.
 *
 * 이 프로젝트에서 "마진"이라는 말은 **언제나 이 값**을 뜻한다.
 * `(판매가-원가)/판매가` 같은 조마진은 어디서도 쓰지 않는다 — 그 숫자는
 * 수수료 10.5%와 광고비 8%를 숨기고 있어서, 그걸 보고 통과시키면 실제로는
 * 적자인 상품이 등록된다.
 */
export function computeProfit(input: ProfitInput): Profit {
  const { priceKrw, landedCostKrw } = input;
  const fees = computeFees(priceKrw, input.fees ?? {});
  const adCostKrw = input.withAds === false ? 0 : Math.round(priceKrw * AD_COST_RATE);
  const returnReserveKrw = Math.round(priceKrw * RETURN_RESERVE_RATE);

  const netProfitKrw =
    priceKrw - landedCostKrw - fees.totalFeeKrw - adCostKrw - returnReserveKrw;

  const marginPct = priceKrw > 0 ? (netProfitKrw / priceKrw) * 100 : 0;

  return {
    priceKrw,
    landedCostKrw,
    fees,
    adCostKrw,
    returnReserveKrw,
    netProfitKrw,
    marginPct: Math.round(marginPct * 10) / 10,
  };
}

/**
 * 목표 마진을 내려면 얼마에 팔아야 하는가 — 가격 역산.
 *
 * 수수료·광고비·반품충당이 전부 **판매가에 비례**하므로 단순 나눗셈으로는
 * 안 나온다. 비율들을 한 번에 묶어 역산한다:
 *
 *   순이익 = 가격 × (1 - 수수료율 - 광고율 - 반품율) - 원가
 *   목표마진 = 순이익 / 가격
 *   ⇒ 가격 = 원가 / (1 - 수수료율 - 광고율 - 반품율 - 목표마진)
 */
export function priceForTargetMargin(input: {
  landedCostKrw: number;
  targetMarginPct: number;
  fees?: FeeContext;
  withAds?: boolean;
}): number | null {
  const salesFeeRate = input.fees?.deliveryIncentive ? 0 : SALES_FEE_RATE;
  const adRate = input.withAds === false ? 0 : AD_COST_RATE;
  const variableRate = salesFeeRate + PAYMENT_FEE_RATE + adRate + RETURN_RESERVE_RATE;
  const target = input.targetMarginPct / 100;

  const denominator = 1 - variableRate - target;
  // 변동비와 목표마진의 합이 100%를 넘으면 어떤 가격으로도 성립하지 않는다
  if (denominator <= 0.01) return null;

  return Math.ceil(input.landedCostKrw / denominator);
}

/**
 * 매력가격(구매심리 가격) — 9로 끝나게 다듬는다.
 *
 * 단, **하한 아래로는 절대 내리지 않는다.** 990원 깎는 게 목적이 아니라
 * 같은 마진에서 더 팔리게 하는 게 목적이므로, 내려서 하한을 깨면 의미가 없다.
 */
export function toCharmPrice(priceKrw: number, floorKrw: number): number {
  if (priceKrw < 1000) return Math.max(priceKrw, floorKrw);

  const candidates =
    priceKrw < 10_000
      ? [Math.floor(priceKrw / 100) * 100 + 90, Math.ceil(priceKrw / 100) * 100 + 90]
      : [
          Math.floor(priceKrw / 1000) * 1000 + 900,
          Math.ceil(priceKrw / 1000) * 1000 + 900,
        ];

  // 하한을 지키는 것 중 가장 낮은 값 (같은 마진이면 싼 쪽이 더 팔린다)
  const valid = candidates.filter((c) => c >= floorKrw).sort((a, b) => a - b);
  return valid[0] ?? Math.max(priceKrw, floorKrw);
}

// ─────────────────────────────────────────────────────────────
// 광고 — 클릭당 얼마까지 내도 되는가
// ─────────────────────────────────────────────────────────────

export type AdBreakeven = {
  /** 판매 1건이 만드는 가치 (순이익 + 광고로 면제되는 판매수수료) */
  valuePerSaleKrw: number;
  feeSavedPerSaleKrw: number;
  /** 이 CPC까지는 입찰해도 손해가 아니다 */
  breakevenCpcKrw: number;
  /** 실제로 넣을 입찰가 — 손익분기에 여유를 둔 값 */
  maxBidKrw: number;
  reason: string;
};

/**
 * 광고 손익분기 CPC.
 *
 * ★ 왜 "면제되는 수수료"만 세면 안 되는가
 *
 * 면제분만 세면 2만원 상품 상한이 32원(=20,000×8%×2%)이 되어 어떤 광고도
 * 성립하지 않는다. 하지만 광고로 **새로 생긴** 판매는 수수료 절약만 가져오는
 * 게 아니라 그 판매의 **이익 전체**를 가져온다. 면제분은 거기 얹히는 보너스다.
 *
 *   판매 1건 가치 = 개당 순이익 + 면제되는 수수료
 *   손익분기 CPC  = 판매 1건 가치 × 전환율 × 증분비율
 *
 * `증분비율`은 광고 없이는 안 팔렸을 비중이다. 100%로 잡으면(자연 판매까지
 * 광고 덕으로 세면) 상한이 부풀어 실제로는 손해 나는 입찰을 하게 된다.
 */
export function computeAdBreakeven(input: {
  priceKrw: number;
  /** 개당 순이익 — computeProfit이 낸 값 */
  netProfitKrw: number;
  conversionRatePct?: number;
  incrementality?: number;
  /** 배송 인센티브로 이미 수수료 0%면 광고의 면제 효과가 중복되지 않는다 */
  alreadyFeeFree?: boolean;
}): AdBreakeven {
  const cvr = Math.max(0, input.conversionRatePct ?? ASSUMED_CVR_PCT) / 100;
  const incrementality = Math.max(0, Math.min(1, input.incrementality ?? ASSUMED_INCREMENTALITY));
  const netProfit = Math.max(0, input.netProfitKrw);

  const feeSaved = input.alreadyFeeFree ? 0 : Math.round(input.priceKrw * SALES_FEE_RATE);
  const valuePerSale = netProfit + feeSaved;
  const breakevenCpcKrw = Math.floor(valuePerSale * cvr * incrementality);
  const maxBidKrw = Math.floor(breakevenCpcKrw * BID_SAFETY_RATIO);

  return {
    valuePerSaleKrw: valuePerSale,
    feeSavedPerSaleKrw: feeSaved,
    breakevenCpcKrw,
    maxBidKrw,
    reason:
      valuePerSale <= 0
        ? "이 가격에서는 남는 게 없어 어떤 CPC도 정당화되지 않습니다"
        : `판매 1건 가치 ${valuePerSale.toLocaleString()}원` +
          (feeSaved > 0
            ? `(순이익 ${netProfit.toLocaleString()}원 + 수수료면제 ${feeSaved.toLocaleString()}원)`
            : "(순이익만 — 이미 수수료 0%)") +
          ` × 전환 ${Math.round(cvr * 1000) / 10}% × 증분 ${Math.round(incrementality * 100)}%`,
  };
}
