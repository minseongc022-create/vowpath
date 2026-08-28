/**
 * 광고 손익분기 CPC — 단일 진실원
 *
 * ★ 왜 이 파일이 생겼는가 — 두 엔진이 서로 다른 답을 내고 있었다
 *
 * `ad-strategy-engine.ts`(등록 시점 광고 설계, v2.0)와
 * `toss-growth-levers.computeAdEconomics`(등록 후 실적 기반 배분,
 * `ad-budget-allocator.ts`가 씀)가 **같은 질문**("이 CPC까지 입찰해도
 * 되는가")에 **다른 공식**으로 답하고 있었다.
 *
 *   toss-growth-levers (구버전):
 *     손익분기 CPC = 판매가 × 8%(수수료 면제분) × 전환율
 *
 *   ad-strategy-engine (신버전, v2.0 헤더에 이미 이렇게 적혀 있었다):
 *     "손익분기를 수수료 면제분으로만 잡으면 안 된다 — 면제분만 세면
 *      2만원 상품의 상한이 32원이 되어 사실상 어떤 광고도 성립하지 않는다"
 *
 * v2.0이 이 결함을 지적하며 자기 파일 안에서는 고쳤는데, **같은 결함이
 * 남아있는 toss-growth-levers는 그대로 뒀다.** 그리고 그쪽은 여전히
 * `ad-budget-allocator.ts`(등록 후 진짜 광고비를 배분하는 곳)에서 쓰이고
 * 있었다. 즉:
 *
 *   · 상품을 처음 등록할 때 계획하는 입찰 상한 — 마진을 반영한 올바른 값
 *   · 실제 판매 데이터가 쌓인 뒤 광고비를 늘리거나 줄이는 판단 — 마진을
 *     빼먹은, 실제보다 훨씬 낮은 값
 *
 * 이 둘이 같은 SKU에 다른 답을 준다. 더 심각한 건 **실적 기반 배분 쪽이
 * 틀린 공식을 쓰고 있었다는 것**이다 — winner-sku-engine이 확인한 진짜
 * 효자 SKU에도 "손익분기 32원"이라며 광고를 못 걸게 막았을 것이다.
 *
 * ★ 올바른 공식
 *
 * 광고로 새로 생긴 판매(잠식이 아닌 순수 증분)는 그 판매의 **이익 전체**를
 * 가져온다 — 수수료 면제분은 거기 얹히는 보너스일 뿐이다.
 *
 *     판매 1건 가치 = 단위 순이익 + 면제되는 수수료(이미 0%가 아니면)
 *     손익분기 CPC = 판매 1건 가치 × 전환율 × 증분비율
 *
 * `증분비율`은 광고 없이는 안 팔렸을 비중이다. 100%로 잡으면(자연 판매까지
 * 광고 덕으로 세면) 상한이 부풀어 실제로는 손해 나는 입찰을 하게 된다.
 */

import { TOSS_DEFAULT_SALES_FEE_RATE } from "./toss-policy-engine";

export const AD_ECONOMICS_VERSION = "1.0";

/**
 * 전환율 실측이 없을 때 쓰는 보수적 가정.
 * 낙관적으로 잡으면 손익분기가 부풀어 과다 입찰로 이어진다.
 */
export const ASSUMED_CVR_PCT = 2;

/**
 * 광고로 팔린 것 중 광고가 없었다면 안 팔렸을 비중.
 * 실측(광고 켜기 전후 매출 비교)이 쌓이기 전까지는 보수적으로 깎는다.
 */
export const ASSUMED_INCREMENTALITY = 0.7;

export type AdBreakevenInput = {
  /** 판매가 */
  priceKrw: number;
  /** 단위 순이익 (원가·수수료 다 뺀 값. 이미 계산돼 있으면 이걸 우선 쓴다) */
  netProfitPerUnitKrw: number;
  /** 광고 클릭 → 구매 전환율 %. 없으면 ASSUMED_CVR_PCT */
  conversionRatePct?: number;
  /** 광고가 없었다면 안 팔렸을 비중 %. 없으면 ASSUMED_INCREMENTALITY */
  incrementalityPct?: number;
  /**
   * 배송 인센티브로 이미 판매수수료 0%인가.
   * 이 경우 광고의 수수료 면제 효과가 중복되지 않아 보너스가 0이 된다.
   */
  alreadyFeeFree: boolean;
};

export type AdBreakevenResult = {
  engineVersion: string;
  /** 판매 1건이 만드는 가치 (순이익 + 면제되는 수수료) */
  valuePerSaleKrw: number;
  /** 면제되는 수수료만 따로 — 진단·표시용 */
  feeSavedPerSaleKrw: number;
  /** 이 CPC까지는 입찰해도 손해가 아니다 */
  breakevenCpcKrw: number;
  reason: string;
};

/**
 * 손익분기 CPC를 계산한다. 단위 순이익과 수수료 면제분을 **모두** 반영한다.
 *
 * 순이익이 0 이하로 들어오면(팔아도 안 남는 상품) 손익분기도 0이다 —
 * 그런 상품엔 어떤 CPC도 정당화되지 않는다.
 */
export function computeAdBreakeven(input: AdBreakevenInput): AdBreakevenResult {
  const cvr = Math.max(0, input.conversionRatePct ?? ASSUMED_CVR_PCT) / 100;
  const incrementality = Math.max(0, Math.min(1, (input.incrementalityPct ?? ASSUMED_INCREMENTALITY * 100) / 100));
  const netProfit = Math.max(0, input.netProfitPerUnitKrw);

  const feeSaved = input.alreadyFeeFree
    ? 0
    : Math.round(input.priceKrw * TOSS_DEFAULT_SALES_FEE_RATE);

  const valuePerSale = netProfit + feeSaved;
  const breakeven = Math.floor(valuePerSale * cvr * incrementality);

  return {
    engineVersion: AD_ECONOMICS_VERSION,
    valuePerSaleKrw: valuePerSale,
    feeSavedPerSaleKrw: feeSaved,
    breakevenCpcKrw: breakeven,
    reason:
      valuePerSale <= 0
        ? "이 가격에서는 순이익도 수수료 면제 이득도 없다 — 어떤 CPC도 광고를 정당화하지 못한다"
        : netProfit <= 0
          ? `순이익은 없지만 수수료 면제분 ${feeSaved.toLocaleString()}원만으로도 손익분기가 성립한다 ` +
            `× 전환 ${Math.round(cvr * 1000) / 10}% × 증분 ${Math.round(incrementality * 100)}%`
          : input.alreadyFeeFree
          ? `판매 1건 가치 ${valuePerSale.toLocaleString()}원(순이익만 — 이미 수수료 0%라 면제 보너스 없음) ` +
            `× 전환 ${Math.round(cvr * 1000) / 10}% × 증분 ${Math.round(incrementality * 100)}%`
          : `판매 1건 가치 ${valuePerSale.toLocaleString()}원(순이익 ${netProfit.toLocaleString()}원 + 수수료면제 ${feeSaved.toLocaleString()}원) ` +
            `× 전환 ${Math.round(cvr * 1000) / 10}% × 증분 ${Math.round(incrementality * 100)}%`,
  };
}
