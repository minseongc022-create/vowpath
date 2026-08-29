/**
 * 목표 역산 — 월 500만원을 벌려면 오늘 뭘 해야 하는가
 *
 * ★ 왜 역산이 필요한가
 *
 * "많이 올리면 많이 팔리겠지"는 계획이 아니다. 목표에서 거꾸로 내려와야
 * **오늘 몇 개를 올려야 하는지**가 숫자로 나온다. 그래야 자동 운전이
 * 스스로 속도를 정할 수 있다.
 *
 *   월 목표 순이익
 *     ÷ 개당 순이익      = 월에 팔아야 할 건수
 *     ÷ 30일             = 하루에 팔아야 할 건수
 *     ÷ SKU당 하루 판매량 = 필요한 SKU 수
 *     - 이미 가진 SKU     = 더 올려야 할 SKU 수
 *
 * ★ 가정은 보수적으로만 잡는다
 *
 * SKU당 판매량을 낙관적으로 잡으면 "이 정도면 충분하다"는 답이 나오고,
 * 실제로는 목표에 한참 못 미친다. 그래서 **신규 셀러 기준 낮은 값**을
 * 쓴다. 실측이 쌓이면 그 값으로 갈아끼운다.
 */

import { MIN_NET_PROFIT_KRW } from "../core/rules";

/**
 * SKU 하나가 하루에 팔리는 개수 — 신규 셀러 기준 보수적 가정.
 *
 * 노출이 붙기 전 위탁 신규 SKU는 대부분 하루 0~1개다. 0.35는 "사흘에 한 개"
 * 쯤으로, 광고를 조금 태운 평범한 SKU의 초기 실적에 해당한다.
 * 낙관적으로 잡으면 필요한 SKU 수가 줄어 보이고, 그만큼 목표에 못 닿는다.
 */
export const ASSUMED_DAILY_UNITS_PER_SKU = 0.35;

/**
 * 등록한 SKU 중 실제로 팔리는 비율.
 *
 * 전부 팔리지 않는다 — 노출을 못 받거나 경쟁에 밀리는 게 절반이 넘는다.
 * 이걸 100%로 잡으면 필요 SKU 수가 절반으로 줄어 계획이 통째로 틀어진다.
 */
export const ASSUMED_LIVE_SKU_RATE = 0.45;

/** 하루에 올릴 수 있는 현실적 상한 — 상세페이지 생성과 검수가 병목이다 */
export const MAX_DAILY_LISTINGS = 12;

export type GoalPlan = {
  monthlyGoalKrw: number;
  /** 개당 순이익 가정 (실측이 있으면 그 값) */
  netPerUnitKrw: number;
  /** 월에 팔아야 할 건수 */
  salesNeededPerMonth: number;
  /** 필요한 총 SKU 수 (안 팔리는 SKU까지 감안) */
  skusNeeded: number;
  /** 지금 가진 SKU */
  skusNow: number;
  /** 앞으로 더 올려야 할 SKU */
  skusToAdd: number;
  /** 오늘 올릴 목표 개수 */
  dailyTarget: number;
  /** 이 속도면 목표까지 며칠 */
  daysToGoal: number;
  /** 사람이 읽는 설명 */
  reason: string;
};

export function planForGoal(input: {
  monthlyGoalKrw: number;
  /** 이미 등록된 SKU 수 */
  publishedSkus: number;
  /** 실측된 개당 순이익 평균 (없으면 하한을 보수적으로 쓴다) */
  observedNetPerUnitKrw?: number;
}): GoalPlan {
  const monthlyGoalKrw = Math.max(0, input.monthlyGoalKrw);

  // 실측이 없으면 **하한**을 쓴다. 평균을 낙관적으로 잡으면 필요 SKU가
  // 적어 보이고, 그 계획대로 하면 목표에 못 닿는다.
  const netPerUnitKrw = Math.max(
    1,
    Math.round(input.observedNetPerUnitKrw ?? MIN_NET_PROFIT_KRW * 1.4),
  );

  const salesNeededPerMonth = Math.ceil(monthlyGoalKrw / netPerUnitKrw);
  const salesPerDay = salesNeededPerMonth / 30;

  // 팔리는 SKU 기준으로 필요한 수를 구한 뒤, 안 팔리는 비율만큼 부풀린다
  const sellingSkusNeeded = salesPerDay / ASSUMED_DAILY_UNITS_PER_SKU;
  const skusNeeded = Math.ceil(sellingSkusNeeded / ASSUMED_LIVE_SKU_RATE);

  const skusNow = Math.max(0, input.publishedSkus);
  const skusToAdd = Math.max(0, skusNeeded - skusNow);

  // 남은 SKU를 2주(14일)에 나눠 채우는 속도. 하루 상한은 넘지 않는다.
  const dailyTarget = skusToAdd === 0 ? 0 : Math.min(MAX_DAILY_LISTINGS, Math.max(1, Math.ceil(skusToAdd / 14)));

  const daysToGoal = dailyTarget > 0 ? Math.ceil(skusToAdd / dailyTarget) : 0;

  return {
    monthlyGoalKrw,
    netPerUnitKrw,
    salesNeededPerMonth,
    skusNeeded,
    skusNow,
    skusToAdd,
    dailyTarget,
    daysToGoal,
    reason: buildReason({
      monthlyGoalKrw,
      netPerUnitKrw,
      salesNeededPerMonth,
      skusNeeded,
      skusNow,
      skusToAdd,
      dailyTarget,
      daysToGoal,
    }),
  };
}

function buildReason(p: Omit<GoalPlan, "reason">): string {
  if (p.skusToAdd === 0) {
    return `목표에 필요한 ${p.skusNeeded}개를 이미 채웠습니다. 지금은 새로 올리기보다 팔리는 상품을 키울 때입니다.`;
  }
  return (
    `월 ${(p.monthlyGoalKrw / 10_000).toLocaleString()}만원 = 개당 ${p.netPerUnitKrw.toLocaleString()}원 × ` +
    `${p.salesNeededPerMonth.toLocaleString()}건. ` +
    `SKU 하나가 하루 ${ASSUMED_DAILY_UNITS_PER_SKU}개 팔리고 그중 ${Math.round(ASSUMED_LIVE_SKU_RATE * 100)}%만 실제로 팔린다고 보면 ` +
    `${p.skusNeeded}개가 필요합니다. 지금 ${p.skusNow}개라 ${p.skusToAdd}개 더 — ` +
    `하루 ${p.dailyTarget}개씩 ${p.daysToGoal}일이면 채웁니다.`
  );
}
