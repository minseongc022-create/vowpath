import "server-only";

import { prisma } from "./db";

/**
 * 이력 — 이 제품의 1번 전환비용.
 *
 * ★ 왜 이게 해자인가
 *
 * 경쟁사가 내일 똑같은 제품을 내놔도, **이 사용자의 앱에 대한 과거 기록은
 * 0에서 시작**한다. "로그인이 87일째 무사고"라는 문장은 87일을 실제로
 * 지켜본 도구만 말할 수 있다. 갈아타면 그 87일이 0이 된다.
 *
 * 그래서 이력은 부가 기능이 아니라 팔아야 하는 본체다. 화면에 크게 띄우고,
 * 시간이 갈수록 숫자가 커지는 걸 사용자가 보게 한다.
 *
 * ★ 왜 롤업 테이블을 따로 두는가
 *
 * 90일치 안정성을 매번 TestResult 원본에서 세면 검사가 쌓일수록 느려진다.
 * 이력이 해자인데 이력 화면이 느리면 해자가 아니라 짐이다. 하루 한 줄로 접는다.
 */

function dayKey(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** 검사 하나가 끝날 때마다 그 날 칸에 더한다. */
export async function rollUpRun(runId: string): Promise<void> {
  const results = await prisma.vibesafeTestResult.findMany({
    where: { runId },
    select: { flowKey: true, status: true, finishedAt: true, run: { select: { projectId: true } } },
  });

  for (const result of results) {
    if (result.status === "skipped") continue;
    const day = dayKey(result.finishedAt);
    const passed = result.status === "passed" ? 1 : 0;
    const failed = result.status === "failed" ? 1 : 0;

    await prisma.vibesafeFlowDailyStat.upsert({
      where: {
        projectId_flowKey_day: { projectId: result.run.projectId, flowKey: result.flowKey, day },
      },
      create: { projectId: result.run.projectId, flowKey: result.flowKey, day, passed, failed },
      update: { passed: { increment: passed }, failed: { increment: failed } },
    });
  }
}

export type FlowHistory = {
  flowKey: string;
  flowTitle: string;
  /** 마지막 실패 이후 며칠째 무사고인가. 한 번도 실패한 적 없으면 관측 시작일부터. */
  cleanDays: number;
  /** 관측 기간 전체에서 실패한 날 수 */
  incidentDays: number;
  totalChecks: number;
  passRate: number | null;
  /** 최근 90일, 오래된 날 → 최근 날 순. null = 그 날 검사 없음 */
  timeline: { day: string; state: "pass" | "fail" | "none" }[];
};

export type ProjectHistory = {
  /** 관측을 시작한 날 */
  watchingSince: Date | null;
  watchingDays: number;
  /** 프로젝트 전체 기준 무사고 일수 (모든 흐름이 무사고인 연속 일수) */
  cleanDays: number;
  totalChecks: number;
  totalIncidents: number;
  /** VibeSafe가 먼저 발견한 장애 — 가치를 증명하는 숫자 */
  caughtBeforeCustomers: number;
  flows: FlowHistory[];
};

const WINDOW_DAYS = 90;

export async function getProjectHistory(projectId: string): Promise<ProjectHistory> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const sinceDay = dayKey(since);

  const [stats, flows, firstRun, incidents] = await Promise.all([
    prisma.vibesafeFlowDailyStat.findMany({
      where: { projectId, day: { gte: sinceDay } },
      orderBy: { day: "asc" },
    }),
    prisma.vibesafeCriticalFlow.findMany({
      where: { projectId },
      select: { key: true, title: true },
    }),
    prisma.vibesafeTestRun.findFirst({
      where: { projectId, status: { in: ["passed", "failed"] } },
      orderBy: { queuedAt: "asc" },
      select: { queuedAt: true },
    }),
    prisma.vibesafeIncident.count({ where: { projectId } }),
  ]);

  const titleByKey = new Map(flows.map((f) => [f.key, f.title]));

  // 날짜 축을 먼저 만들어 둔다 — 검사가 없던 날도 칸이 있어야 히트맵이 안 어긋난다.
  const days: string[] = [];
  for (let i = WINDOW_DAYS - 1; i >= 0; i -= 1) {
    days.push(dayKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10));
  }

  const byFlow = new Map<string, Map<string, { passed: number; failed: number }>>();
  for (const stat of stats) {
    const key = stat.flowKey;
    if (!byFlow.has(key)) byFlow.set(key, new Map());
    byFlow.get(key)!.set(stat.day.toISOString().slice(0, 10), {
      passed: stat.passed,
      failed: stat.failed,
    });
  }

  const flowHistories: FlowHistory[] = [];
  for (const [flowKey, dayMap] of byFlow) {
    const timeline = days.map((day) => {
      const entry = dayMap.get(day);
      if (!entry) return { day, state: "none" as const };
      return { day, state: entry.failed > 0 ? ("fail" as const) : ("pass" as const) };
    });

    // 무사고 일수: 뒤에서부터 실패가 나올 때까지 센다(검사 없는 날은 끊지 않는다).
    let cleanDays = 0;
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      if (timeline[i].state === "fail") break;
      if (timeline[i].state === "pass") cleanDays += 1;
    }

    const totals = [...dayMap.values()].reduce(
      (acc, v) => ({ passed: acc.passed + v.passed, failed: acc.failed + v.failed }),
      { passed: 0, failed: 0 },
    );
    const totalChecks = totals.passed + totals.failed;

    flowHistories.push({
      flowKey,
      flowTitle: titleByKey.get(flowKey) ?? flowKey,
      cleanDays,
      incidentDays: timeline.filter((t) => t.state === "fail").length,
      totalChecks,
      passRate: totalChecks === 0 ? null : totals.passed / totalChecks,
      timeline,
    });
  }

  flowHistories.sort((a, b) => a.flowTitle.localeCompare(b.flowTitle));

  // 프로젝트 전체 무사고 일수 = 모든 흐름이 무사고인 연속 일수
  let projectCleanDays = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const anyFail = flowHistories.some((f) => f.timeline[i]?.state === "fail");
    if (anyFail) break;
    const anyPass = flowHistories.some((f) => f.timeline[i]?.state === "pass");
    if (anyPass) projectCleanDays += 1;
  }

  const totalChecks = flowHistories.reduce((n, f) => n + f.totalChecks, 0);
  const watchingSince = firstRun?.queuedAt ?? null;

  return {
    watchingSince,
    watchingDays: watchingSince
      ? Math.max(1, Math.floor((Date.now() - watchingSince.getTime()) / (24 * 60 * 60 * 1000)))
      : 0,
    cleanDays: projectCleanDays,
    totalChecks,
    totalIncidents: incidents,
    // 우리가 감시하는 동안 발견한 장애는 전부 "고객보다 먼저"다 — 그게 제품의 정의다.
    caughtBeforeCustomers: incidents,
    flows: flowHistories,
  };
}

/** 기존 검사 기록에서 롤업을 다시 만든다(도입 시점 보정용). */
export async function backfillDailyStats(projectId: string): Promise<number> {
  const results = await prisma.vibesafeTestResult.findMany({
    where: { run: { projectId }, status: { in: ["passed", "failed"] } },
    select: { flowKey: true, status: true, finishedAt: true },
  });

  const buckets = new Map<string, { flowKey: string; day: Date; passed: number; failed: number }>();
  for (const result of results) {
    const day = dayKey(result.finishedAt);
    const key = `${result.flowKey}:${day.toISOString()}`;
    const bucket = buckets.get(key) ?? { flowKey: result.flowKey, day, passed: 0, failed: 0 };
    if (result.status === "passed") bucket.passed += 1;
    else bucket.failed += 1;
    buckets.set(key, bucket);
  }

  for (const bucket of buckets.values()) {
    await prisma.vibesafeFlowDailyStat.upsert({
      where: {
        projectId_flowKey_day: { projectId, flowKey: bucket.flowKey, day: bucket.day },
      },
      create: { projectId, ...bucket },
      update: { passed: bucket.passed, failed: bucket.failed },
    });
  }
  return buckets.size;
}
