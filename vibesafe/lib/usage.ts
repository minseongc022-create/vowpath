import "server-only";

import { prisma } from "./db";

/**
 * 사용량 측정과 한도.
 *
 * ★ 지금 한도를 거는 이유는 돈을 받기 위해서가 아니다
 *
 * AI 호출과 브라우저 실행은 사용자당 원가가 그대로 나가는 항목이다. 무료
 * 베타에 한도가 없으면 한 명이 실수로(또는 일부러) 검사를 반복 실행하는 것만으로
 * 이번 달 비용이 통제 불능이 된다. 실제로 이 제품이 죽는 가장 흔한 방식이다.
 *
 * 동시에 이 숫자들은 나중에 요금제를 정하는 근거가 된다 — 어떤 값을 어떻게
 * 세는지는 지금 정해둬야 데이터가 쌓인다.
 */

export type UsageMetric = "test_runs" | "ai_analyses" | "browser_ms";

export type PlanLimits = {
  projects: number;
  testRunsPerMonth: number;
  aiAnalysesPerMonth: number;
  browserMsPerMonth: number;
};

/**
 * 무료 베타 한도. 환경변수로 올릴 수 있게 둔 이유는, 초기에 열심히 쓰는
 * 사용자를 막는 것보다 우리가 수동으로 풀어주는 편이 낫기 때문이다.
 */
export function planLimits(): PlanLimits {
  const num = (key: string, fallback: number) => {
    const raw = Number(process.env[key]);
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
  };
  return {
    projects: num("VIBESAFE_LIMIT_PROJECTS", 3),
    testRunsPerMonth: num("VIBESAFE_LIMIT_TEST_RUNS", 300),
    aiAnalysesPerMonth: num("VIBESAFE_LIMIT_AI_ANALYSES", 30),
    browserMsPerMonth: num("VIBESAFE_LIMIT_BROWSER_MS", 2 * 60 * 60 * 1000),
  };
}

export function currentPeriodKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export class UsageLimitError extends Error {
  constructor(public readonly metric: UsageMetric, message: string) {
    super(message);
    this.name = "UsageLimitError";
  }
}

function limitFor(metric: UsageMetric): number {
  const limits = planLimits();
  if (metric === "test_runs") return limits.testRunsPerMonth;
  if (metric === "ai_analyses") return limits.aiAnalysesPerMonth;
  return limits.browserMsPerMonth;
}

const MESSAGES: Record<UsageMetric, string> = {
  test_runs: "이번 달 검사 횟수 한도에 도달했습니다. 다음 달에 초기화됩니다.",
  ai_analyses: "이번 달 앱 분석 횟수 한도에 도달했습니다.",
  browser_ms: "이번 달 브라우저 실행 시간 한도에 도달했습니다.",
};

export async function getUsage(userId: string): Promise<Record<UsageMetric, number>> {
  const periodKey = currentPeriodKey();
  const rows = await prisma.vibesafeUsageCounter.findMany({ where: { userId, periodKey } });
  const usage: Record<UsageMetric, number> = { test_runs: 0, ai_analyses: 0, browser_ms: 0 };
  for (const row of rows) {
    if (row.metric in usage) usage[row.metric as UsageMetric] = row.value;
  }
  return usage;
}

/**
 * 한도를 확인하고 사용량을 올린다.
 *
 * 확인과 증가를 한 번의 upsert로 처리한 뒤 결과를 보고 판단한다 — 따로 하면
 * 동시에 들어온 두 요청이 둘 다 "아직 여유 있음"을 보고 통과한다.
 */
export async function consumeUsage(userId: string, metric: UsageMetric, amount: number): Promise<number> {
  const periodKey = currentPeriodKey();
  const row = await prisma.vibesafeUsageCounter.upsert({
    where: { userId_periodKey_metric: { userId, periodKey, metric } },
    create: { userId, periodKey, metric, value: amount },
    update: { value: { increment: amount } },
    select: { value: true },
  });
  if (row.value > limitFor(metric)) {
    // 넘었으면 되돌려놓는다 — 한도 초과 시도가 다음 달까지 남아있을 이유가 없다.
    await prisma.vibesafeUsageCounter.update({
      where: { userId_periodKey_metric: { userId, periodKey, metric } },
      data: { value: { decrement: amount } },
    });
    throw new UsageLimitError(metric, MESSAGES[metric]);
  }
  return row.value;
}

/** 한도를 넘겨도 실패시키지 않는 계측용(실행 시간 등). */
export async function recordUsage(userId: string, metric: UsageMetric, amount: number): Promise<void> {
  if (amount <= 0) return;
  const periodKey = currentPeriodKey();
  await prisma.vibesafeUsageCounter.upsert({
    where: { userId_periodKey_metric: { userId, periodKey, metric } },
    create: { userId, periodKey, metric, value: amount },
    update: { value: { increment: amount } },
  });
}

export async function canCreateProject(userId: string): Promise<boolean> {
  const count = await prisma.vibesafeProject.count({ where: { userId, archivedAt: null } });
  return count < planLimits().projects;
}
