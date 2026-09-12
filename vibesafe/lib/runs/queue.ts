import "server-only";

import { Prisma } from "@prisma/client";
import { decryptSecret } from "../crypto";
import { prisma } from "../db";
import { canExecute } from "../flows/safety";
import { randomToken } from "../crypto";
import { consumeUsage } from "../usage";

/**
 * 검사 큐.
 *
 * ★ 중복 실행을 막는 두 겹
 *
 * 1) dedupeKey 유니크 제약 — 같은 커밋에 대한 webhook이 두 번 와도(GitHub은
 *    실제로 재전송한다) 두 번째 insert가 DB에서 튕긴다. 애플리케이션에서
 *    "이미 있나요?"를 조회하는 방식은 동시에 들어온 두 요청을 못 막는다.
 * 2) 프로젝트당 동시 1건 — 이미 큐에 있거나 도는 검사가 있으면 새로 만들지
 *    않고 그것을 돌려준다. 사용자가 버튼을 연타해도 검사가 쌓이지 않는다.
 *
 * ★ 무한 재시도를 막는 법
 *
 * 워커가 죽으면 running인 채로 남는다. 되살릴 때 attempts를 올리고, 상한에
 * 닿으면 queued로 돌리지 않고 failed로 끝낸다. 상한이 없으면 깨진 흐름 하나가
 * 워커를 영원히 붙잡는다.
 */

export const MAX_ATTEMPTS = 3;
const STALE_RUN_MS = 10 * 60 * 1000;

/**
 * pr — 프리뷰 배포 검사. 머지 **전에** 돌린다.
 *
 * ★ 이게 제품의 성격을 바꾼다
 *
 * 나머지 트리거는 전부 "이미 운영에 나간 뒤"에 도는 것이라, 잘해야 빨리
 * 알려주는 데서 끝난다. pr 검사는 머지되기 전에 잡으므로 **고객이 깨진 앱을
 * 볼 일 자체가 없어진다**. 알려주는 도구에서 막아주는 도구가 되는 지점이고,
 * PR 워크플로에 한번 들어가면 빼기 어려운 기능이기도 하다.
 */
export type EnqueueTrigger =
  | "manual"
  | "github"
  | "schedule"
  | "pr"
  /** 수정안이 올라간 preview 배포를 검사한다. 운영 상태를 건드리지 않는다. */
  | "repair_verify"
  /** 수정을 적용한 뒤 실제 주소를 다시 검사한다. 이건 진짜 운영 검사다. */
  | "repair_confirm";

/** baseline·장애를 만들지 않는 트리거 — 보고 있는 주소가 운영이 아니기 때문이다. */
export function isPreviewTrigger(trigger: string): boolean {
  return trigger === "pr" || trigger === "repair_verify";
}

export type EnqueueResult =
  | { ok: true; runId: string; created: boolean }
  | { ok: false; error: string; code: "NO_FLOWS" | "NO_TARGET" | "LIMIT" };

function dedupeKeyFor(
  projectId: string,
  trigger: EnqueueTrigger,
  commitSha: string | null,
  prNumber?: number | null,
): string {
  // 같은 PR의 같은 커밋은 한 번만. PR에 push가 연달아 오면 커밋별로 한 번씩.
  if (trigger === "pr" && prNumber) return `pr:${projectId}:${prNumber}:${commitSha ?? "head"}`;
  if (trigger === "repair_verify") return `repairv:${projectId}:${prNumber ?? "x"}:${commitSha ?? "head"}`;
  if (trigger === "repair_confirm") return `repairc:${projectId}:${commitSha ?? Date.now()}`;
  if (trigger === "github" && commitSha) return `github:${projectId}:${commitSha}`;
  if (trigger === "schedule") {
    const now = new Date();
    const hour = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}T${String(now.getUTCHours()).padStart(2, "0")}`;
    return `schedule:${projectId}:${hour}`;
  }
  return `manual:${projectId}:${Date.now()}`;
}

export async function enqueueRun(params: {
  userId: string;
  projectId: string;
  trigger: EnqueueTrigger;
  commitSha?: string | null;
  /** PR 프리뷰 검사일 때 — 운영 주소 대신 이 주소를 본다. */
  targetUrl?: string | null;
  prNumber?: number | null;
  /** 수정 검증 실행일 때 어느 제안의 것인지 */
  fixProposalId?: string | null;
}): Promise<EnqueueResult> {
  const { userId, projectId, trigger } = params;
  const commitSha = params.commitSha ?? null;

  // 프리뷰 검사는 운영 주소가 아니라 넘겨받은 주소를 본다.
  let baseUrl = params.targetUrl ?? null;
  if (!baseUrl) {
    const target = await prisma.vibesafeDeploymentTarget.findUnique({
      where: { projectId_kind: { projectId, kind: "production" } },
      select: { baseUrl: true },
    });
    baseUrl = target?.baseUrl ?? null;
  }
  if (!baseUrl) return { ok: false, error: "서비스 주소가 등록되어 있지 않습니다.", code: "NO_TARGET" };

  const activeFlows = await prisma.vibesafeCriticalFlow.count({
    where: { projectId, status: "active", riskLevel: { not: "blocked" } },
  });
  if (activeFlows === 0) {
    return {
      ok: false,
      error: "확인할 흐름이 없습니다. 핵심 흐름을 먼저 확인하고 켜주세요.",
      code: "NO_FLOWS",
    };
  }

  // 이미 대기/실행 중인 검사가 있으면 그것을 돌려준다.
  // 단 PR 검사는 예외 — PR 두 개가 동시에 열려 있으면 각각 따로 돌아야 한다.
  // 수정 검증도 PR 검사와 같은 이유로 예외다 — 운영 검사가 한 건 돌고 있다고
  // 해서 "이 수정이 문제를 고쳤는가"를 확인하지 못하면 파이프라인이 멈춘다.
  if (!isPreviewTrigger(trigger)) {
    const active = await prisma.vibesafeTestRun.findFirst({
      where: {
        projectId,
        status: { in: ["queued", "running"] },
        trigger: { notIn: ["pr", "repair_verify"] },
      },
      orderBy: { queuedAt: "desc" },
      select: { id: true },
    });
    if (active) return { ok: true, runId: active.id, created: false };
  }

  try {
    await consumeUsage(userId, "test_runs", 1);
  } catch (error) {
    return { ok: false, error: (error as Error).message, code: "LIMIT" };
  }

  const dedupeKey = dedupeKeyFor(projectId, trigger, commitSha, params.prNumber);
  try {
    const run = await prisma.vibesafeTestRun.create({
      data: {
        projectId,
        trigger,
        status: "queued",
        dedupeKey,
        commitSha,
        prNumber: params.prNumber ?? null,
        targetUrl: params.targetUrl ?? null,
        fixProposalId: params.fixProposalId ?? null,
      },
      select: { id: true },
    });
    return { ok: true, runId: run.id, created: true };
  } catch (error) {
    // 유니크 충돌 = 같은 이벤트가 이미 들어왔다. 그 검사를 돌려준다.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.vibesafeTestRun.findUnique({
        where: { dedupeKey },
        select: { id: true },
      });
      if (existing) return { ok: true, runId: existing.id, created: false };
    }
    throw error;
  }
}

export type RunnerStep = {
  order: number;
  action: string;
  selector: string | null;
  value: string | null;
  description: string;
  optional: boolean;
};

export type RunnerFlow = {
  flowId: string;
  key: string;
  title: string;
  steps: RunnerStep[];
};

export type RunnerJob = {
  runId: string;
  claimToken: string;
  projectId: string;
  projectName: string;
  baseUrl: string;
  flows: RunnerFlow[];
};

/** 워커가 죽어 최대 시도 횟수를 다 쓰고 failed로 떨어진 실행. */
export type AbandonedRun = {
  runId: string;
  trigger: string;
  projectId: string;
  fixProposalId: string | null;
};

/**
 * 오래 붙잡힌 검사를 되살린다. 워커가 죽었을 때의 유일한 회복 경로다.
 *
 * 최대 시도 횟수를 다 쓴 실행은 completeRun을 거치지 않고 바로 failed로
 * 떨어진다 — 워커가 애초에 결과를 보낼 수 없는 상태이기 때문이다. 그래서
 * 그런 실행이 REPAIR 파이프라인의 일부였다면(repair_verify/repair_confirm),
 * 그 사실을 반환해 호출자가 이어서 정리하게 한다(repair/reconcile.ts).
 * queue.ts는 repair 모듈을 모른다 — 의존 방향을 한쪽으로만 유지하기 위해서다.
 */
export async function recoverStaleRuns(): Promise<{ recovered: number; abandoned: AbandonedRun[] }> {
  const cutoff = new Date(Date.now() - STALE_RUN_MS);
  const stale = await prisma.vibesafeTestRun.findMany({
    where: { status: "running", claimedAt: { lt: cutoff } },
    select: { id: true, attempts: true, trigger: true, projectId: true, fixProposalId: true },
  });
  let recovered = 0;
  const abandoned: AbandonedRun[] = [];
  for (const run of stale) {
    if (run.attempts >= MAX_ATTEMPTS) {
      const updated = await prisma.vibesafeTestRun.updateMany({
        where: { id: run.id, status: "running" },
        data: {
          status: "failed",
          finishedAt: new Date(),
          error: "검사가 시간 안에 끝나지 않았습니다.",
          claimToken: null,
        },
      });
      if (updated.count > 0) {
        abandoned.push({
          runId: run.id,
          trigger: run.trigger,
          projectId: run.projectId,
          fixProposalId: run.fixProposalId,
        });
      }
    } else {
      await prisma.vibesafeTestRun.updateMany({
        where: { id: run.id, status: "running" },
        data: { status: "queued", claimToken: null, claimedAt: null },
      });
      recovered += 1;
    }
  }
  return { recovered, abandoned };
}

/**
 * 큐에서 하나를 집어간다.
 *
 * 조회 후 조건부 갱신(compare-and-set)이라 두 워커가 동시에 같은 행을 봐도
 * 실제로 상태를 바꾸는 쪽은 하나뿐이다. 진 쪽은 다음 후보로 넘어간다.
 */
export async function claimNextRun(): Promise<RunnerJob | null> {
  await recoverStaleRuns();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = await prisma.vibesafeTestRun.findFirst({
      where: { status: "queued" },
      orderBy: { queuedAt: "asc" },
      select: { id: true },
    });
    if (!candidate) return null;

    const claimToken = randomToken(24);
    const now = new Date();
    const claimed = await prisma.vibesafeTestRun.updateMany({
      where: { id: candidate.id, status: "queued" },
      data: {
        status: "running",
        claimToken,
        claimedAt: now,
        startedAt: now,
        attempts: { increment: 1 },
      },
    });
    if (claimed.count === 0) continue; // 다른 워커가 먼저 집어갔다

    const job = await buildJob(candidate.id, claimToken);
    if (job) return job;

    // 흐름이 사라졌다면 빈 검사를 돌릴 이유가 없다.
    await prisma.vibesafeTestRun.update({
      where: { id: candidate.id },
      data: {
        status: "cancelled",
        finishedAt: new Date(),
        claimToken: null,
        error: "실행할 흐름이 없습니다.",
      },
    });
  }
  return null;
}

async function buildJob(runId: string, claimToken: string): Promise<RunnerJob | null> {
  const run = await prisma.vibesafeTestRun.findUnique({
    where: { id: runId },
    include: {
      project: {
        include: {
          deploymentTargets: { where: { kind: "production" }, take: 1 },
          credential: true,
          flows: {
            where: { status: "active", riskLevel: { not: "blocked" } },
            orderBy: { sortOrder: "asc" },
            include: { steps: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });
  if (!run) return null;

  // PR 검사면 프리뷰 주소를, 아니면 운영 주소를 본다.
  const baseUrl = run.targetUrl ?? run.project.deploymentTargets[0]?.baseUrl;
  if (!baseUrl || run.project.flows.length === 0) return null;

  // ★ 자격증명은 여기서 딱 한 번 복호화해 워커에게 넘긴다. DB에도, 로그에도,
  //   결과에도 평문으로 남지 않는다.
  let username: string | null = null;
  let password: string | null = null;
  if (run.project.credential) {
    try {
      username = decryptSecret(run.project.credential.usernameCipher);
      password = decryptSecret(run.project.credential.passwordCipher);
    } catch {
      username = null;
      password = null;
    }
  }

  const flows: RunnerFlow[] = [];
  for (const flow of run.project.flows) {
    if (!canExecute(flow.riskLevel, flow.status)) continue;

    const steps: RunnerStep[] = [];
    let missingSecret = false;
    for (const step of flow.steps) {
      let value = step.value;
      if (step.secretRef === "username") value = username;
      if (step.secretRef === "password") value = password;
      if (step.secretRef && !value) {
        missingSecret = true;
        break;
      }
      steps.push({
        order: step.sortOrder,
        action: step.action,
        selector: step.selector,
        value,
        description: step.description,
        optional: step.optional,
      });
    }
    // 테스트 계정이 없으면 로그인 흐름을 "실패"로 기록하지 않고 아예 보내지 않는다.
    // 설정이 안 된 것을 장애로 알리면 알림이 의미를 잃는다.
    if (missingSecret) continue;
    if (steps.length === 0) continue;
    flows.push({ flowId: flow.id, key: flow.key, title: flow.title, steps });
  }

  if (flows.length === 0) return null;

  return {
    runId: run.id,
    claimToken,
    projectId: run.projectId,
    projectName: run.project.name,
    baseUrl,
    flows,
  };
}

export async function cancelRun(projectId: string, runId: string): Promise<boolean> {
  const result = await prisma.vibesafeTestRun.updateMany({
    where: { id: runId, projectId, status: { in: ["queued", "running"] } },
    data: { status: "cancelled", finishedAt: new Date(), claimToken: null },
  });
  return result.count > 0;
}
