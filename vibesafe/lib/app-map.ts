import "server-only";

import { withParticle } from "./korean";
import { prisma } from "./db";

/**
 * 앱 지도 — "누가, 이 앱에서, 무엇을 할 수 있는가".
 *
 * ★ 목록이 아니라 지도인 이유
 *
 * 흐름을 그냥 나열하면 "checkout_flow, login_flow, browse_flow"가 된다.
 * 역할로 묶으면 "손님은 3가지를 할 수 있고 그중 1개가 지금 안 됩니다"가 된다.
 * 사장님이 읽고 바로 이해하는 건 두 번째고, 우리가 알림에 쓸 수 있는 문장도
 * 두 번째다.
 *
 * ★ 수정 단계에서도 쓴다
 *
 * "이 수정이 손님 흐름 3개 중 3개를 건드린다"는 위험도의 재료이고,
 * "손님이 하는 일은 전부 그대로입니다"는 검증 결과를 사람 말로 옮긴 것이다.
 *
 * 지도에 없는 것: 이 앱을 만든 사람이 누구인지. 그건 지도가 아니고,
 * 우리가 추측할 일도 아니다.
 */

export type AppMapFlow = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
  riskLevel: string;
  /** 마지막 검사 결과. 한 번도 안 돌았으면 null */
  lastStatus: "passed" | "failed" | null;
  hasOpenIncident: boolean;
};

export type AppMapRole = {
  id: string | null;
  key: string;
  title: string;
  description: string | null;
  isPrimary: boolean;
  flows: AppMapFlow[];
  /** 이 역할이 지금 못 하는 일의 수 */
  brokenCount: number;
};

export type AppMap = {
  appType: string | null;
  summary: string | null;
  roles: AppMapRole[];
  /** 역할이 정해지지 않은 흐름 — 아는 척하지 않고 따로 모아둔다 */
  unassigned: AppMapFlow[];
  totalFlows: number;
  brokenFlows: number;
};

export async function getAppMap(projectId: string): Promise<AppMap> {
  const [appModel, roles, flows, openIncidents] = await Promise.all([
    prisma.vibesafeAppModel.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { appType: true, summary: true },
    }),
    prisma.vibesafeAppUserRole.findMany({
      where: { projectId },
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
    }),
    prisma.vibesafeCriticalFlow.findMany({
      where: { projectId, status: { not: "disabled" } },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        key: true,
        title: true,
        description: true,
        status: true,
        riskLevel: true,
        appUserRoleId: true,
      },
    }),
    prisma.vibesafeIncident.findMany({
      where: { projectId, status: "open" },
      select: { flowKey: true },
    }),
  ]);

  const broken = new Set(openIncidents.map((incident) => incident.flowKey));

  // 흐름별 마지막 결과 — 운영 검사만 본다. 프리뷰 검사 결과를 여기 섞으면
  // "지금 서비스 상태"가 아니라 "머지 안 된 브랜치 상태"를 보여주게 된다.
  const lastResults = await prisma.vibesafeTestResult.findMany({
    where: {
      run: { projectId, trigger: { notIn: ["pr", "repair_verify"] }, status: { in: ["passed", "failed"] } },
      flowKey: { in: flows.map((flow) => flow.key) },
    },
    orderBy: { finishedAt: "desc" },
    select: { flowKey: true, status: true },
    take: 200,
  });
  const lastByKey = new Map<string, "passed" | "failed">();
  for (const result of lastResults) {
    if (lastByKey.has(result.flowKey)) continue;
    if (result.status === "passed" || result.status === "failed") {
      lastByKey.set(result.flowKey, result.status);
    }
  }

  const toMapFlow = (flow: (typeof flows)[number]): AppMapFlow => ({
    id: flow.id,
    key: flow.key,
    title: flow.title,
    description: flow.description,
    status: flow.status,
    riskLevel: flow.riskLevel,
    lastStatus: lastByKey.get(flow.key) ?? null,
    hasOpenIncident: broken.has(flow.key),
  });

  const mapRoles: AppMapRole[] = roles.map((role) => {
    const roleFlows = flows.filter((flow) => flow.appUserRoleId === role.id).map(toMapFlow);
    return {
      id: role.id,
      key: role.key,
      title: role.title,
      description: role.description,
      isPrimary: role.isPrimary,
      flows: roleFlows,
      brokenCount: roleFlows.filter((flow) => flow.hasOpenIncident).length,
    };
  });

  const unassigned = flows.filter((flow) => !flow.appUserRoleId).map(toMapFlow);

  return {
    appType: appModel?.appType ?? null,
    summary: appModel?.summary ?? null,
    roles: mapRoles,
    unassigned,
    totalFlows: flows.length,
    brokenFlows: flows.filter((flow) => broken.has(flow.key)).length,
  };
}

/**
 * "누가 무엇을 못 하는가" 한 문장.
 *
 * ★ "앱 전체가 정상입니다"라고 절대 쓰지 않는다
 *
 * 우리가 확인한 것은 등록된 핵심 흐름 몇 개뿐이다. 그걸 "앱 전체"로 부르는
 * 순간, 확인하지 않은 곳이 깨졌을 때 우리가 거짓말한 것이 된다. 확인한
 * 개수를 그대로 말한다.
 */
export function describeAppMap(map: AppMap): string {
  if (map.totalFlows === 0) return "아직 확인할 기능이 등록되지 않았습니다.";

  const brokenRoles = map.roles.filter((role) => role.brokenCount > 0);
  if (map.brokenFlows === 0) {
    return `확인한 기능 ${map.totalFlows}개가 모두 정상입니다.`;
  }
  if (brokenRoles.length === 0) {
    return `확인한 기능 ${map.totalFlows}개 중 ${map.brokenFlows}개가 지금 되지 않습니다.`;
  }
  return brokenRoles
    .map((role) => `${withParticle(role.title, "이/가")} 못 하는 일 ${role.brokenCount}개`)
    .join(", ");
}

/** 이 흐름을 하는 사람은 누구인가 — 알림 문구에 쓴다. */
export async function getRoleForFlow(
  projectId: string,
  flowKey: string,
): Promise<{ title: string } | null> {
  const flow = await prisma.vibesafeCriticalFlow.findUnique({
    where: { projectId_key: { projectId, key: flowKey } },
    select: { appUserRole: { select: { title: true } } },
  });
  return flow?.appUserRole ? { title: flow.appUserRole.title } : null;
}
