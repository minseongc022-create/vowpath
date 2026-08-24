/**
 * 광고비 배분기 — 적은 예산으로 최대 효율
 *
 * ★ 토스 광고는 다른 플랫폼과 손익 구조가 근본적으로 다르다:
 * 광고 클릭 후 7일 내 판매분은 **판매수수료(8%)가 면제**된다. 따라서
 * "광고비 < 면제되는 수수료"인 구간에서는 광고를 돌릴수록 순이익이 는다.
 * 얼마까지 입찰해도 되는지가 감이 아니라 산수로 나온다 (toss-growth-levers).
 *
 * ★ 이 배분기의 두 가지 원칙:
 *
 * 1) **실측된 효자에만 태운다.**
 *    예측 점수가 높은 SKU가 아니라, 정산으로 수익이 확인된 SKU에 배분한다.
 *    예측에 태우면 예측 오차에 돈을 거는 것이고, 실적에 태우면 사실에 건다.
 *    (winner-sku-engine이 실제 입금액으로 등급을 매긴다)
 *
 * 2) **손익분기 CPC를 절대 넘지 않는다.**
 *    예산이 남아도 손익분기 위로는 입찰하지 않는다. 넘는 순간 광고가
 *    순이익을 갉아먹기 시작하므로, 남은 예산은 다음 SKU로 흘려보낸다.
 *
 * ⚠️ 인센티브 중복 함정:
 * 이미 배송 인센티브로 판매수수료가 0%인 SKU는 광고의 수수료 면제 효과가
 * **중복되지 않는다**. 그 경우 광고비는 순수 비용이다. 이걸 놓치면
 * "제일 잘 나가는 효자"에 광고를 몰아주다가 오히려 순익을 깎는다.
 * 여기서는 그런 SKU의 배분 비중을 명시적으로 낮춘다.
 */

import { computeAdEconomics, type AdEconomics } from "./toss-growth-levers";
import type { WinnerSku, WinnerReport } from "./winner-sku-engine";

export const AD_ALLOCATOR_VERSION = "1.0";

/** 등급별 예산 가중치 — 파레토(효자 집중) */
const GRADE_WEIGHT: Record<WinnerSku["grade"], number> = {
  hero: 10,
  rising: 4,
  steady: 1,
  declining: 0,
  drain: 0,
  insufficient_data: 0,
};

export type AdCandidate = {
  productName: string;
  priceKrw: number;
  /** 단위 순익 (수수료 차감 전: 판매가 - 공급가 - 배송비) */
  grossMarginKrw: number;
  /** 광고 클릭 → 구매 전환율 %. 실측이 없으면 undefined */
  conversionRatePct?: number;
  /** 이 SKU가 이미 배송 인센티브로 수수료 0%인가 */
  alreadyFeeFree: boolean;
  currentCpcKrw?: number;
};

export type AdAllocation = {
  productName: string;
  grade: WinnerSku["grade"];
  /** 배분된 일 예산 */
  dailyBudgetKrw: number;
  /** 이 SKU에서 넘지 말아야 할 CPC */
  maxCpcKrw: number;
  economics: AdEconomics;
  /** 이 예산으로 기대되는 일 판매 건수 */
  expectedDailyOrders: number;
  /** 광고로 늘어나는 일 순익 (수수료 면제분 - 광고비) */
  expectedDailyNetGainKrw: number;
  action: "scale" | "hold" | "reduce" | "pause";
  reason: string;
};

export type AdBudgetPlan = {
  engineVersion: string;
  totalDailyBudgetKrw: number;
  /** 실제 배분된 합계 — 손익분기 상한 때문에 총예산보다 작을 수 있다 */
  allocatedDailyKrw: number;
  /** 태울 곳이 없어 남긴 예산 */
  unallocatedKrw: number;
  allocations: AdAllocation[];
  paused: AdAllocation[];
  expectedDailyNetGainKrw: number;
  brief: string;
  warnings: string[];
};

/**
 * 예산을 등급 가중치로 나눈 뒤, 각 SKU에서 손익분기 CPC 상한을 적용한다.
 * 상한에 걸려 못 쓰는 예산은 회수해서 남은 SKU에 재배분하지 않고
 * `unallocatedKrw`로 남긴다 — 억지로 태우면 그 자체가 손해이기 때문.
 */
export function allocateAdBudget(input: {
  totalDailyBudgetKrw: number;
  winners: WinnerReport;
  candidates: AdCandidate[];
  /** 전환율 실측이 없을 때 쓸 보수적 기본값 % */
  fallbackConversionRatePct?: number;
}): AdBudgetPlan {
  const warnings: string[] = [];
  const budget = Math.max(0, input.totalDailyBudgetKrw);
  const gradeByName = new Map(input.winners.skus.map((s) => [s.productName, s.grade]));

  const scored = input.candidates.map((c) => {
    const grade = gradeByName.get(c.productName) ?? "insufficient_data";
    return { candidate: c, grade, weight: GRADE_WEIGHT[grade] };
  });

  const totalWeight = scored.reduce((s, x) => s + x.weight, 0);

  if (totalWeight === 0) {
    warnings.push(
      "광고를 태울 검증된 SKU가 없다 — 실판매로 등급이 확인된 SKU에만 배분한다. " +
        "예측 점수만 높은 SKU에 예산을 태우면 예측 오차에 돈을 거는 것이다.",
    );
  }

  const allocations: AdAllocation[] = [];
  const paused: AdAllocation[] = [];

  for (const { candidate, grade, weight } of scored) {
    const cvr = candidate.conversionRatePct ?? input.fallbackConversionRatePct;

    const economics = computeAdEconomics({
      priceKrw: candidate.priceKrw,
      grossMarginKrw: candidate.grossMarginKrw,
      conversionRatePct: cvr ?? 0,
      alreadyFeeFree: candidate.alreadyFeeFree,
      currentCpcKrw: candidate.currentCpcKrw,
    });

    const share = totalWeight > 0 ? weight / totalWeight : 0;
    const rawBudget = Math.round(budget * share);

    // 손익분기 CPC 상한 — 이 위로는 한 푼도 태우지 않는다
    const maxCpc = economics.breakevenCpcKrw;
    const expectedOrders = cvr && maxCpc > 0 ? (rawBudget / maxCpc) * (cvr / 100) : 0;
    const netGain = Math.round(expectedOrders * economics.feeSavedPerSaleKrw - rawBudget);

    const entry: AdAllocation = {
      productName: candidate.productName,
      grade,
      dailyBudgetKrw: 0,
      maxCpcKrw: maxCpc,
      economics,
      expectedDailyOrders: Math.round(expectedOrders * 10) / 10,
      expectedDailyNetGainKrw: 0,
      action: "pause",
      reason: "",
    };

    if (weight === 0) {
      entry.action = "pause";
      entry.reason =
        grade === "insufficient_data"
          ? "표본 부족으로 등급 미판정 — 실판매가 쌓이기 전에는 광고비를 태우지 않는다"
          : grade === "drain"
            ? "정리대상 — 순익이 관리비용을 못 넘는다"
            : "하락 중 — 원인 규명 전 증액 금지";
      paused.push(entry);
      continue;
    }

    if (!cvr) {
      entry.action = "hold";
      entry.reason =
        "전환율 실측 없음 — 손익분기 CPC를 계산할 수 없다. 소액으로 전환율부터 측정할 것";
      paused.push(entry);
      warnings.push(`${candidate.productName}: 전환율 데이터 없음 — 배분 보류`);
      continue;
    }

    if (candidate.alreadyFeeFree) {
      // 인센티브로 이미 0% — 광고의 면제 효과가 중복되지 않아 순수 비용이다.
      // 완전히 끄지는 않되(노출 확대 가치), 비중을 크게 낮춘다.
      const reduced = Math.round(rawBudget * 0.2);
      entry.dailyBudgetKrw = reduced;
      entry.maxCpcKrw = Math.max(1, Math.round(candidate.grossMarginKrw * 0.1));
      entry.expectedDailyNetGainKrw = -reduced;
      entry.action = "reduce";
      entry.reason =
        "이미 배송 인센티브로 수수료 0% — 광고 수수료 면제가 중복되지 않아 광고비는 순수 비용. " +
        "노출 확대 목적의 소액만 유지";
      allocations.push(entry);
      continue;
    }

    if (maxCpc <= 0) {
      entry.action = "pause";
      entry.reason = economics.reason;
      paused.push(entry);
      continue;
    }

    entry.dailyBudgetKrw = rawBudget;
    entry.expectedDailyNetGainKrw = netGain;
    entry.action = grade === "hero" ? "scale" : grade === "rising" ? "scale" : "hold";
    entry.reason =
      `${grade === "hero" ? "효자" : grade === "rising" ? "육성" : "유지"} · ` +
      `손익분기 CPC ${maxCpc.toLocaleString()}원 이하 입찰 시 건당 ${economics.feeSavedPerSaleKrw.toLocaleString()}원 수수료 면제`;
    allocations.push(entry);
  }

  const allocated = allocations.reduce((s, a) => s + a.dailyBudgetKrw, 0);
  const expectedGain = allocations.reduce((s, a) => s + a.expectedDailyNetGainKrw, 0);

  return {
    engineVersion: AD_ALLOCATOR_VERSION,
    totalDailyBudgetKrw: budget,
    allocatedDailyKrw: allocated,
    unallocatedKrw: Math.max(0, budget - allocated),
    allocations: allocations.sort((a, b) => b.dailyBudgetKrw - a.dailyBudgetKrw),
    paused,
    expectedDailyNetGainKrw: expectedGain,
    brief: buildBrief({ budget, allocated, allocations, paused, expectedGain }),
    warnings,
  };
}

function buildBrief(i: {
  budget: number;
  allocated: number;
  allocations: AdAllocation[];
  paused: AdAllocation[];
  expectedGain: number;
}): string {
  if (!i.allocations.length) {
    return "배분 가능한 SKU 없음 — 실판매로 등급이 확인된 SKU가 생기면 자동 배분된다";
  }
  const heroes = i.allocations.filter((a) => a.grade === "hero").length;
  const parts = [
    `일 예산 ${i.budget.toLocaleString()}원 중 ${i.allocated.toLocaleString()}원 배분 (효자 ${heroes}개 우선)`,
  ];
  if (i.budget > i.allocated) {
    parts.push(
      `${(i.budget - i.allocated).toLocaleString()}원 미배분 — 손익분기 CPC 위로는 태우지 않는다`,
    );
  }
  parts.push(
    i.expectedGain >= 0
      ? `기대 일 순익 증가 +${i.expectedGain.toLocaleString()}원 (수수료 면제분 - 광고비)`
      : `기대 일 순익 ${i.expectedGain.toLocaleString()}원 — 입찰가 하향 필요`,
  );
  if (i.paused.length) parts.push(`${i.paused.length}개 보류·중단`);
  return parts.join(" · ");
}
