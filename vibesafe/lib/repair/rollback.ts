import "server-only";

import { decryptSecret, encryptSecret, isEncryptionConfigured } from "../crypto";
import { prisma } from "../db";
import { getPermissions, logAction, requirePermission } from "../permissions";

/**
 * 배포 되돌리기.
 *
 * ★ 왜 이것만 자동 실행을 허용하는가
 *
 * 이 제품은 "되돌릴 수 없는 행동을 자동화하지 않는다"를 원칙으로 삼는다
 * (결제·발송·삭제를 막는 flows/safety.ts와 같은 규칙이다). 롤백은 그 원칙에
 * 걸리지 않는 유일한 강한 행동이다 — 잘못 되돌렸으면 다시 앞으로 가면 된다.
 *
 * 대신 실제 서비스가 즉시 바뀌는 건 맞으므로 세 가지 안전장치를 둔다.
 *   1. 권한을 따로 켜야 한다.
 *   2. 하루 실행 한도가 있다(기본 2회). 잘못된 판정이 배포를 앞뒤로 흔드는
 *      것(flapping)을 막는다.
 *   3. 되돌린 기록이 전부 남고, 사용자에게 알린다. 모르는 사이에 배포가
 *      바뀌어 있는 것만큼 신뢰를 깨는 일은 없다.
 */

const VERCEL_API = "https://api.vercel.com";
const COOLDOWN_MS = 30 * 60 * 1000;

export class RollbackError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "RollbackError";
  }
}

/** Vercel 토큰은 계정 전체를 다룰 수 있는 강한 값이다 — 반드시 암호화해 보관한다. */
export async function connectVercel(userId: string, token: string, teamId?: string | null) {
  if (!isEncryptionConfigured()) throw new RollbackError("암호화 키가 없습니다.", "NO_ENCRYPTION");

  const res = await fetch(`${VERCEL_API}/v2/user`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new RollbackError("Vercel 토큰을 확인하지 못했습니다.", "BAD_TOKEN");
  const data = (await res.json()) as { user?: { username?: string; id?: string } };

  await prisma.vibesafeIntegration.upsert({
    where: { userId_provider_accessLevel: { userId, provider: "vercel", accessLevel: "write" } },
    create: {
      userId,
      provider: "vercel",
      accessLevel: "write",
      authKind: "pat",
      externalId: data.user?.id ?? "unknown",
      externalLogin: data.user?.username ?? "unknown",
      accessTokenCipher: encryptSecret(token),
      scopes: teamId ? `team:${teamId}` : "personal",
      revokedAt: null,
    },
    update: {
      accessTokenCipher: encryptSecret(token),
      externalLogin: data.user?.username ?? "unknown",
      scopes: teamId ? `team:${teamId}` : "personal",
      revokedAt: null,
    },
  });
  return { login: data.user?.username ?? "unknown" };
}

export async function getVercelConnection(userId: string) {
  const row = await prisma.vibesafeIntegration.findUnique({
    where: { userId_provider_accessLevel: { userId, provider: "vercel", accessLevel: "write" } },
    select: { externalLogin: true, scopes: true, createdAt: true, revokedAt: true },
  });
  if (!row || row.revokedAt) return null;
  return { login: row.externalLogin, scopes: row.scopes, connectedAt: row.createdAt };
}

export async function disconnectVercel(userId: string) {
  await prisma.vibesafeIntegration.updateMany({
    where: { userId, provider: "vercel", accessLevel: "write" },
    data: { revokedAt: new Date(), accessTokenCipher: null },
  });
}

async function resolveVercelToken(userId: string): Promise<{ token: string; teamId: string | null }> {
  const row = await prisma.vibesafeIntegration.findUnique({
    where: { userId_provider_accessLevel: { userId, provider: "vercel", accessLevel: "write" } },
  });
  if (!row || row.revokedAt || !row.accessTokenCipher) {
    throw new RollbackError("Vercel이 연결되어 있지 않습니다.", "NOT_CONNECTED");
  }
  const teamId = row.scopes?.startsWith("team:") ? row.scopes.slice(5) : null;
  return { token: decryptSecret(row.accessTokenCipher), teamId };
}

function query(teamId: string | null, extra: Record<string, string> = {}) {
  const params = new URLSearchParams(extra);
  if (teamId) params.set("teamId", teamId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

type Deployment = { uid: string; url: string; createdAt: number; state: string; target: string | null };

/** 배포 주소로 Vercel 프로젝트를 찾는다. 사용자가 프로젝트 이름을 몰라도 되게. */
async function findProjectByUrl(
  token: string,
  teamId: string | null,
  baseUrl: string,
): Promise<string | null> {
  const host = (() => {
    try {
      return new URL(baseUrl).hostname;
    } catch {
      return null;
    }
  })();
  if (!host) return null;

  const res = await fetch(`${VERCEL_API}/v9/projects${query(teamId, { limit: "100" })}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    projects?: { id: string; name: string; alias?: { domain: string }[]; targets?: Record<string, { alias?: string[] }> }[];
  };

  for (const project of data.projects ?? []) {
    if ((project.alias ?? []).some((a) => a.domain === host)) return project.id;
    const prodAliases = project.targets?.production?.alias ?? [];
    if (prodAliases.includes(host)) return project.id;
    // `my-app.vercel.app` 기본 주소는 프로젝트 이름과 같다.
    if (host.startsWith(`${project.name}.`) || host === `${project.name}.vercel.app`) return project.id;
  }
  return null;
}

async function listProductionDeployments(
  token: string,
  teamId: string | null,
  projectId: string,
): Promise<Deployment[]> {
  const res = await fetch(
    `${VERCEL_API}/v6/deployments${query(teamId, { projectId, target: "production", limit: "20", state: "READY" })}`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) },
  );
  if (!res.ok) throw new RollbackError("배포 목록을 가져오지 못했습니다.", "LIST_FAILED");
  const data = (await res.json()) as {
    deployments?: { uid: string; url: string; created: number; state: string; target: string | null }[];
  };
  return (data.deployments ?? []).map((d) => ({
    uid: d.uid,
    url: d.url,
    createdAt: d.created,
    state: d.state,
    target: d.target,
  }));
}

/** 하루 한도와 쿨다운을 확인한다. */
async function checkRateLimits(projectId: string): Promise<void> {
  const permissions = await getPermissions(projectId);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [todayCount, last] = await Promise.all([
    prisma.vibesafeRollback.count({
      where: { projectId, createdAt: { gte: dayAgo }, status: "succeeded" },
    }),
    prisma.vibesafeRollback.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  if (todayCount >= permissions.rollbackDailyLimit) {
    throw new RollbackError(
      `하루 되돌리기 한도(${permissions.rollbackDailyLimit}회)에 도달했습니다. 반복해서 되돌린다는 건 배포가 아니라 다른 곳에 문제가 있다는 뜻일 수 있습니다.`,
      "DAILY_LIMIT",
    );
  }
  if (last && Date.now() - last.createdAt.getTime() < COOLDOWN_MS) {
    throw new RollbackError("직전 되돌리기 후 30분이 지나지 않았습니다.", "COOLDOWN");
  }
}

export type RollbackResult = {
  rollbackId: string;
  fromDeployId: string;
  toDeployId: string;
  toUrl: string;
};

export async function rollbackToPreviousDeployment(params: {
  userId: string;
  projectId: string;
  incidentId?: string | null;
  reason: string;
  triggeredBy?: string;
}): Promise<RollbackResult> {
  const { userId, projectId, reason } = params;
  await requirePermission(projectId, "rollback");
  await checkRateLimits(projectId);

  const project = await prisma.vibesafeProject.findFirst({
    where: { id: projectId, userId },
    include: { deploymentTargets: { where: { kind: "production" }, take: 1 } },
  });
  const baseUrl = project?.deploymentTargets[0]?.baseUrl;
  if (!baseUrl) throw new RollbackError("서비스 주소가 없습니다.", "NO_TARGET");
  if (project?.deploymentTargets[0]?.platform !== "vercel") {
    throw new RollbackError(
      "지금은 Vercel 배포만 되돌릴 수 있습니다.",
      "UNSUPPORTED_PLATFORM",
    );
  }

  const { token, teamId } = await resolveVercelToken(userId);
  const vercelProjectId = await findProjectByUrl(token, teamId, baseUrl);
  if (!vercelProjectId) {
    throw new RollbackError(
      "이 주소에 해당하는 Vercel 프로젝트를 찾지 못했습니다. 연결한 계정에 그 프로젝트가 있는지 확인해주세요.",
      "PROJECT_NOT_FOUND",
    );
  }

  const deployments = await listProductionDeployments(token, teamId, vercelProjectId);
  if (deployments.length < 2) {
    throw new RollbackError("되돌릴 이전 배포가 없습니다.", "NO_PREVIOUS");
  }

  const [current, previous] = deployments;
  const record = await prisma.vibesafeRollback.create({
    data: {
      projectId,
      incidentId: params.incidentId ?? null,
      platform: "vercel",
      fromDeployId: current.uid,
      toDeployId: previous.uid,
      status: "requested",
      reason: reason.slice(0, 500),
      triggeredBy: params.triggeredBy ?? "system",
    },
    select: { id: true },
  });

  const res = await fetch(
    `${VERCEL_API}/v9/projects/${vercelProjectId}/rollback/${previous.uid}${query(teamId)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    await prisma.vibesafeRollback.update({
      where: { id: record.id },
      data: { status: "failed", error: `${res.status} ${detail.slice(0, 300)}` },
    });
    throw new RollbackError(`되돌리기에 실패했습니다 (${res.status}).`, "ROLLBACK_FAILED");
  }

  await prisma.vibesafeRollback.update({
    where: { id: record.id },
    data: { status: "succeeded" },
  });
  await logAction({
    projectId,
    action: "rollback",
    actor: params.triggeredBy ?? "system",
    summary: `배포를 이전 버전으로 되돌렸습니다 (${previous.url})`,
    detail: { from: current.uid, to: previous.uid, reason },
    incidentId: params.incidentId ?? null,
  });

  return {
    rollbackId: record.id,
    fromDeployId: current.uid,
    toDeployId: previous.uid,
    toUrl: previous.url,
  };
}

export async function listRollbacks(projectId: string, take = 20) {
  return prisma.vibesafeRollback.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take,
  });
}
