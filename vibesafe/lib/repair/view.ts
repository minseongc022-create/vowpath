import "server-only";

import { getRoleForFlow } from "../app-map";
import { prisma } from "../db";
import { getPermissions, type ProjectPermissions } from "../permissions";
import { getUiMode } from "../user-prefs";
import type { UiMode } from "../ui-mode";
import type { FileDiff } from "./diff";
import { canApply, stageLabel } from "./pipeline";
import { progress, repairHeadline, riskLabel, verifySentences } from "./present";

/**
 * 장애 화면이 필요한 것을 한 번에 모아준다.
 *
 * ★ 화면이 상태를 해석하지 않게 한다
 *
 * "status가 ready_to_apply이고 권한이 있으면 버튼을 보여준다" 같은 판단을
 * 화면에서 하면, 화면이 늘어날 때마다 같은 판단을 다시 하게 되고 언젠가 한
 * 화면이 틀린다. 여기서 한 번 정하고 화면은 그대로 그리기만 한다.
 */

export type RepairChange = { path: string; whatChanged: string; diff?: FileDiff };

export type RepairProposalView = {
  id: string;
  status: string;
  stage: string;
  headline: string;
  progress: { index: number; total: number };
  title: string;
  rationale: string;
  risk: { level: string; label: string; tone: "ok" | "warn" | "down"; reason: string | null };
  changes: RepairChange[];
  verify: {
    checked: boolean;
    sentences: { text: string; ok: boolean | null }[];
    flows: { flowKey: string; title: string; ok: boolean; note: string }[];
  };
  apply: { allowed: boolean; reason: string };
  attempt: number;
  /** 간편 모드에서 접어두는 것들 — 지우지 않고 접기만 한다 */
  technical: {
    prUrl: string | null;
    prNumber: number | null;
    branchName: string | null;
    previewUrl: string | null;
    mergedSha: string | null;
    confidence: number | null;
  };
  appliedBy: string | null;
  appliedAt: string | null;
  verifiedAt: string | null;
  error: string | null;
};

export type RepairView = {
  mode: UiMode;
  permissions: ProjectPermissions;
  incident: {
    id: string;
    flowKey: string;
    flowTitle: string;
    roleTitle: string | null;
    status: string;
    detectedAt: string;
    failedStepDescription: string | null;
    errorMessage: string | null;
  };
  diagnosis: { id: string; summary: string; suggestion: string | null } | null;
  /** 지금 사람이 봐야 할 제안 하나 */
  current: RepairProposalView | null;
  /** 지나간 시도들 — 숨기지 않는다. 실패한 시도도 이력이다. */
  past: { id: string; status: string; stage: string; title: string; createdAt: string }[];
};

export async function getRepairView(params: {
  userId: string;
  projectId: string;
  incidentId: string;
}): Promise<RepairView | null> {
  const incident = await prisma.vibesafeIncident.findFirst({
    where: { id: params.incidentId, projectId: params.projectId },
  });
  if (!incident) return null;

  const [mode, permissions, diagnosis, proposals, role] = await Promise.all([
    getUiMode(params.userId),
    getPermissions(params.projectId),
    prisma.vibesafeDiagnosis.findFirst({
      where: { incidentId: incident.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, summary: true, suggestion: true },
    }),
    prisma.vibesafeFixProposal.findMany({
      where: { incidentId: incident.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    getRoleForFlow(params.projectId, incident.flowKey),
  ]);

  // 지금 사람이 봐야 할 제안 = **가장 최근 제안**.
  //
  // ★ "아직 안 끝난 것 중 최근"으로 고르면 안 된다
  //
  // 처음엔 그렇게 짰다가 실기동에서 잡혔다: 1차 시도가 needs_human으로
  // 멈춰 있고 3차 시도가 verified로 끝난 상황에서, 화면이 1차(안 끝난 것)를
  // 골라 "자동으로는 확인이 안 됐습니다"를 보여줬다. 실제로는 고쳐졌는데
  // 사용자에게는 실패로 보인 것이다.
  //
  // 새 제안은 앞선 제안을 대체한다(propose-fix.ts가 superseded로 내린다).
  // 그러니 최신 하나만 보면 되고, 그게 항상 지금의 진실이다.
  const current = proposals[0] ?? null;

  return {
    mode,
    permissions,
    incident: {
      id: incident.id,
      flowKey: incident.flowKey,
      flowTitle: incident.flowTitle,
      roleTitle: role?.title ?? null,
      status: incident.status,
      detectedAt: incident.detectedAt.toISOString(),
      failedStepDescription: incident.failedStepDescription,
      errorMessage: incident.errorMessage,
    },
    diagnosis: diagnosis ?? null,
    current: current
      ? toProposalView(current, {
          mode,
          flowTitle: incident.flowTitle,
          roleTitle: role?.title ?? null,
          canApplyFix: permissions.applyFix,
        })
      : null,
    past: proposals
      .filter((proposal) => proposal.id !== current?.id)
      .map((proposal) => ({
        id: proposal.id,
        status: proposal.status,
        stage: stageLabel(proposal.status, mode),
        title: proposal.title,
        createdAt: proposal.createdAt.toISOString(),
      })),
  };
}

type ProposalRow = Awaited<ReturnType<typeof prisma.vibesafeFixProposal.findFirst>>;

function toProposalView(
  proposal: NonNullable<ProposalRow>,
  ctx: { mode: UiMode; flowTitle: string; roleTitle: string | null; canApplyFix: boolean },
): RepairProposalView {
  const changes = Array.isArray(proposal.changes) ? (proposal.changes as unknown as RepairChange[]) : [];
  const verifyFlows = Array.isArray(proposal.verifySummary)
    ? (proposal.verifySummary as unknown as { flowKey: string; title: string; ok: boolean; note: string }[])
    : [];
  const risk = riskLabel(proposal.riskLevel, ctx.mode);

  return {
    id: proposal.id,
    status: proposal.status,
    stage: stageLabel(proposal.status, ctx.mode),
    headline: repairHeadline({
      status: proposal.status,
      mode: ctx.mode,
      flowTitle: ctx.flowTitle,
      roleTitle: ctx.roleTitle,
    }),
    progress: progress(proposal.status),
    title: proposal.title,
    rationale: proposal.rationale,
    risk: {
      level: proposal.riskLevel,
      label: risk.title,
      tone: risk.tone,
      reason: proposal.riskReason,
    },
    changes,
    verify: {
      // 아직 확인 전이면 빈 결과를 "전부 통과"처럼 보여주지 않는다.
      checked: proposal.affectedFlowPassed != null || verifyFlows.length > 0,
      sentences: verifySentences({
        mode: ctx.mode,
        flowTitle: ctx.flowTitle,
        affectedFlowPassed: proposal.affectedFlowPassed,
        regressionPassed: proposal.regressionPassed,
        buildPassed: proposal.buildPassed,
        otherFlowCount: Math.max(0, verifyFlows.length - 1),
      }),
      flows: verifyFlows,
    },
    apply: canApply({
      status: proposal.status,
      hasPermission: ctx.canApplyFix,
      prNumber: proposal.prNumber,
    }),
    attempt: proposal.attempt,
    technical: {
      prUrl: proposal.prUrl,
      prNumber: proposal.prNumber,
      branchName: proposal.branchName,
      previewUrl: proposal.previewUrl,
      mergedSha: proposal.mergedSha,
      confidence: proposal.confidence,
    },
    appliedBy: proposal.appliedBy,
    appliedAt: proposal.appliedAt?.toISOString() ?? null,
    verifiedAt: proposal.verifiedAt?.toISOString() ?? null,
    error: proposal.error,
  };
}

export type RepairHistoryItem = {
  id: string;
  title: string;
  status: string;
  stage: string;
  riskLevel: string;
  riskLabel: { title: string; tone: "ok" | "warn" | "down" };
  incidentId: string | null;
  flowTitle: string | null;
  createdAt: string;
  appliedAt: string | null;
  verifiedAt: string | null;
  outcome: string | null;
  prUrl: string | null;
};

/**
 * 프로젝트의 수정 이력 전체.
 *
 * ★ 실패한 시도도 똑같이 보여준다
 *
 * 성공한 것만 골라 보여주면 "VibeSafe가 고친 건 전부 성공했다"는 착각을
 * 준다. 실패·거절·대체까지 그대로 나열해야 사용자가 이 도구의 실제 타율을
 * 스스로 판단할 수 있다. 판단에 쓸 근거를 감추지 않는다.
 */
export async function getRepairHistory(
  projectId: string,
  take = 50,
): Promise<RepairHistoryItem[]> {
  const project = await prisma.vibesafeProject.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  const mode = project ? await getUiMode(project.userId) : "simple";
  const proposals = await prisma.vibesafeFixProposal.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take,
    include: { outcome: { select: { result: true } } },
  });
  if (proposals.length === 0) return [];

  const incidentIds = [...new Set(proposals.map((p) => p.incidentId).filter((v): v is string => Boolean(v)))];
  const incidents = incidentIds.length
    ? await prisma.vibesafeIncident.findMany({
        where: { id: { in: incidentIds } },
        select: { id: true, flowTitle: true },
      })
    : [];
  const titleByIncident = new Map(incidents.map((i) => [i.id, i.flowTitle]));

  return proposals.map((proposal) => {
    const risk = riskLabel(proposal.riskLevel, mode);
    return {
      id: proposal.id,
      title: proposal.title,
      status: proposal.status,
      stage: stageLabel(proposal.status, mode),
      riskLevel: proposal.riskLevel,
      riskLabel: { title: risk.title, tone: risk.tone },
      incidentId: proposal.incidentId,
      flowTitle: proposal.incidentId ? (titleByIncident.get(proposal.incidentId) ?? null) : null,
      createdAt: proposal.createdAt.toISOString(),
      appliedAt: proposal.appliedAt?.toISOString() ?? null,
      verifiedAt: proposal.verifiedAt?.toISOString() ?? null,
      outcome: proposal.outcome?.result ?? null,
      prUrl: proposal.prUrl,
    };
  });
}

/**
 * 이 프로젝트에서 수정이 실제로 얼마나 통했는가.
 *
 * ★ 건수가 적으면 비율을 말하지 않는다
 *
 * 2건 중 2건을 "성공률 100%"라고 부르는 것은 사실이지만 정직하지 않다.
 * 사용자는 그 숫자를 보고 자동 적용을 켤 수도 있다. 근거가 쌓이기 전에는
 * 건수만 보여주고, 비율은 비워둔다.
 */
export const MIN_SAMPLES_FOR_RATE = 5;

export async function getRepairStats(projectId: string): Promise<{
  total: number;
  verified: number;
  failedVerify: number;
  regressed: number;
  rejected: number;
  successRate: number | null;
  note: string;
}> {
  const rows = await prisma.vibesafeRepairOutcome.groupBy({
    by: ["result"],
    where: { projectId },
    _count: { result: true },
  });
  const count = (key: string) => rows.find((row) => row.result === key)?._count.result ?? 0;

  const verified = count("verified");
  const failedVerify = count("failed_verify");
  const regressed = count("regressed");
  const rejected = count("rejected");
  const total = rows.reduce((sum, row) => sum + row._count.result, 0);

  // 사람이 거절한 건은 "우리가 틀렸다"가 아니므로 분모에서 뺀다.
  const judged = verified + failedVerify + regressed;

  return {
    total,
    verified,
    failedVerify,
    regressed,
    rejected,
    successRate: judged >= MIN_SAMPLES_FOR_RATE ? verified / judged : null,
    note:
      judged >= MIN_SAMPLES_FOR_RATE
        ? `수정 ${judged}건 중 ${verified}건이 실제 서비스에서 확인됐습니다.`
        : judged === 0
          ? "아직 수정 이력이 없습니다."
          : `아직 ${judged}건뿐이라 성공률을 말씀드리기에는 이릅니다. 확인된 수정 ${verified}건.`,
  };
}
