import "server-only";

import { prisma } from "./db";

/**
 * 화면이 필요로 하는 모양으로 데이터를 읽는다.
 *
 * ★ 대시보드는 5초 안에 이해돼야 한다
 *
 * 그래서 화면이 계산을 하지 않는다. "정상인가 / 문제인가"를 여기서 한 번
 * 정하고, 화면은 그 값을 색과 문장으로 옮기기만 한다. 계산이 화면에 흩어지면
 * 같은 상태가 페이지마다 다르게 보이기 시작한다.
 */

export type AppHealth = "ok" | "down" | "checking" | "unknown";

export type FlowHealth = {
  flowId: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
  riskLevel: string;
  riskReason: string | null;
  category: string;
  stepCount: number;
  /** 마지막 검사에서의 결과 */
  lastResult: "passed" | "failed" | "skipped" | null;
  lastCheckedAt: Date | null;
  hasBaseline: boolean;
};

export type ProjectDashboard = {
  project: {
    id: string;
    name: string;
    status: string;
    productionUrl: string | null;
    repository: { owner: string; repo: string; defaultBranch: string } | null;
    hasCredential: boolean;
  };
  health: AppHealth;
  headline: string;
  appModel: { appType: string; summary: string; routeCount: number } | null;
  flows: FlowHealth[];
  pendingFlowCount: number;
  activeFlowCount: number;
  blockedFlowCount: number;
  lastRun: {
    id: string;
    status: string;
    finishedAt: Date | null;
    queuedAt: Date;
    trigger: string;
  } | null;
  activeRun: { id: string; status: string } | null;
  openIncidents: {
    id: string;
    flowTitle: string;
    failedStepDescription: string | null;
    detectedAt: Date;
  }[];
  stats: { runs30d: number; incidents30d: number };
  findings: {
    id: string;
    severity: string;
    title: string;
    filePath: string;
    line: number | null;
    evidence: string;
    advice: string;
  }[];
  nextCheckHint: string;
};

function intervalHours(): number {
  return Number(process.env.VIBESAFE_CHECK_INTERVAL_HOURS) || 6;
}

export async function getProjectDashboard(
  userId: string,
  projectId: string,
): Promise<ProjectDashboard | null> {
  const project = await prisma.vibesafeProject.findFirst({
    where: { id: projectId, userId, archivedAt: null },
    include: {
      repository: true,
      deploymentTargets: { where: { kind: "production" }, take: 1 },
      credential: { select: { id: true } },
      flows: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { steps: true } } },
      },
      appModels: { orderBy: { createdAt: "desc" }, take: 1 },
      findings: { where: { status: "open" }, orderBy: { severity: "asc" }, take: 20 },
    },
  });
  if (!project) return null;

  const [lastRun, activeRun, openIncidents] = await Promise.all([
    prisma.vibesafeTestRun.findFirst({
      where: { projectId, status: { in: ["passed", "failed"] } },
      orderBy: { queuedAt: "desc" },
      select: { id: true, status: true, finishedAt: true, queuedAt: true, trigger: true },
    }),
    prisma.vibesafeTestRun.findFirst({
      where: { projectId, status: { in: ["queued", "running"] } },
      orderBy: { queuedAt: "desc" },
      select: { id: true, status: true },
    }),
    prisma.vibesafeIncident.findMany({
      where: { projectId, status: "open" },
      orderBy: { detectedAt: "desc" },
      select: { id: true, flowTitle: true, failedStepDescription: true, detectedAt: true },
    }),
  ]);

  const lastResults = lastRun
    ? await prisma.vibesafeTestResult.findMany({
        where: { runId: lastRun.id },
        select: { flowKey: true, status: true, finishedAt: true },
      })
    : [];
  const resultByKey = new Map(lastResults.map((r) => [r.flowKey, r]));

  const baselines = await prisma.vibesafeFlowBaseline.findMany({
    where: { projectId },
    select: { flowKey: true },
  });
  const baselineKeys = new Set(baselines.map((b) => b.flowKey));

  const flows: FlowHealth[] = project.flows.map((flow) => {
    const result = resultByKey.get(flow.key);
    return {
      flowId: flow.id,
      key: flow.key,
      title: flow.title,
      description: flow.description,
      status: flow.status,
      riskLevel: flow.riskLevel,
      riskReason: flow.riskReason,
      category: flow.category,
      stepCount: flow._count.steps,
      lastResult: (result?.status as FlowHealth["lastResult"]) ?? null,
      lastCheckedAt: result?.finishedAt ?? null,
      hasBaseline: baselineKeys.has(flow.key),
    };
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [runs30d, incidents30d] = await Promise.all([
    prisma.vibesafeTestRun.count({
      where: { projectId, queuedAt: { gte: thirtyDaysAgo }, status: { in: ["passed", "failed"] } },
    }),
    prisma.vibesafeIncident.count({ where: { projectId, detectedAt: { gte: thirtyDaysAgo } } }),
  ]);

  const activeFlowCount = flows.filter((f) => f.status === "active").length;
  const pendingFlowCount = flows.filter((f) => f.status === "pending").length;
  const blockedFlowCount = flows.filter((f) => f.riskLevel === "blocked").length;

  let health: AppHealth;
  let headline: string;
  if (activeRun) {
    health = "checking";
    headline = "확인하고 있습니다";
  } else if (openIncidents.length > 0) {
    health = "down";
    headline = "문제 발견";
  } else if (!lastRun) {
    health = "unknown";
    headline = activeFlowCount > 0 ? "아직 확인하지 않았습니다" : "확인할 흐름을 골라주세요";
  } else if (lastRun.status === "failed") {
    // 장애로 올라가지 않은 실패 = 한 번도 성공한 적 없는 흐름. 위험 상태로
    // 칠하진 않지만 정상이라고 말하지도 않는다.
    health = "unknown";
    headline = "일부 흐름을 확인하지 못했습니다";
  } else {
    health = "ok";
    headline = "정상";
  }

  const appModelRow = project.appModels[0];
  const routes = Array.isArray(appModelRow?.routes) ? (appModelRow.routes as unknown[]) : [];

  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      productionUrl: project.deploymentTargets[0]?.baseUrl ?? null,
      repository: project.repository
        ? {
            owner: project.repository.owner,
            repo: project.repository.repo,
            defaultBranch: project.repository.defaultBranch,
          }
        : null,
      hasCredential: Boolean(project.credential),
    },
    health,
    headline,
    appModel: appModelRow
      ? { appType: appModelRow.appType, summary: appModelRow.summary, routeCount: routes.length }
      : null,
    flows,
    pendingFlowCount,
    activeFlowCount,
    blockedFlowCount,
    lastRun,
    activeRun,
    openIncidents,
    stats: { runs30d, incidents30d },
    findings: project.findings.map((f) => ({
      id: f.id,
      severity: f.severity,
      title: f.title,
      filePath: f.filePath,
      line: f.line,
      evidence: f.evidence,
      advice: f.advice,
    })),
    nextCheckHint:
      activeFlowCount > 0
        ? `${intervalHours()}시간마다 자동으로 확인합니다`
        : "흐름을 켜면 자동 확인이 시작됩니다",
  };
}

export async function getRunDetail(userId: string, projectId: string, runId: string) {
  const owned = await prisma.vibesafeProject.findFirst({
    where: { id: projectId, userId, archivedAt: null },
    select: { id: true, name: true },
  });
  if (!owned) return null;

  const run = await prisma.vibesafeTestRun.findFirst({
    where: { id: runId, projectId },
    include: { results: { orderBy: { startedAt: "asc" } } },
  });
  if (!run) return null;
  return { project: owned, run };
}

export async function listRuns(userId: string, projectId: string, take = 20) {
  const owned = await prisma.vibesafeProject.findFirst({
    where: { id: projectId, userId, archivedAt: null },
    select: { id: true },
  });
  if (!owned) return [];
  return prisma.vibesafeTestRun.findMany({
    where: { projectId },
    orderBy: { queuedAt: "desc" },
    take,
    select: {
      id: true, status: true, trigger: true, queuedAt: true, finishedAt: true,
      durationMs: true, commitSha: true,
      _count: { select: { results: true } },
    },
  });
}

export type ProjectCard = {
  id: string;
  name: string;
  health: AppHealth;
  headline: string;
  activeFlowCount: number;
  pendingFlowCount: number;
  lastCheckedAt: Date | null;
  openIncidentCount: number;
  productionUrl: string | null;
};

/** 목록 화면용 — 프로젝트마다 상세 조회를 돌리면 N+1이 된다. */
export async function listProjectCards(userId: string): Promise<ProjectCard[]> {
  const projects = await prisma.vibesafeProject.findMany({
    where: { userId, archivedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      deploymentTargets: { where: { kind: "production" }, take: 1, select: { baseUrl: true } },
      flows: { select: { status: true } },
      incidents: { where: { status: "open" }, select: { id: true } },
      testRuns: {
        where: { status: { in: ["passed", "failed", "queued", "running"] } },
        orderBy: { queuedAt: "desc" },
        take: 1,
        select: { status: true, finishedAt: true },
      },
    },
  });

  return projects.map((project) => {
    const activeFlowCount = project.flows.filter((f) => f.status === "active").length;
    const pendingFlowCount = project.flows.filter((f) => f.status === "pending").length;
    const lastRun = project.testRuns[0];
    const openIncidentCount = project.incidents.length;

    let health: AppHealth = "unknown";
    let headline = "아직 확인하지 않았습니다";
    if (lastRun && (lastRun.status === "queued" || lastRun.status === "running")) {
      health = "checking";
      headline = "확인하는 중";
    } else if (openIncidentCount > 0) {
      health = "down";
      headline = "문제 발견";
    } else if (lastRun?.status === "passed") {
      health = "ok";
      headline = "정상";
    } else if (lastRun?.status === "failed") {
      health = "unknown";
      headline = "일부 확인 실패";
    } else if (activeFlowCount === 0) {
      headline = pendingFlowCount > 0 ? "흐름 확인이 필요합니다" : "설정을 마저 해주세요";
    }

    return {
      id: project.id,
      name: project.name,
      health,
      headline,
      activeFlowCount,
      pendingFlowCount,
      lastCheckedAt: lastRun?.finishedAt ?? null,
      openIncidentCount,
      productionUrl: project.deploymentTargets[0]?.baseUrl ?? null,
    };
  });
}
