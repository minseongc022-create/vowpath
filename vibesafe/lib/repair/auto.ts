import "server-only";

import { prisma } from "../db";
import { isAiConfigured } from "../ai";
import { notify } from "../notify/dispatch";
import { getPermissions, logAction } from "../permissions";
import { checkPlatformSignal } from "../signals";
import { diagnoseIncident } from "./diagnose";
import { proposeFix } from "./propose-fix";
import { rollbackToPreviousDeployment } from "./rollback";

/**
 * 검사가 끝난 뒤 자동으로 어디까지 갈지 정하는 자리.
 *
 * ★ 기본값은 "아무것도 안 함"이다
 *
 * 권한이 하나도 안 켜져 있으면 이 함수는 즉시 돌아간다. 사용자가 단계를
 * 올린 만큼만 간다 — 진단까지, 혹은 PR까지, 혹은 롤백까지.
 *
 * ★ 왜 플랫폼 장애일 때 멈추는가
 *
 * Supabase가 죽어서 앱 12개가 동시에 실패한 건데 각자 배포를 롤백하면,
 * 멀쩡한 코드를 12명이 되돌리고 Supabase가 살아난 뒤에도 앱이 옛 버전으로
 * 남는다. 남의 장애로 내 코드를 되돌리는 건 최악의 자동화다.
 */
export async function maybeAutoRepair(params: {
  userId: string;
  projectId: string;
}): Promise<void> {
  const { userId, projectId } = params;
  const permissions = await getPermissions(projectId);
  if (!permissions.diagnose) return;
  if (!isAiConfigured()) return;

  const incident = await prisma.vibesafeIncident.findFirst({
    where: { projectId, status: "open" },
    orderBy: { detectedAt: "desc" },
  });
  if (!incident) return;

  // 이미 이 장애를 진단했으면 다시 하지 않는다 — 같은 장애로 AI를 반복 호출하면
  // 비용만 나가고 사용자에게 같은 말을 여러 번 하게 된다.
  const existing = await prisma.vibesafeDiagnosis.findFirst({
    where: { incidentId: incident.id },
    select: { id: true },
  });
  if (existing) return;

  // 플랫폼 전체 장애로 보이면 여기서 멈춘다. 원인이 우리 코드가 아니다.
  const platform = await checkPlatformSignal({
    errorMessage: incident.errorMessage,
    failedStepDescription: incident.failedStepDescription,
  });
  if (platform.isLikelyPlatformIssue) {
    await logAction({
      projectId,
      action: "diagnosis",
      summary: `자동 조치를 멈췄습니다 — 다른 앱 ${platform.affectedProjects}개에서도 같은 증상이 나타납니다`,
      detail: { category: platform.category, affectedProjects: platform.affectedProjects },
      incidentId: incident.id,
    });
    return;
  }

  let diagnosisId: string | null = null;
  try {
    const diagnosis = await diagnoseIncident({ userId, projectId, incidentId: incident.id });
    diagnosisId = diagnosis.diagnosisId;

    const user = await prisma.vibesafeUser.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const top = diagnosis.suspects[0];
    await notify({
      userId,
      projectId,
      incidentId: incident.id,
      kind: "regression",
      title: `[VibeSafe] ${incident.flowTitle} — 원인 분석이 끝났습니다`,
      body:
        `${diagnosis.summary}\n\n` +
        (top
          ? `가장 의심되는 변경: ${top.sha.slice(0, 8)} ${top.message}\n이유: ${top.reason}\n\n`
          : "") +
        (diagnosis.suggestion ? `제안: ${diagnosis.suggestion}\n` : ""),
      dedupeKey: `diagnosis:${diagnosis.diagnosisId}`,
      email: true,
      emailTo: user?.email ?? null,
    });
  } catch (error) {
    // 진단 실패는 조용히 넘긴다 — 장애 알림은 이미 나갔고, 진단은 덤이다.
    console.error("[vibesafe] diagnose failed:", (error as Error).message);
    return;
  }

  if (permissions.proposePr && diagnosisId) {
    try {
      const fix = await proposeFix({ userId, projectId, diagnosisId });
      const user = await prisma.vibesafeUser.findUnique({
        where: { id: userId },
        select: { email: true, uiMode: true },
      });

      // ★ 여기서 "고쳤습니다"라고 하지 않는다
      //
      // 지금 한 일은 수정안을 만들어 브랜치에 올린 것뿐이다. 문제를 실제로
      // 고쳤는지는 프리뷰 배포에서 확인해봐야 안다. 그 전에 "고쳤습니다"라고
      // 알리면 사용자는 확인하지 않고 잠들고, 아침에 여전히 깨져 있는 앱을
      // 본다. 그 한 번으로 이 제품은 끝난다.
      const simple = (user?.uiMode ?? "simple") === "simple";
      const body = fix.suggestsFlowUpdate
        ? `앱 코드가 아니라 검사 흐름을 고쳐야 하는 경우로 보입니다.\n\n${fix.explanation}\n\n` +
          `VibeSafe에서 흐름을 확인해주세요: /vibesafe/projects/${projectId}`
        : fix.prUrl
          ? (simple
              ? `"${incident.flowTitle}" 문제를 고칠 방법을 찾았습니다.\n\n` +
                `${fix.explanation}\n\n` +
                `지금 실제로 고쳐지는지 미리 확인하고 있습니다. 확인이 끝나면 알려드리겠습니다.\n` +
                `아직 회원님의 서비스는 아무것도 바뀌지 않았습니다.\n\n` +
                `VibeSafe에서 보기: /vibesafe/projects/${projectId}/incidents/${incident.id}`
              : `수정안을 만들어 PR로 올렸습니다 (위험도 ${fix.riskLevel.toUpperCase()}).\n\n` +
                `${fix.explanation}\n\n` +
                `바뀌는 파일: ${fix.changedFiles.join(", ")}\n` +
                `판정 근거: ${fix.riskReason}\n\n` +
                `프리뷰 배포에서 핵심 흐름을 다시 돌려본 뒤 적용 가능 여부를 알려드립니다.\n` +
                `${fix.prUrl}`)
          : `수정안을 만들지 못했습니다.\n\n${fix.explanation}`;

      await notify({
        userId,
        projectId,
        incidentId: incident.id,
        kind: "regression",
        title: fix.prUrl
          ? `[VibeSafe] ${incident.flowTitle} — 수정안을 준비했습니다`
          : `[VibeSafe] ${incident.flowTitle} — 자동 수정은 하지 못했습니다`,
        body,
        dedupeKey: `fix:${fix.proposalId}`,
        email: true,
        emailTo: user?.email ?? null,
      });
    } catch (error) {
      console.error("[vibesafe] propose fix failed:", (error as Error).message);
    }
  }

  if (permissions.rollback) {
    try {
      await rollbackToPreviousDeployment({
        userId,
        projectId,
        incidentId: incident.id,
        reason: `"${incident.flowTitle}" 기능이 깨져 자동으로 되돌렸습니다`,
        triggeredBy: "system",
      });
      const user = await prisma.vibesafeUser.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      await notify({
        userId,
        projectId,
        incidentId: incident.id,
        kind: "regression",
        title: `[VibeSafe] 배포를 이전 버전으로 되돌렸습니다`,
        body:
          `"${incident.flowTitle}" 기능이 깨져서 직전 정상 배포로 되돌렸습니다.\n\n` +
          `서비스는 지금 이전 버전으로 동작하고 있습니다. 원인을 고친 뒤 다시 배포해주세요.`,
        dedupeKey: `rollback:${incident.id}`,
        email: true,
        emailTo: user?.email ?? null,
      });
    } catch (error) {
      console.error("[vibesafe] rollback failed:", (error as Error).message);
    }
  }
}
