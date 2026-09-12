import "server-only";

import { prisma } from "./db";
import { getPermissions, getTrustScore } from "./permissions";
import { getRepairStats, MIN_SAMPLES_FOR_RATE } from "./repair/view";
import { evaluateTrustLadder, type TrustSignal, type TrustSuggestion } from "./trust-ladder";

export type { TrustSignal, TrustSuggestion };

/**
 * 신뢰도 엔진 — 서로 다른 곳에 흩어진 신호를 모아 순수 판단 로직
 * (trust-ladder.ts)에 넘긴다.
 *
 * ★ 이 파일이 하는 일은 "모으기"뿐이다
 *
 * 장애 판정 정확도(사람이 "진짜였다/오탐이었다"라고 매긴 것), 전체 수정
 * 성공률, LOW 위험 수정만의 성공률을 DB에서 가져와 evaluateTrustLadder에
 * 넘긴다. 무엇을 제안할지의 규칙은 여기 없다 — trust-ladder.ts에 있고,
 * tests/unit/vibesafe/trust-ladder.test.mjs가 그 규칙을 고정한다.
 *
 * ★ 이 파일도 하지 않는 일
 *
 * `setPermission`이나 `setAutoApply`를 부르지 않는다. 신뢰도가 아무리
 * 높아져도 권한은 사람이 눌러야 바뀐다.
 */

async function getLowRiskRepairStats(
  projectId: string,
): Promise<{ verified: number; judged: number; rate: number | null }> {
  const rows = await prisma.vibesafeRepairOutcome.groupBy({
    by: ["result"],
    where: { projectId, riskLevel: "low" },
    _count: { result: true },
  });
  const count = (key: string) => rows.find((r) => r.result === key)?._count.result ?? 0;
  const verified = count("verified");
  const judged = verified + count("failed_verify") + count("regressed");
  return { verified, judged, rate: judged >= MIN_SAMPLES_FOR_RATE ? verified / judged : null };
}

export type TrustProfile = {
  signals: TrustSignal[];
  suggestion: TrustSuggestion | null;
};

export async function getTrustProfile(projectId: string): Promise<TrustProfile> {
  const [permissions, incidentTrust, repairStats, lowRisk] = await Promise.all([
    getPermissions(projectId),
    getTrustScore(projectId),
    getRepairStats(projectId),
    getLowRiskRepairStats(projectId),
  ]);

  return evaluateTrustLadder({
    permissions,
    incidentAccuracy: incidentTrust.accuracy,
    incidentSamples: incidentTrust.confirmedReal + incidentTrust.falseAlarms,
    incidentConfirmedReal: incidentTrust.confirmedReal,
    repairSuccessRate: repairStats.successRate,
    repairSamples: repairStats.verified + repairStats.failedVerify + repairStats.regressed,
    repairVerified: repairStats.verified,
    repairNote: repairStats.note,
    lowRiskRate: lowRisk.rate,
    lowRiskSamples: lowRisk.judged,
    lowRiskVerified: lowRisk.verified,
  });
}
