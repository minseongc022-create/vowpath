import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { PERMISSION_LABELS, type PermissionKey } from "./permission-labels";

export { PERMISSION_LABELS };
export type { PermissionKey };

export type ProjectPermissions = {
  diagnose: boolean;
  proposePr: boolean;
  applyFix: boolean;
  rollback: boolean;
  rollbackDailyLimit: number;
  autoApplyLowRisk: boolean;
  autoApplyDailyLimit: number;
};

/**
 * 권한 사다리.
 *
 * ★ 왜 단계를 나누는가
 *
 * "AI가 알아서 고쳐준다"는 말은 듣기엔 좋지만, 사용자 입장에서는 **모르는
 * 도구에게 내 저장소와 배포를 맡기는 것**이다. 그걸 한 번의 체크박스로
 * 받으려 하면 아무도 안 켠다. 반대로 한 번 켜진 뒤 사고가 나면 그 사용자는
 * 영영 돌아오지 않는다.
 *
 * 그래서 단계로 쪼갠다. 각 단계는 그 앞 단계에서 쌓인 신뢰로 열린다 —
 * "3개월간 오탐 0건이었으니 PR 정도는 맡겨보자"가 자연스러운 순서다.
 *
 *   watch     감시           항상 켜짐. 읽기 + 브라우저 검사.
 *   diagnose  원인 분석      실패 시 커밋을 뒤져 원인 후보를 찾는다.
 *   proposePr 수정안 PR      브랜치를 만들고 PR을 연다.
 *   applyFix  적용하기       사람이 누른 그 PR 하나를 머지한다.
 *   rollback  배포 되돌리기  이전 배포로 되돌린다. 되돌릴 수 있는 행동.
 *
 * ★ 없는 단계: "코드를 main에 직접 push"
 *
 * 이건 일부러 안 만든다. applyFix가 생긴 뒤에도 그대로다 — 머지는
 *   (1) 검증을 통과한 제안에 대해서만,
 *   (2) 사람이 그 제안을 보고 버튼을 눌렀을 때만,
 *   (3) 한 번에 한 건만
 * 일어난다. AI가 "이게 맞는 것 같으니 올려야지" 하고 main을 건드리는 경로는
 * 코드에 존재하지 않는다. 되돌릴 수 없는 행동을 AI 판단만으로 실행하지
 * 않는다는 원칙이 이 제품 전체를 관통한다(flows/safety.ts의 blocked와 같다).
 *
 * 예외처럼 보이는 것 하나: autoApplyLowRisk.
 * 이것도 사람이 "LOW 위험은 물어보지 말고 적용해줘"라고 미리 누른 것이고,
 * LOW 판정은 AI가 아니라 repair/risk.ts의 규칙이 내린다. MEDIUM/HIGH는
 * 이 설정과 무관하게 자동 적용 경로가 없다.
 */

const DEFAULTS: ProjectPermissions = {
  diagnose: false,
  proposePr: false,
  applyFix: false,
  rollback: false,
  rollbackDailyLimit: 2,
  autoApplyLowRisk: false,
  autoApplyDailyLimit: 1,
};

export async function getPermissions(projectId: string): Promise<ProjectPermissions> {
  const row = await prisma.vibesafeProjectPermission.findUnique({ where: { projectId } });
  if (!row) return { ...DEFAULTS };
  return {
    diagnose: row.diagnose,
    proposePr: row.proposePr,
    applyFix: row.applyFix,
    rollback: row.rollback,
    rollbackDailyLimit: row.rollbackDailyLimit,
    autoApplyLowRisk: row.autoApplyLowRisk,
    autoApplyDailyLimit: row.autoApplyDailyLimit,
  };
}

export async function hasPermission(projectId: string, key: PermissionKey): Promise<boolean> {
  const permissions = await getPermissions(projectId);
  return permissions[key];
}

export class PermissionDeniedError extends Error {
  constructor(public readonly key: PermissionKey) {
    super(`"${PERMISSION_LABELS[key].title}" 권한이 켜져 있지 않습니다.`);
    this.name = "PermissionDeniedError";
  }
}

/**
 * 권한 거절인지 확인한다.
 *
 * `error instanceof PermissionDeniedError`를 그대로 쓰지 않는 이유: 이 모듈이
 * 서로 다른 지정자(`@/vibesafe/lib/permissions`와 `../permissions`)로 두 번
 * 읽히면 클래스 객체가 둘이 되어 instanceof가 false가 된다. Next 번들러는
 * 둘을 같은 모듈로 합치지만, 그 가정이 깨지는 순간 라우트가 깔끔한 403 대신
 * 500을 뱉는다 — 사용자에게는 "권한을 켜세요" 대신 "알 수 없는 오류"가 된다.
 * 실제로 이 제품의 검증 스크립트에서 그 상황이 재현됐다.
 */
export function isPermissionDenied(error: unknown): error is PermissionDeniedError {
  return (
    error instanceof PermissionDeniedError ||
    (error instanceof Error && error.name === "PermissionDeniedError")
  );
}

/** 권한 없이 행동하려는 모든 경로를 여기서 막는다. */
export async function requirePermission(projectId: string, key: PermissionKey): Promise<void> {
  if (!(await hasPermission(projectId, key))) throw new PermissionDeniedError(key);
}

/**
 * 권한 변경. 반드시 기록을 남긴다.
 *
 * 기록이 없으면 "VibeSafe가 언제부터 내 저장소에 PR을 올릴 수 있었지?"에
 * 답할 수 없고, 답할 수 없는 권한은 아무도 안 준다.
 */
export async function setPermission(params: {
  projectId: string;
  key: PermissionKey;
  enabled: boolean;
  actor: string;
}): Promise<ProjectPermissions> {
  const { projectId, key, enabled, actor } = params;

  const updated = await prisma.vibesafeProjectPermission.upsert({
    where: { projectId },
    create: { projectId, ...DEFAULTS, [key]: enabled },
    update: { [key]: enabled },
  });

  await logAction({
    projectId,
    action: enabled ? "permission_granted" : "permission_revoked",
    actor,
    summary: `${PERMISSION_LABELS[key].title} 권한을 ${enabled ? "켰습니다" : "껐습니다"}`,
    detail: { key },
  });

  // 상위 권한은 하위 권한 없이 의미가 없다 — 원인 분석을 끄면 그 위가 전부 꺼진다.
  if (!enabled && key === "diagnose" && (updated.proposePr || updated.applyFix || updated.rollback)) {
    await prisma.vibesafeProjectPermission.update({
      where: { projectId },
      data: { proposePr: false, applyFix: false, rollback: false, autoApplyLowRisk: false },
    });
    await logAction({
      projectId,
      action: "permission_revoked",
      actor: "system",
      summary: "원인 분석을 껐으므로 PR·적용·롤백 권한도 함께 껐습니다",
      detail: { cascade: true },
    });
  }

  // 적용은 PR 없이 존재할 수 없다 — 머지할 PR 자체가 없기 때문이다.
  if (!enabled && key === "proposePr" && updated.applyFix) {
    await prisma.vibesafeProjectPermission.update({
      where: { projectId },
      data: { applyFix: false, autoApplyLowRisk: false },
    });
    await logAction({
      projectId,
      action: "permission_revoked",
      actor: "system",
      summary: "수정안 PR을 껐으므로 적용 권한도 함께 껐습니다",
      detail: { cascade: true },
    });
  }

  // 적용 권한을 끄면 자동 적용도 의미가 없다.
  if (!enabled && key === "applyFix" && updated.autoApplyLowRisk) {
    await prisma.vibesafeProjectPermission.update({
      where: { projectId },
      data: { autoApplyLowRisk: false },
    });
  }

  return getPermissions(projectId);
}

export async function logAction(params: {
  projectId: string;
  action: string;
  actor?: string;
  summary: string;
  detail?: Prisma.InputJsonValue;
  incidentId?: string | null;
}): Promise<void> {
  try {
    await prisma.vibesafeActionLog.create({
      data: {
        projectId: params.projectId,
        action: params.action,
        actor: params.actor ?? "system",
        summary: params.summary,
        detail: params.detail ?? undefined,
        incidentId: params.incidentId ?? null,
      },
    });
  } catch (error) {
    // 기록 실패가 행동 자체를 막지는 않게 하되, 조용히 넘기지도 않는다.
    console.error("[vibesafe] action log failed:", (error as Error).message);
  }
}

export async function listActionLog(projectId: string, take = 50) {
  return prisma.vibesafeActionLog.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/**
 * 신뢰 점수 — "이 도구가 지금까지 얼마나 정확했나".
 *
 * 사용자가 오탐으로 표시한 비율을 그대로 보여준다. 이 숫자가 좋아야 다음
 * 권한을 열어줄 마음이 생기고, 나빠지면 우리가 흐름 품질을 고쳐야 한다는
 * 신호다. 어느 쪽이든 숨길 이유가 없다.
 */
export async function getTrustScore(projectId: string): Promise<{
  totalIncidents: number;
  confirmedReal: number;
  falseAlarms: number;
  unreviewed: number;
  accuracy: number | null;
}> {
  const [totalIncidents, verdicts] = await Promise.all([
    prisma.vibesafeIncident.count({ where: { projectId } }),
    prisma.vibesafeIncidentVerdict.groupBy({
      by: ["verdict"],
      where: { projectId },
      _count: { verdict: true },
    }),
  ]);

  const confirmedReal = verdicts.find((v) => v.verdict === "real")?._count.verdict ?? 0;
  const falseAlarms = verdicts.find((v) => v.verdict === "false_alarm")?._count.verdict ?? 0;
  const reviewed = confirmedReal + falseAlarms;

  return {
    totalIncidents,
    confirmedReal,
    falseAlarms,
    unreviewed: Math.max(0, totalIncidents - reviewed),
    accuracy: reviewed === 0 ? null : confirmedReal / reviewed,
  };
}

/**
 * 자동 적용 설정.
 *
 * 권한 사다리가 아니라 그 위에 얹는 **설정**이다. 그래도 기록은 똑같이
 * 남긴다 — "VibeSafe가 언제부터 내 확인 없이 코드를 적용할 수 있었지?"에
 * 답할 수 있어야 하는 건 다른 권한과 똑같기 때문이다.
 */
export async function setAutoApply(params: {
  projectId: string;
  enabled: boolean;
  actor: string;
}): Promise<ProjectPermissions> {
  const { projectId, enabled, actor } = params;
  const current = await getPermissions(projectId);

  // 적용 권한 없이 자동 적용만 켜는 경로를 만들지 않는다.
  if (enabled && !current.applyFix) {
    throw new PermissionDeniedError("applyFix");
  }

  await prisma.vibesafeProjectPermission.upsert({
    where: { projectId },
    create: { projectId, ...DEFAULTS, autoApplyLowRisk: enabled },
    update: { autoApplyLowRisk: enabled },
  });

  await logAction({
    projectId,
    action: enabled ? "permission_granted" : "permission_revoked",
    actor,
    summary: enabled
      ? "LOW 위험으로 분류된 수정은 확인 없이 적용하도록 켰습니다"
      : "LOW 위험 자동 적용을 껐습니다",
    detail: { key: "autoApplyLowRisk" },
  });

  return getPermissions(projectId);
}
