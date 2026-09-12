import "server-only";

import { prisma } from "../db";
import { particle } from "../korean";
import { deleteBranch, getPullRequest, mergePullRequest } from "../github/client";
import { resolveWriteToken } from "../github/write-connection";
import { notify } from "../notify/dispatch";
import { getPermissions, logAction, requirePermission } from "../permissions";
import { enqueueRun } from "../runs/queue";
import { canApply, canTransition } from "./pipeline";
import { canAutoApply, type RepairRisk } from "./risk";

/**
 * APPLY — 확인이 끝난 수정을 실제로 적용한다.
 *
 * ★ 여기가 이 제품에서 가장 조심해야 할 코드다
 *
 * 지금까지는 전부 되돌릴 수 있는 일이었다(읽기, 분석, 새 브랜치, PR). 이
 * 함수만이 사용자의 운영 서비스를 바꾼다. 그래서 조건을 겹겹이 둔다:
 *
 *   1. applyFix 권한이 켜져 있어야 한다               (사용자가 미리 허락)
 *   2. 상태가 ready_to_apply여야 한다                 (검증을 통과했다는 뜻)
 *   3. PR의 head sha가 검증할 때와 같아야 한다        (본 것과 합쳐지는 것이 같음)
 *   4. main에 직접 쓰지 않는다 — PR을 머지할 뿐이다   (기록이 남고 되돌릴 수 있음)
 *
 * 3번이 특히 중요하다. 사용자가 diff를 보고 [적용]을 누르는 사이에 그 브랜치에
 * 다른 커밋이 올라왔다면, 사용자가 승인한 것과 다른 코드가 운영에 나간다.
 * 우리가 만든 브랜치라 드문 일이지만, 드문 일이 일어났을 때 조용히 넘어가는
 * 것보다 실패하는 편이 낫다.
 *
 * ★ 그리고 머지했다고 "고쳤습니다"라고 말하지 않는다
 *
 * 머지는 코드가 합쳐진 것일 뿐이다. 배포가 늦을 수도, 실패할 수도, 고친 줄
 * 알았는데 아닐 수도 있다. 실제 주소에서 다시 되는 걸 확인(verified)해야
 * 비로소 고쳤다고 말한다. finalizeAfterProduction()이 그 일을 한다.
 */

/** 따옴표로 감싼 기능 이름 + 알맞은 주격 조사. */
function quotedSubject(name: string): string {
  const text = `"${name}"`;
  return `${text}${particle(text, "이/가")}`;
}

export class ApplyError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "ApplyError";
  }
}

export type ApplyResult = {
  proposalId: string;
  merged: boolean;
  mergedSha: string | null;
  message: string;
};

export async function applyFix(params: {
  userId: string;
  projectId: string;
  proposalId: string;
  /** "user:<email>" 또는 "auto" */
  actor: string;
  /** 자동 적용 경로인가. 사람이 누른 경우와 기록을 구분한다. */
  auto?: boolean;
}): Promise<ApplyResult> {
  const { userId, projectId, proposalId } = params;
  await requirePermission(projectId, "applyFix");

  const proposal = await prisma.vibesafeFixProposal.findFirst({
    where: { id: proposalId, projectId },
    include: { project: { include: { repository: true } } },
  });
  if (!proposal) throw new ApplyError("수정안을 찾을 수 없습니다.", "NOT_FOUND");
  if (proposal.project.userId !== userId) {
    throw new ApplyError("수정안을 찾을 수 없습니다.", "NOT_FOUND");
  }
  if (!proposal.project.repository) {
    throw new ApplyError("저장소가 연결되어 있지 않습니다.", "NO_REPO");
  }

  const gate = canApply({
    status: proposal.status,
    hasPermission: true,
    prNumber: proposal.prNumber,
  });
  if (!gate.allowed) throw new ApplyError(gate.reason, "NOT_APPLICABLE");

  const repo = proposal.project.repository;

  let writeToken: string;
  try {
    writeToken = await resolveWriteToken(userId);
  } catch {
    throw new ApplyError(
      "수정 권한이 있는 GitHub 연결이 없습니다. 계정 화면에서 '수정 권한 연결'을 추가해주세요.",
      "NO_WRITE_CONNECTION",
    );
  }

  const pr = await getPullRequest(writeToken, repo.owner, repo.repo, proposal.prNumber!);
  if (!pr) throw new ApplyError("Pull Request를 읽지 못했습니다.", "PR_UNREADABLE");
  if (pr.merged) {
    // 사람이 GitHub에서 직접 머지한 경우 — 우리 기록만 따라잡는다.
    await prisma.vibesafeFixProposal.update({
      where: { id: proposal.id },
      data: { status: "applied", appliedAt: new Date(), appliedBy: "github", mergedSha: pr.headSha },
    });
    await startProductionVerification(proposal.id);
    return {
      proposalId: proposal.id,
      merged: true,
      mergedSha: pr.headSha,
      message: "이미 GitHub에서 머지되어 있었습니다. 실제 서비스에서 확인을 시작합니다.",
    };
  }
  if (pr.state === "closed") throw new ApplyError("이미 닫힌 PR입니다.", "PR_CLOSED");
  if (pr.mergeable === false) {
    throw new ApplyError(
      "다른 변경과 충돌해서 합칠 수 없습니다. PR에서 충돌을 해결해주세요.",
      "CONFLICT",
    );
  }

  await prisma.vibesafeFixProposal.update({
    where: { id: proposal.id },
    data: { status: "applying" },
  });

  const result = await mergePullRequest(writeToken, repo.owner, repo.repo, proposal.prNumber!, {
    expectedHeadSha: pr.headSha,
    commitTitle: `[VibeSafe] ${proposal.title}`,
    commitMessage: [
      proposal.rationale.slice(0, 1500),
      "",
      `VibeSafe 검증: 깨졌던 기능 재확인 ${proposal.affectedFlowPassed ? "통과" : "미확인"}, 다른 기능 영향 ${proposal.regressionPassed === false ? "있음" : "없음"}`,
      `적용: ${params.auto ? "자동(LOW 위험)" : params.actor}`,
    ].join("\n"),
  });

  if (!result.merged) {
    // 실패하면 되돌려 놓는다 — applying인 채로 남으면 버튼이 영원히 사라진다.
    await prisma.vibesafeFixProposal.update({
      where: { id: proposal.id },
      data: { status: "ready_to_apply", error: result.message.slice(0, 500) },
    });
    await logAction({
      projectId,
      action: "repair_apply_failed",
      actor: params.actor,
      summary: `수정을 적용하지 못했습니다 — ${result.message}`,
      detail: { proposalId: proposal.id, prNumber: proposal.prNumber },
      incidentId: proposal.incidentId,
    });
    throw new ApplyError(result.message, "MERGE_REFUSED");
  }

  await prisma.vibesafeFixProposal.update({
    where: { id: proposal.id },
    data: {
      status: "applied",
      mergedSha: result.sha,
      appliedAt: new Date(),
      appliedBy: params.auto ? "auto" : params.actor,
      error: null,
    },
  });
  await logAction({
    projectId,
    action: "repair_applied",
    actor: params.actor,
    summary: `수정을 적용했습니다(PR #${proposal.prNumber} 머지). 실제 서비스에서 확인을 시작합니다.`,
    detail: {
      proposalId: proposal.id,
      prNumber: proposal.prNumber,
      mergedSha: result.sha,
      auto: Boolean(params.auto),
      riskLevel: proposal.riskLevel,
    },
    incidentId: proposal.incidentId,
  });

  if (proposal.branchName) {
    await deleteBranch(writeToken, repo.owner, repo.repo, proposal.branchName);
  }

  return {
    proposalId: proposal.id,
    merged: true,
    mergedSha: result.sha,
    message: "적용했습니다. 배포가 끝나면 실제 서비스에서 다시 확인합니다.",
  };
}

/**
 * 배포가 끝났다는 신호를 받으면 실제 주소에 대고 다시 검사한다.
 *
 * 이 실행은 프리뷰가 아니라 **운영**이라, 평소 검사와 똑같이 baseline을 밀고
 * 장애를 해제한다. 여기서 흐름이 통과하면 장애는 자연스럽게 닫힌다.
 */
export async function startProductionVerification(proposalId: string): Promise<string | null> {
  const proposal = await prisma.vibesafeFixProposal.findUnique({
    where: { id: proposalId },
    include: { project: { select: { userId: true } } },
  });
  if (!proposal || proposal.status !== "applied") return null;
  if (proposal.productionRunId) return proposal.productionRunId;

  const result = await enqueueRun({
    userId: proposal.project.userId,
    projectId: proposal.projectId,
    trigger: "repair_confirm",
    commitSha: proposal.mergedSha,
    fixProposalId: proposal.id,
  });
  if (!result.ok) return null;

  await prisma.vibesafeFixProposal.update({
    where: { id: proposal.id },
    data: { productionRunId: result.runId },
  });
  return result.runId;
}

/** 배포가 끝나기까지 기다려주는 시간. 이 안에 실패한 것은 아직 실패가 아니다. */
const DEPLOY_GRACE_MS = 15 * 60 * 1000;

/**
 * 운영 검사가 끝날 때마다 호출된다. 적용해둔 수정이 실제로 문제를 고쳤는지를
 * 여기서 최종 판정한다.
 *
 * ★ 통과는 즉시 인정하고, 실패는 유예 뒤에 인정한다
 *
 * 머지 직후의 검사는 아직 예전 배포를 보고 있을 수 있다. 그 실패를 곧바로
 * "수정이 실패했다"로 적으면 멀쩡한 수정이 실패로 기록된다. 반대로 통과는
 * 예전 배포에서 나올 수 없으므로 바로 믿어도 된다.
 */
export async function finalizeAfterProduction(params: {
  projectId: string;
  runId: string;
  passedFlowKeys: string[];
  failedFlowKeys: string[];
}): Promise<void> {
  const applied = await prisma.vibesafeFixProposal.findMany({
    where: { projectId: params.projectId, status: "applied" },
    orderBy: { appliedAt: "desc" },
    take: 10,
  });
  if (applied.length === 0) return;

  const passed = new Set(params.passedFlowKeys);
  const failed = new Set(params.failedFlowKeys);
  const now = Date.now();

  for (const proposal of applied) {
    const incident = proposal.incidentId
      ? await prisma.vibesafeIncident.findUnique({
          where: { id: proposal.incidentId },
          select: { flowKey: true, flowTitle: true, detectedAt: true },
        })
      : null;
    const flowKey = incident?.flowKey;
    if (!flowKey) continue;

    if (passed.has(flowKey)) {
      if (!canTransition(proposal.status, "verified")) continue;
      await prisma.vibesafeFixProposal.update({
        where: { id: proposal.id },
        data: {
          status: "verified",
          productionVerified: true,
          productionRunId: params.runId,
          verifiedAt: new Date(),
          error: null,
        },
      });
      await recordOutcome({
        proposal: { ...proposal, riskLevel: proposal.riskLevel as RepairRisk },
        flowKey,
        result: "verified",
        note: `실제 서비스에서 ${quotedSubject(incident?.flowTitle ?? flowKey)} 다시 정상 작동합니다.`,
        detectedAt: incident?.detectedAt ?? null,
      });
      await logAction({
        projectId: params.projectId,
        action: "repair_verified_production",
        summary: `실제 서비스에서 ${quotedSubject(incident?.flowTitle ?? flowKey)} 다시 정상 작동하는 것을 확인했습니다.`,
        detail: { proposalId: proposal.id, runId: params.runId },
        incidentId: proposal.incidentId,
      });

      // ★ 여기가 유일하게 "고쳤습니다"라고 말해도 되는 자리다
      await notifyRepairResult({
        userId: (await prisma.vibesafeProject.findUnique({
          where: { id: params.projectId },
          select: { userId: true },
        }))!.userId,
        projectId: params.projectId,
        incidentId: proposal.incidentId,
        proposalId: proposal.id,
        flowTitle: incident?.flowTitle ?? flowKey,
        verified: true,
        autoApplied: proposal.appliedBy === "auto",
      }).catch((error) => console.error("[vibesafe] repair notify failed:", (error as Error).message));

      // 하나가 실제로 고쳤으면 같은 장애의 다른 시도는 의미가 없다.
      // 남겨두면 화면에 적용 버튼이 두 개 살아 있게 되고, 사용자가 이미
      // 해결된 문제에 옛 수정을 덧바를 수 있다.
      if (proposal.incidentId) {
        await prisma.vibesafeFixProposal.updateMany({
          where: {
            incidentId: proposal.incidentId,
            id: { not: proposal.id },
            status: { notIn: ["verified", "rejected", "superseded"] },
          },
          data: { status: "superseded" },
        });
      }
      continue;
    }

    if (failed.has(flowKey)) {
      const appliedAt = proposal.appliedAt?.getTime() ?? 0;
      if (now - appliedAt < DEPLOY_GRACE_MS) continue; // 아직 배포 중일 수 있다
      if (!canTransition(proposal.status, "needs_human")) continue;

      await prisma.vibesafeFixProposal.update({
        where: { id: proposal.id },
        data: {
          status: "needs_human",
          productionVerified: false,
          productionRunId: params.runId,
          error: "적용했지만 실제 서비스에서 여전히 문제가 있습니다.",
        },
      });
      await recordOutcome({
        proposal: { ...proposal, riskLevel: proposal.riskLevel as RepairRisk },
        flowKey,
        result: "regressed",
        note: "적용했지만 실제 서비스에서 여전히 문제가 있습니다.",
        detectedAt: incident?.detectedAt ?? null,
      });
      await logAction({
        projectId: params.projectId,
        action: "repair_failed_production",
        summary: `수정을 적용했지만 ${quotedSubject(incident?.flowTitle ?? flowKey)} 실제 서비스에서 여전히 되지 않습니다.`,
        detail: { proposalId: proposal.id, runId: params.runId },
        incidentId: proposal.incidentId,
      });

      // 적용해놓고 안 됐다는 사실은 반드시 알린다. 이걸 조용히 넘기면
      // 사용자는 고쳐진 줄 알고 자고, 아침에 여전히 깨진 앱을 본다.
      await notifyRepairResult({
        userId: (await prisma.vibesafeProject.findUnique({
          where: { id: params.projectId },
          select: { userId: true },
        }))!.userId,
        projectId: params.projectId,
        incidentId: proposal.incidentId,
        proposalId: proposal.id,
        flowTitle: incident?.flowTitle ?? flowKey,
        verified: false,
        autoApplied: proposal.appliedBy === "auto",
      }).catch((error) => console.error("[vibesafe] repair notify failed:", (error as Error).message));
    }
  }
}

async function recordOutcome(params: {
  proposal: { id: string; projectId: string; incidentId: string | null; riskLevel: string; appliedBy: string | null };
  flowKey: string;
  result: string;
  note: string;
  detectedAt: Date | null;
}): Promise<void> {
  const durationMs = params.detectedAt ? Date.now() - params.detectedAt.getTime() : null;
  await prisma.vibesafeRepairOutcome.upsert({
    where: { proposalId: params.proposal.id },
    create: {
      projectId: params.proposal.projectId,
      proposalId: params.proposal.id,
      incidentId: params.proposal.incidentId,
      flowKey: params.flowKey,
      riskLevel: params.proposal.riskLevel,
      result: params.result,
      autoApplied: params.proposal.appliedBy === "auto",
      durationMs: durationMs && durationMs > 0 ? Math.min(durationMs, 2_147_483_000) : null,
      note: params.note.slice(0, 500),
    },
    update: { result: params.result, note: params.note.slice(0, 500) },
  });
}

/**
 * 검증을 통과한 수정을 버튼 없이 적용해도 되는지 판단하고, 되면 적용한다.
 *
 * ★ 기본값은 "하지 않는다"
 *
 * autoApplyLowRisk가 꺼져 있으면(기본) 이 함수는 아무 일도 하지 않는다.
 * 켜져 있어도 LOW 위험 + 검증 통과 + 하루 한도 안쪽일 때만 움직인다.
 * MEDIUM/HIGH는 이 경로로 들어올 수 없다(risk.ts의 canAutoApply).
 */
export async function maybeAutoApply(proposalId: string): Promise<{ applied: boolean; reason: string }> {
  const proposal = await prisma.vibesafeFixProposal.findUnique({
    where: { id: proposalId },
    include: { project: { select: { userId: true } } },
  });
  if (!proposal) return { applied: false, reason: "제안 없음" };
  if (proposal.status !== "ready_to_apply") return { applied: false, reason: "검증 전" };

  const permissions = await getPermissions(proposal.projectId);
  if (!permissions.applyFix) return { applied: false, reason: "적용 권한이 없습니다." };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const todayCount = await prisma.vibesafeFixProposal.count({
    where: { projectId: proposal.projectId, appliedBy: "auto", appliedAt: { gte: since } },
  });

  const decision = canAutoApply({
    risk: proposal.riskLevel as RepairRisk,
    autoApplyLowRisk: permissions.autoApplyLowRisk,
    verified: proposal.affectedFlowPassed === true && proposal.regressionPassed !== false,
    todayCount,
    dailyLimit: permissions.autoApplyDailyLimit,
  });
  if (!decision.allowed) return { applied: false, reason: decision.reason };

  try {
    await applyFix({
      userId: proposal.project.userId,
      projectId: proposal.projectId,
      proposalId: proposal.id,
      actor: "auto",
      auto: true,
    });
    return { applied: true, reason: decision.reason };
  } catch (error) {
    return { applied: false, reason: (error as Error).message };
  }
}

async function notifyRepairResult(params: {
  userId: string;
  projectId: string;
  incidentId: string | null;
  proposalId: string;
  flowTitle: string;
  verified: boolean;
  autoApplied: boolean;
}): Promise<void> {
  const user = await prisma.vibesafeUser.findUnique({
    where: { id: params.userId },
    select: { email: true, uiMode: true },
  });
  const simple = (user?.uiMode ?? "simple") === "simple";
  const link = `/vibesafe/projects/${params.projectId}/incidents/${params.incidentId ?? ""}`;

  const body = params.verified
    ? [
        `${quotedSubject(params.flowTitle)} 실제 서비스에서 다시 정상 작동하는 것을 확인했습니다.`,
        params.autoApplied
          ? "\nLOW 위험으로 분류되어 자동으로 적용한 수정입니다. 내용은 화면과 저장소 이력에 그대로 남아 있습니다."
          : "",
        simple ? "" : "\n적용된 커밋과 검증 결과는 화면에서 확인하실 수 있습니다.",
        `\n${link}`,
      ]
        .filter(Boolean)
        .join("\n")
    : [
        `수정을 적용했지만 ${quotedSubject(params.flowTitle)} 실제 서비스에서 여전히 되지 않습니다.`,
        "",
        "고쳐졌다고 말씀드릴 수 없는 상태입니다. 화면에서 무엇을 확인했는지 보시고, 필요하면 배포를 되돌리실 수 있습니다.",
        `\n${link}`,
      ].join("\n");

  await notify({
    userId: params.userId,
    projectId: params.projectId,
    incidentId: params.incidentId,
    kind: params.verified ? "recovered" : "regression",
    title: params.verified
      ? `[VibeSafe] ${params.flowTitle} — 고쳤습니다`
      : `[VibeSafe] ${params.flowTitle} — 적용했지만 아직 해결되지 않았습니다`,
    body,
    dedupeKey: `repair:${params.proposalId}:${params.verified ? "verified" : "regressed"}`,
    email: true,
    emailTo: user?.email ?? null,
  });
}
