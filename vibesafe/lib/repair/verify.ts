import "server-only";

import { prisma } from "../db";
import { particle } from "../korean";
import { getCheckSummary } from "../github/client";
import { resolveAccessToken } from "../github/connection";
import { notify } from "../notify/dispatch";
import { getPermissions, logAction } from "../permissions";
import { enqueueRun } from "../runs/queue";
import { canTransition } from "./pipeline";

/**
 * VERIFY AGAIN — 고쳤다고 말하기 전에 실제로 되는지 확인한다.
 *
 * ★ 이 단계가 이 제품과 "AI가 코드 고쳐주는 도구들"의 차이다
 *
 * 코드를 생성하는 건 이제 아무나 한다. 어려운 건 **그 수정이 실제로 문제를
 * 고쳤는지, 그리고 다른 걸 망가뜨리지 않았는지**를 사람 손을 빌리지 않고
 * 아는 것이다. 우리는 이미 그 앱의 핵심 흐름을 알고 브라우저로 돌릴 수 있으니
 * 그걸 할 수 있다. 이 자산이 없으면 이 단계는 만들 수 없다.
 *
 * ★ 확인하는 세 가지, 그리고 하지 않는 것
 *
 *   1. 깨졌던 그 흐름이 이제 되는가            ← 안 되면 고친 게 아니다
 *   2. 멀쩡하던 나머지 흐름이 여전히 되는가    ← 이게 없으면 수정이 곧 사고다
 *   3. 저장소의 CI가 통과했는가                ← 사용자가 이미 믿는 신호를 읽는다
 *
 *   빌드를 우리가 돌리지 않는다. 사용자의 비밀과 환경을 우리 쪽에 재현해야
 *   하는데, 그건 가능해도 하고 싶지 않은 일이다. CI가 아예 없는 저장소라면
 *   "빌드 통과"라고 말하지 않고 "확인할 수 없었다"고 적는다.
 *
 * ★ 검증은 preview에서 한다. 운영이 아니다.
 *
 * 그래서 이 실행은 baseline도 장애도 건드리지 않는다(runs/complete.ts).
 * 프리뷰에서의 실패를 "운영이 깨졌다"로 기록하면 대시보드가 거짓말한다.
 */

/** 따옴표로 감싼 기능 이름 + 알맞은 주격 조사. */
function quotedSubject(name: string): string {
  const text = `"${name}"`;
  return `${text}${particle(text, "이/가")}`;
}

/** 프리뷰 배포가 준비됐을 때 검증 실행을 건다. */
export async function startRepairVerification(params: {
  proposalId: string;
  previewUrl: string;
  commitSha?: string | null;
}): Promise<{ ok: boolean; runId?: string; reason?: string }> {
  const proposal = await prisma.vibesafeFixProposal.findUnique({
    where: { id: params.proposalId },
    include: { project: { select: { id: true, userId: true } } },
  });
  if (!proposal) return { ok: false, reason: "제안을 찾을 수 없습니다." };
  if (!canTransition(proposal.status, "verifying")) {
    return { ok: false, reason: `지금 상태(${proposal.status})에서는 검증을 시작하지 않습니다.` };
  }

  const result = await enqueueRun({
    userId: proposal.project.userId,
    projectId: proposal.projectId,
    trigger: "repair_verify",
    commitSha: params.commitSha ?? null,
    targetUrl: params.previewUrl,
    prNumber: proposal.prNumber,
    fixProposalId: proposal.id,
  });
  if (!result.ok) return { ok: false, reason: result.error };

  await prisma.vibesafeFixProposal.update({
    where: { id: proposal.id },
    data: { status: "verifying", previewUrl: params.previewUrl, verifyRunId: result.runId },
  });
  await logAction({
    projectId: proposal.projectId,
    action: "repair_verify_started",
    summary: "수정안을 미리보기 배포에서 확인하기 시작했습니다",
    detail: { proposalId: proposal.id, runId: result.runId, previewUrl: params.previewUrl },
    incidentId: proposal.incidentId,
  });

  return { ok: true, runId: result.runId };
}

export type VerifyOutcome = {
  affectedFlowPassed: boolean | null;
  regressionPassed: boolean | null;
  buildPassed: boolean | null;
  staticCheckPassed: boolean | null;
  ready: boolean;
  summary: { flowKey: string; title: string; ok: boolean; note: string }[];
  headline: string;
};

/**
 * 검증 실행이 끝났다. 결과를 읽고 적용 가능 여부를 정한다.
 *
 * ★ 모르는 것을 통과로 세지 않는다
 *
 * 깨졌던 흐름이 이번 실행에 아예 포함되지 않았다면(꺼졌거나 이름이 바뀌었거나)
 * 그건 "고쳐졌다"가 아니라 "확인 못 했다"다. null로 남기고 ready를 주지 않는다.
 */
export async function finishRepairVerification(runId: string): Promise<VerifyOutcome | null> {
  const run = await prisma.vibesafeTestRun.findUnique({
    where: { id: runId },
    include: {
      results: true,
      project: { select: { id: true, userId: true }
      },
    },
  });
  if (!run?.fixProposalId) return null;

  const proposal = await prisma.vibesafeFixProposal.findUnique({
    where: { id: run.fixProposalId },
    include: { project: { include: { repository: true } } },
  });
  if (!proposal) return null;

  const incident = proposal.incidentId
    ? await prisma.vibesafeIncident.findUnique({
        where: { id: proposal.incidentId },
        select: { flowKey: true, flowTitle: true },
      })
    : null;

  const byKey = new Map(run.results.map((r) => [r.flowKey, r]));

  // 1) 깨졌던 흐름
  let affectedFlowPassed: boolean | null = null;
  if (incident?.flowKey) {
    const result = byKey.get(incident.flowKey);
    if (result && result.status !== "skipped") affectedFlowPassed = result.status === "passed";
  }

  // 2) 나머지 흐름 — 이 수정 때문에 새로 깨진 게 있는가.
  //    프리뷰 전에도 깨져 있던 흐름을 이 수정 탓으로 돌리지 않기 위해,
  //    "운영에서 마지막으로 성공한 적이 있는(baseline이 있는)" 흐름만 본다.
  const baselines = await prisma.vibesafeFlowBaseline.findMany({
    where: { projectId: proposal.projectId },
    select: { flowKey: true },
  });
  const hadBaseline = new Set(baselines.map((b) => b.flowKey));

  const others = run.results.filter(
    (r) => r.flowKey !== incident?.flowKey && r.status !== "skipped" && hadBaseline.has(r.flowKey),
  );
  const brokenByFix = others.filter((r) => r.status === "failed");
  const regressionPassed = others.length === 0 ? null : brokenByFix.length === 0;

  // 3) 저장소 자신의 CI
  let buildPassed: boolean | null = null;
  let staticCheckPassed: boolean | null = null;
  let checkNote = "";
  if (proposal.project.repository && proposal.branchName) {
    try {
      const token = await resolveAccessToken(proposal.project.userId);
      const checks = await getCheckSummary(
        token,
        proposal.project.repository.owner,
        proposal.project.repository.repo,
        proposal.branchName,
      );
      if (!checks || checks.total === 0) {
        checkNote = "이 저장소에는 자동 빌드 검사가 없어 확인하지 못했습니다.";
      } else if (checks.failed > 0) {
        buildPassed = false;
        staticCheckPassed = false;
        checkNote = `저장소 CI가 실패했습니다: ${checks.failedNames.slice(0, 3).join(", ")}`;
      } else if (checks.pending > 0) {
        checkNote = `저장소 CI가 아직 돌고 있습니다: ${checks.pendingNames.slice(0, 3).join(", ")}`;
      } else {
        buildPassed = true;
        staticCheckPassed = true;
        checkNote = `저장소 CI ${checks.passed}개 통과`;
      }
    } catch {
      checkNote = "저장소 CI 결과를 읽지 못했습니다.";
    }
  }

  const summary: VerifyOutcome["summary"] = run.results
    .filter((r) => r.status !== "skipped")
    .map((r) => ({
      flowKey: r.flowKey,
      title: r.flowTitle,
      ok: r.status === "passed",
      note:
        r.flowKey === incident?.flowKey
          ? r.status === "passed"
            ? "깨졌던 기능이 다시 됩니다"
            : "깨졌던 기능이 여전히 안 됩니다"
          : r.status === "passed"
            ? "이 수정의 영향을 받지 않았습니다"
            : hadBaseline.has(r.flowKey)
              ? "이 수정 때문에 새로 깨졌습니다"
              : "원래도 되지 않던 기능입니다",
    }));

  // ★ ready는 "확인한 것이 모두 통과"가 아니라 "확인해야 할 것을 다 확인했고
  //   모두 통과"일 때만 준다. 모르는 것(null)이 하나라도 있으면 사람에게 넘긴다.
  const ready =
    affectedFlowPassed === true && regressionPassed !== false && buildPassed !== false;

  const headline = ready
    ? incident
      ? `${quotedSubject(incident.flowTitle)} 미리보기에서 다시 정상 작동합니다.`
      : "미리보기에서 핵심 기능이 모두 정상 작동합니다."
    : affectedFlowPassed === false
      ? `${quotedSubject(incident?.flowTitle ?? "깨진 기능")} 미리보기에서도 여전히 안 됩니다. 이 수정은 문제를 고치지 못했습니다.`
      : affectedFlowPassed === null
        ? "깨졌던 기능을 미리보기에서 확인하지 못했습니다."
        : brokenByFix.length > 0
          ? `이 수정이 다른 기능 ${brokenByFix.length}개를 깨뜨립니다: ${brokenByFix.map((r) => r.flowTitle).join(", ")}`
          : (checkNote || "자동으로 확인하지 못한 것이 있습니다.");

  const nextStatus = ready ? "ready_to_apply" : "needs_human";
  if (canTransition(proposal.status, nextStatus)) {
    await prisma.vibesafeFixProposal.update({
      where: { id: proposal.id },
      data: {
        status: nextStatus,
        affectedFlowPassed,
        regressionPassed,
        buildPassed,
        staticCheckPassed,
        verifySummary: summary as unknown as object,
        error: ready ? null : headline.slice(0, 500),
      },
    });
  }

  await logAction({
    projectId: proposal.projectId,
    action: ready ? "repair_verified" : "repair_verify_failed",
    summary: headline.slice(0, 300),
    detail: {
      proposalId: proposal.id,
      runId,
      affectedFlowPassed,
      regressionPassed,
      buildPassed,
      checkNote,
    },
    incidentId: proposal.incidentId,
  });

  // ★ 약속을 지킨다
  //
  // 수정안을 만들 때 "확인이 끝나면 알려드리겠습니다"라고 말해놓고 알리지
  // 않으면, 사용자는 화면을 다시 열어보지 않는다. 그러면 검증까지 해놓고도
  // 아무도 적용하지 않는 수정이 쌓인다.
  await notifyVerificationResult({
    proposalId: proposal.id,
    projectId: proposal.projectId,
    userId: proposal.project.userId,
    incidentId: proposal.incidentId,
    flowTitle: incident?.flowTitle ?? "핵심 기능",
    ready,
    headline,
  }).catch((error) => console.error("[vibesafe] verify notify failed:", (error as Error).message));

  if (!ready) {
    await prisma.vibesafeRepairOutcome.upsert({
      where: { proposalId: proposal.id },
      create: {
        projectId: proposal.projectId,
        proposalId: proposal.id,
        incidentId: proposal.incidentId,
        flowKey: incident?.flowKey ?? null,
        riskLevel: proposal.riskLevel,
        result: "failed_verify",
        note: headline.slice(0, 500),
      },
      update: { result: "failed_verify", note: headline.slice(0, 500) },
    });
  }

  return {
    affectedFlowPassed,
    regressionPassed,
    buildPassed,
    staticCheckPassed,
    ready,
    summary,
    headline,
  };
}

async function notifyVerificationResult(params: {
  proposalId: string;
  projectId: string;
  userId: string;
  incidentId: string | null;
  flowTitle: string;
  ready: boolean;
  headline: string;
}): Promise<void> {
  const [user, permissions] = await Promise.all([
    prisma.vibesafeUser.findUnique({
      where: { id: params.userId },
      select: { email: true, uiMode: true },
    }),
    getPermissions(params.projectId),
  ]);
  const simple = (user?.uiMode ?? "simple") === "simple";
  const link = `/vibesafe/projects/${params.projectId}/incidents/${params.incidentId ?? ""}`;

  // 자동 적용이 켜져 있으면 곧 적용될 것이므로 "눌러주세요"라고 하지 않는다.
  // 안 할 일을 시키면 알림이 소음이 된다.
  const willAutoApply = params.ready && permissions.autoApplyLowRisk;

  const body = params.ready
    ? [
        params.headline,
        "",
        willAutoApply
          ? "LOW 위험으로 분류되어 곧 자동으로 적용합니다. 적용 후 실제 서비스에서 다시 확인해 알려드리겠습니다."
          : simple
            ? "VibeSafe 화면에서 [수정 적용하기]를 누르시면 실제 서비스에 반영합니다. 아직은 아무것도 바뀌지 않았습니다."
            : "검증을 통과했습니다. 화면에서 적용하거나 PR을 직접 머지하시면 됩니다.",
        "",
        link,
      ].join("\n")
    : [
        params.headline,
        "",
        simple
          ? "자동으로 고치지는 못했습니다. 무엇을 확인했는지 화면에 그대로 적어두었습니다."
          : "자동 검증을 통과하지 못해 적용 버튼을 열지 않았습니다. 검증 결과를 화면에서 확인해주세요.",
        "",
        link,
      ].join("\n");

  await notify({
    userId: params.userId,
    projectId: params.projectId,
    incidentId: params.incidentId,
    kind: "regression",
    title: params.ready
      ? `[VibeSafe] ${params.flowTitle} — 수정 확인이 끝났습니다`
      : `[VibeSafe] ${params.flowTitle} — 자동으로는 고치지 못했습니다`,
    body,
    dedupeKey: `verify:${params.proposalId}:${params.ready ? "ok" : "fail"}`,
    email: true,
    emailTo: user?.email ?? null,
  });
}
