/**
 * 소싱 기준 — 단일 진실원
 *
 * ★ 이 기준은 자비스가 정했다
 *
 * 사장님이 매번 판단하지 않아도 되게, 위탁 드랍십에서 **실제로 돈이 되는
 * 구간**을 숫자로 못박았다. 각 숫자에는 왜 그 값인지가 붙어 있다 —
 * 근거 없는 숫자는 나중에 아무도 못 고친다.
 *
 * ★ 두 종류의 기준을 구분한다
 *
 *  · **손익분기선** (마진 하한, 개당 순이익 하한, 가격 상·하한)
 *    → 넘으면 팔수록 손해다. 후보가 없다고 절대 낮추지 않는다.
 *      낮추는 건 적자를 승인하는 것과 같다.
 *
 *  · **품질 기준** (관련성, 공급처 등급)
 *    → 넘으면 "안 팔릴 가능성이 높다"는 뜻이지 손해는 아니다.
 *      후보가 마르면 이쪽을 조절하는 게 맞다.
 *
 * 후보가 0개일 때 손대야 하는 건 기준이 아니라 **후보 풀**이다 —
 * 키워드를 넓히고, 도매 소스를 늘린다.
 */

import { computeProfit, priceForTargetMargin, toCharmPrice, type FeeContext } from "./money";

export const RULES_VERSION = "1.0";

// ─────────────────────────────────────────────────────────────
// 손익분기선 — 절대 완화하지 않는다
// ─────────────────────────────────────────────────────────────

/**
 * 실마진 하한 18%.
 *
 * 수수료(10.5%)·광고비(8%)·반품충당(1%)을 **이미 뺀 뒤**의 마진이다.
 * 즉 조마진으로 치면 37% 정도에 해당한다. 이보다 낮으면 가격을 조금만
 * 깎거나 반품 한 건만 나도 바로 적자로 넘어간다.
 */
export const MIN_MARGIN_PCT = 18;

/**
 * 개당 순이익 하한 2,500원.
 *
 * 마진율만 보면 안 되는 이유: 원가 1,500원짜리를 마진 20%로 팔면 개당
 * 600원이 남는다. 월 500만원을 벌려면 8,300건을 팔아야 하는데, 위탁
 * 신규 셀러에게 그건 불가능한 숫자다. **율이 아니라 금액이 목표를 만든다.**
 */
export const MIN_NET_PROFIT_KRW = 2_500;

/**
 * 판매가 범위 5,000원 ~ 300,000원.
 *
 * ★ 상한이 자릿수 사고를 구조적으로 막는다
 *
 * 실제로 판매가 27,195,670원짜리 태블릿 케이스가 등록 직전까지 갔다.
 * 묶음 전체 가격이 낱개 원가 자리에 들어와서 생긴 일인데, **마진율
 * 게이트로는 절대 못 잡는다** — 원가 900만원에 판매가 2,700만원이면
 * 마진 55%가 수학적으로 성립하기 때문이다. 비율만 보는 게이트는 자릿수
 * 오류를 그대로 통과시킨다. 그래서 절대 금액으로 막는다.
 *
 * 하한 5,000원: 그 아래는 택배비(2,500~3,000원)가 마진을 다 먹는다.
 * 상한 300,000원: 위탁으로 고가품을 파는 건 반품 왕복비·CS 부담이
 * 마진을 넘어선다. 신규 셀러가 이길 수 있는 싸움이 아니다.
 */
export const MIN_PRICE_KRW = 5_000;
export const MAX_PRICE_KRW = 300_000;

/**
 * 공급단가 범위 2,000원 ~ 150,000원.
 * 판매가 범위와 짝이 맞아야 한다 — 원가 단계에서 먼저 걸러내면
 * 뒤쪽 계산(마진·수익확률)이 애초에 오염되지 않는다.
 */
export const MIN_COST_KRW = 2_000;
export const MAX_COST_KRW = 150_000;

/**
 * 판매가 / 원가 배수 1.25 ~ 4.0.
 *
 * 4배를 넘으면 둘 중 하나다 — 원가에 묶음가가 섞였거나, 시장가를 한참
 * 넘는 가격을 부른 것. 둘 다 등록하면 안 되는 상태다.
 * 1.25배 미만이면 수수료만으로도 적자다.
 */
export const MIN_PRICE_TO_COST = 1.25;
export const MAX_PRICE_TO_COST = 4.0;

// ─────────────────────────────────────────────────────────────
// 품질 기준 — 후보가 마르면 여기를 조절한다
// ─────────────────────────────────────────────────────────────

/** 키워드와 상품이 같은 물건을 가리키는가 (0~1). 낮으면 "무선이어폰 주방세제" 같은 제목이 나온다 */
export const MIN_RELEVANCE = 0.45;

/** 목표 마진 — 이 값으로 가격을 역산한다. 하한(18%)보다 높게 잡아 여유를 둔다 */
export const TARGET_MARGIN_PCT = 28;

// ─────────────────────────────────────────────────────────────
// 게이트
// ─────────────────────────────────────────────────────────────

export type GateFailure =
  | "cost_out_of_range"
  | "price_out_of_range"
  | "ratio_out_of_range"
  | "margin_too_low"
  | "profit_too_small"
  | "not_single_unit"
  | "irrelevant"
  | "no_valid_price";

export type GateResult =
  | { ok: true }
  | { ok: false; failed: GateFailure; reason: string };

const pass: GateResult = { ok: true };
const fail = (failed: GateFailure, reason: string): GateResult => ({ ok: false, failed, reason });

/**
 * 공급단가만으로 먼저 거른다 — 판매가가 정해지기 전 단계.
 *
 * 여기서 막으면 뒤쪽 계산이 애초에 오염되지 않는다. 자릿수가 틀린 원가로
 * 마진·수익확률·광고예산을 다 계산해놓고 마지막에 버리면, 그 사이에 하루치
 * 소싱 슬롯과 화면의 숫자가 전부 더럽혀진다.
 */
export function checkCost(landedCostKrw: number): GateResult {
  if (!Number.isFinite(landedCostKrw) || landedCostKrw <= 0) {
    return fail("cost_out_of_range", "공급단가를 읽지 못했습니다");
  }
  if (landedCostKrw < MIN_COST_KRW) {
    return fail(
      "cost_out_of_range",
      `공급단가 ${landedCostKrw.toLocaleString()}원 — ${MIN_COST_KRW.toLocaleString()}원 미만은 배송비가 마진을 먹습니다`,
    );
  }
  if (landedCostKrw > MAX_COST_KRW) {
    return fail(
      "cost_out_of_range",
      `공급단가 ${landedCostKrw.toLocaleString()}원 — ${MAX_COST_KRW.toLocaleString()}원 초과는 묶음가가 섞였을 신호입니다`,
    );
  }
  return pass;
}

/**
 * 최종 판매가와 원가의 조합이 상식적인가.
 *
 * 마진 게이트와 **따로** 있어야 한다. 마진율은 비율이라 자릿수 오류를
 * 통과시키기 때문이다(2,700만원 사고가 정확히 그랬다).
 */
export function checkPrice(priceKrw: number, landedCostKrw: number): GateResult {
  if (!Number.isFinite(priceKrw) || priceKrw <= 0) {
    return fail("price_out_of_range", "판매가를 계산하지 못했습니다");
  }
  if (priceKrw < MIN_PRICE_KRW) {
    return fail(
      "price_out_of_range",
      `판매가 ${priceKrw.toLocaleString()}원 — ${MIN_PRICE_KRW.toLocaleString()}원 미만은 택배비가 남는 돈을 넘습니다`,
    );
  }
  if (priceKrw > MAX_PRICE_KRW) {
    return fail(
      "price_out_of_range",
      `판매가 ${priceKrw.toLocaleString()}원 — 위탁 상한 ${MAX_PRICE_KRW.toLocaleString()}원을 넘습니다 (자릿수 오류 가능성)`,
    );
  }

  const ratio = priceKrw / landedCostKrw;
  if (ratio < MIN_PRICE_TO_COST) {
    return fail("ratio_out_of_range", `판매가가 원가의 ${ratio.toFixed(2)}배 — 수수료만으로 적자입니다`);
  }
  if (ratio > MAX_PRICE_TO_COST) {
    return fail(
      "ratio_out_of_range",
      `판매가가 원가의 ${ratio.toFixed(1)}배 — 원가에 묶음가가 섞였거나 시장가를 벗어났습니다`,
    );
  }
  return pass;
}

/** 팔아서 남는 게 기준을 넘는가 — 율과 금액을 **둘 다** 본다 */
export function checkProfit(input: {
  priceKrw: number;
  landedCostKrw: number;
  fees?: FeeContext;
}): GateResult {
  const profit = computeProfit({
    priceKrw: input.priceKrw,
    landedCostKrw: input.landedCostKrw,
    fees: input.fees,
    withAds: true,
  });

  if (profit.marginPct < MIN_MARGIN_PCT) {
    return fail(
      "margin_too_low",
      `실마진 ${profit.marginPct}% — 하한 ${MIN_MARGIN_PCT}% 미달 (수수료·광고비 반영 후)`,
    );
  }
  if (profit.netProfitKrw < MIN_NET_PROFIT_KRW) {
    return fail(
      "profit_too_small",
      `개당 ${profit.netProfitKrw.toLocaleString()}원 — 하한 ${MIN_NET_PROFIT_KRW.toLocaleString()}원 미달. 아무리 많이 팔아도 목표에 못 닿습니다`,
    );
  }
  return pass;
}

// ─────────────────────────────────────────────────────────────
// 가격 결정
// ─────────────────────────────────────────────────────────────

export type PricingDecision =
  | {
      ok: true;
      priceKrw: number;
      netProfitKrw: number;
      marginPct: number;
      floorKrw: number;
      reason: string;
    }
  | { ok: false; failed: GateFailure; reason: string };

/**
 * 원가와 시장가에서 등록가를 정한다.
 *
 * 순서가 중요하다:
 *  1. 목표 마진(28%)으로 가격을 역산한다 — 이게 우리가 받아야 할 값
 *  2. 하한(18%)으로도 역산해 **절대 내려갈 수 없는 선**을 잡는다
 *  3. 경쟁가가 있으면 그 아래를 노리되, 하한 밑으로는 절대 안 간다
 *  4. 매력가격(9로 끝나게)으로 다듬되, 역시 하한을 지킨다
 *  5. 마지막에 모든 게이트를 다시 통과시킨다
 *
 * 3번이 핵심이다. 경쟁가를 무조건 따라가면 시장이 적자 구간일 때 같이
 * 적자로 들어간다. **못 이기는 싸움은 안 하는 게 전략이다.**
 */
export function decidePrice(input: {
  landedCostKrw: number;
  /** 경쟁 상품 최저가 — 관측된 실제 값일 때만 넘길 것 */
  competitorLowKrw?: number;
  fees?: FeeContext;
}): PricingDecision {
  const costGate = checkCost(input.landedCostKrw);
  if (!costGate.ok) return costGate;

  const floorKrw = priceForTargetMargin({
    landedCostKrw: input.landedCostKrw,
    targetMarginPct: MIN_MARGIN_PCT,
    fees: input.fees,
    withAds: true,
  });
  const targetKrw = priceForTargetMargin({
    landedCostKrw: input.landedCostKrw,
    targetMarginPct: TARGET_MARGIN_PCT,
    fees: input.fees,
    withAds: true,
  });

  if (floorKrw == null || targetKrw == null) {
    return { ok: false, failed: "no_valid_price", reason: "이 원가로는 어떤 가격도 마진을 못 냅니다" };
  }

  let chosen = targetKrw;
  let reason = `목표 마진 ${TARGET_MARGIN_PCT}% 기준가`;

  // 경쟁가가 있으면 그 바로 아래를 노린다 — 단 하한은 절대 안 깬다
  if (input.competitorLowKrw && input.competitorLowKrw > 0) {
    const undercut = Math.floor(input.competitorLowKrw * 0.97);
    if (undercut >= floorKrw && undercut < chosen) {
      chosen = undercut;
      reason = `경쟁 최저가 ${input.competitorLowKrw.toLocaleString()}원의 3% 아래`;
    } else if (undercut < floorKrw) {
      reason = `경쟁가(${input.competitorLowKrw.toLocaleString()}원)를 따라가면 적자라 하한을 지킵니다`;
      chosen = floorKrw;
    }
  }

  const priceKrw = toCharmPrice(chosen, floorKrw);

  const priceGate = checkPrice(priceKrw, input.landedCostKrw);
  if (!priceGate.ok) return priceGate;

  const profitGate = checkProfit({
    priceKrw,
    landedCostKrw: input.landedCostKrw,
    fees: input.fees,
  });
  if (!profitGate.ok) return profitGate;

  const profit = computeProfit({
    priceKrw,
    landedCostKrw: input.landedCostKrw,
    fees: input.fees,
    withAds: true,
  });

  return {
    ok: true,
    priceKrw,
    netProfitKrw: profit.netProfitKrw,
    marginPct: profit.marginPct,
    floorKrw,
    reason,
  };
}

// ─────────────────────────────────────────────────────────────
// 사람이 읽는 기준표 — 화면·대화에서 그대로 쓴다
// ─────────────────────────────────────────────────────────────

export function describeRules(): string[] {
  return [
    `낱개(1개) 발주가 실제로 되는 공급처만 — 묶음 전용은 위탁이 성립하지 않습니다`,
    `판매가 ${MIN_PRICE_KRW.toLocaleString()}~${MAX_PRICE_KRW.toLocaleString()}원`,
    `공급단가 ${MIN_COST_KRW.toLocaleString()}~${MAX_COST_KRW.toLocaleString()}원`,
    `실마진 ${MIN_MARGIN_PCT}% 이상 — 수수료·광고비·반품충당을 모두 뺀 뒤 기준`,
    `개당 순이익 ${MIN_NET_PROFIT_KRW.toLocaleString()}원 이상 — 율이 아니라 금액이 목표를 만듭니다`,
    `판매가가 원가의 ${MIN_PRICE_TO_COST}~${MAX_PRICE_TO_COST}배 — 벗어나면 묶음가 혼입으로 봅니다`,
  ];
}
