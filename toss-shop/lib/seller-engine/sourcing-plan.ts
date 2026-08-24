/**
 * 적응형 소싱 계획 — "하루 몇 개"를 고정하지 않고 목표에서 역산한다.
 *
 * 왜 고정값이 틀린가:
 * 하루 15개는 그 자체로 아무 의미가 없다. 의미 있는 건 "월 1,000만 달성확률
 * 90%를 넘기는 누적 SKU 수"이고, 그 수는 SKU 경제성(마진·경쟁·노출확률)에
 * 따라 45개일 수도 125개일 수도 있다. 그래서 매 사이클마다
 *   목표확률 → 필요 누적 SKU → (필요 - 현재) / 남은기간 = 오늘 소싱량
 * 으로 역산한다.
 *
 * 시뮬레이션 결과 (profit-probability, 목표 월1,000만·확률90%):
 *   보수적(경쟁1.5·리뷰300·SEO70) → 125개 필요
 *   현실적(경쟁1.0·리뷰120·SEO85) →  80개 필요
 *   최적화(경쟁0.8·리뷰50 ·SEO85) →  45개 필요
 *
 * 상한을 두는 이유(무제한이 더 좋은 게 아님):
 *  - 신규 셀러가 하루 수십~수백 개를 쏟아내면 플랫폼 어뷰징 의심 대상이 된다
 *  - 리스팅당 상세페이지·SEO 품질이 떨어지면 노출확률이 낮아져 역효과
 *  - 도매매 자동발주가 아직 없어 주문이 폭증하면 발주가 병목이 된다
 */

import { computePortfolioGoal, type DataQuality } from "./profit-probability";

export const SOURCING_PLAN_VERSION = "1.0";

/** 하루 소싱 상한 — 품질·플랫폼 리스크 고려 (env로 조정 가능) */
export const SOURCING_MAX_PER_DAY = 30;
export const SOURCING_MIN_PER_DAY = 5;
/** 목표 누적 SKU를 며칠 안에 채울 것인가 */
export const SOURCING_HORIZON_DAYS = 7;
/** 확률을 못 믿을 때(demo 데이터) 쓰는 고정 기본값 — 역산 결과를 쓰면 안 된다 */
export const SOURCING_FALLBACK_PER_DAY = 15;
/** 달성 목표 확률 */
export const GOAL_PROB_TARGET_PCT = 90;

export function sourcingMaxPerDay(): number {
  const raw = Number(process.env.JARVIS_SOURCING_MAX_PER_DAY);
  return Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), 100) : SOURCING_MAX_PER_DAY;
}

export type SkuEconomics = {
  baselineDailyUnits: number;
  netProfitPerUnitKrw: number;
  competitionIntensity: number;
  competitorAvgReviews?: number;
  seoScore?: number;
  priceRatioVsLow?: number;
};

export type SourcingPlan = {
  /** 오늘 소싱할 SKU 수 */
  dailyTarget: number;
  /** 목표확률 달성에 필요한 누적 SKU */
  requiredSkus: number;
  /** 현재 누적 SKU */
  currentSkus: number;
  /** 현재 누적 기준 목표 달성확률 */
  currentGoalProbPct: number;
  mode: "ramp" | "maintain" | "unknown";
  /** demo 데이터면 확률을 근거로 쓸 수 없다 */
  trustworthy: boolean;
  reason: string;
};

function probForCount(count: number, econ: SkuEconomics, dataQuality: DataQuality, goalKrw: number) {
  const skus = Array.from({ length: count }, (_, i) => ({ seedKey: `plan${i}`, ...econ }));
  return computePortfolioGoal({ skus, dataQuality, goalKrw, trials: 1200 });
}

/**
 * 목표 확률을 넘기는 최소 누적 SKU 수를 탐색한다.
 * (SKU가 늘수록 확률이 단조 증가하므로 이분 탐색이 유효)
 */
export function findRequiredSkuCount(input: {
  econ: SkuEconomics;
  dataQuality: DataQuality;
  goalKrw: number;
  targetProbPct?: number;
  maxSearch?: number;
}): number {
  const target = input.targetProbPct ?? GOAL_PROB_TARGET_PCT;
  const maxSearch = input.maxSearch ?? 400;

  if (probForCount(maxSearch, input.econ, input.dataQuality, input.goalKrw).goalProbPct < target) {
    // 이 경제성으로는 현실적 SKU 수 안에서 목표 달성 불가 —
    // SKU를 더 찍는 게 아니라 SKU 품질(마진·틈새·SEO)을 바꿔야 한다는 신호.
    return maxSearch;
  }

  let lo = 1;
  let hi = maxSearch;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (probForCount(mid, input.econ, input.dataQuality, input.goalKrw).goalProbPct >= target) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export function computeSourcingPlan(input: {
  currentSkus: number;
  econ: SkuEconomics;
  dataQuality: DataQuality;
  goalKrw: number;
  horizonDays?: number;
  targetProbPct?: number;
}): SourcingPlan {
  const horizon = Math.max(1, input.horizonDays ?? SOURCING_HORIZON_DAYS);
  const target = input.targetProbPct ?? GOAL_PROB_TARGET_PCT;
  const cap = sourcingMaxPerDay();

  const required = findRequiredSkuCount({
    econ: input.econ,
    dataQuality: input.dataQuality,
    goalKrw: input.goalKrw,
    targetProbPct: target,
  });

  const current = probForCount(
    Math.max(1, input.currentSkus),
    input.econ,
    input.dataQuality,
    input.goalKrw,
  );
  const trustworthy = current.trustworthy;
  const currentProb = input.currentSkus <= 0 ? 0 : current.goalProbPct;

  const remaining = Math.max(0, required - input.currentSkus);
  const mode: SourcingPlan["mode"] = !trustworthy ? "unknown" : remaining > 0 ? "ramp" : "maintain";

  // 목표 달성 후에도 이탈·품절 SKU 교체를 위해 최소량은 계속 돌린다
  const rawDaily = remaining > 0 ? Math.ceil(remaining / horizon) : SOURCING_MIN_PER_DAY;
  // demo면 역산 자체가 못 믿을 값이므로 파생값을 쓰지 않고 고정 기본값을 쓴다
  const dailyTarget = !trustworthy
    ? Math.min(cap, SOURCING_FALLBACK_PER_DAY)
    : Math.max(SOURCING_MIN_PER_DAY, Math.min(cap, rawDaily));

  let reason: string;
  if (!trustworthy) {
    reason =
      `demo 데이터 — 달성확률을 근거로 쓸 수 없어 소싱량을 역산할 수 없다. ` +
      `안전 기본값 ${dailyTarget}개/일로 진행하고, 토스·도매꾹 API 연동 후 재계산한다.`;
  } else if (remaining > 0) {
    reason =
      `목표 ${target}% 달성에 누적 ${required}개 필요 · 현재 ${input.currentSkus}개(${currentProb}%) → ` +
      `${remaining}개 부족. ${horizon}일 안에 채우려면 ${dailyTarget}개/일` +
      (rawDaily > cap ? ` (상한 ${cap}개로 제한 — 품질·플랫폼 리스크)` : "");
  } else {
    reason =
      `누적 ${input.currentSkus}개로 달성확률 ${currentProb}% — 목표 ${target}% 상회. ` +
      `유지 모드: 품절·이탈 SKU 교체 위주로 ${dailyTarget}개/일`;
  }

  return {
    dailyTarget,
    requiredSkus: required,
    currentSkus: input.currentSkus,
    currentGoalProbPct: currentProb,
    mode,
    trustworthy,
    reason,
  };
}
