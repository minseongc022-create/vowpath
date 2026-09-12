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
      await proposeFix({ userId, projectId, diagnosisId });
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
