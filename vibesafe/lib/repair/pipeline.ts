import type { UiMode } from "../ui-mode";

/**
 * 수정 한 건이 지나가는 길.
 *
 *   DETECT → DIAGNOSE → REPAIR → VERIFY AGAIN → APPLY → WATCH
 *
 * ★ 이 파일이 존재하는 이유
 *
 * 상태 이름이 코드 곳곳에 문자열로 흩어지면, 어느 상태에서 어떤 버튼이
 * 보여야 하는지를 화면마다 다시 판단하게 된다. 그러면 "검증도 안 끝났는데
 * [적용하기]가 보이는" 화면이 반드시 하나 생긴다. 그 판단을 여기 한 곳에
 * 모은다.
 *
 * ★ applied ≠ 고쳐짐
 *
 * applied는 "머지됐다"이고, verified는 "머지된 코드가 실제 주소에서 다시
 * 되는 걸 눈으로 확인했다"이다. 사용자에게 "고쳤습니다"라고 말할 수 있는
 * 상태는 verified 하나뿐이다. 배포가 늦거나 실패했을 수도 있고, 고친 줄
 * 알았는데 아니었을 수도 있다. 그 사이를 "고쳤습니다"로 덮으면, 사용자는
 * 고쳐졌다고 믿고 자고 우리는 거짓말한 도구가 된다.
 */

export type RepairStatus =
  | "draft"
  | "proposed"
  | "opened"
  | "verifying"
  | "ready_to_apply"
  | "needs_human"
  | "applying"
  | "applied"
  | "verified"
  | "rejected"
  | "failed"
  | "superseded";

export const REPAIR_STATUSES: RepairStatus[] = [
  "draft",
  "proposed",
  "opened",
  "verifying",
  "ready_to_apply",
  "needs_human",
  "applying",
  "applied",
  "verified",
  "rejected",
  "failed",
  "superseded",
];

/**
 * 갈 수 있는 다음 상태.
 *
 * 허용 목록을 코드로 두는 이유: "검증 실패한 제안이 어쩌다 ready_to_apply가
 * 되어 적용 버튼이 살아나는" 버그를 데이터가 아니라 **구조**로 막기 위해서다.
 */
const TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  draft: ["proposed", "opened", "failed", "superseded"],
  proposed: ["opened", "rejected", "failed", "superseded"],
  opened: ["verifying", "ready_to_apply", "needs_human", "rejected", "failed", "superseded"],
  verifying: ["ready_to_apply", "needs_human", "rejected", "failed", "superseded"],
  ready_to_apply: ["applying", "verifying", "needs_human", "rejected", "superseded"],
  needs_human: ["verifying", "ready_to_apply", "rejected", "superseded"],
  applying: ["applied", "ready_to_apply", "failed"],
  applied: ["verified", "needs_human", "failed"],
  verified: [],
  rejected: [],
  failed: ["superseded"],
  superseded: [],
};

export function canTransition(from: string, to: RepairStatus): boolean {
  const allowed = TRANSITIONS[from as RepairStatus];
  return Array.isArray(allowed) && allowed.includes(to);
}

/** 더 이상 움직이지 않는 상태 — 새 시도는 새 제안으로 만든다. */
export function isTerminal(status: string): boolean {
  return status === "verified" || status === "rejected" || status === "superseded";
}

/** 사람이 [수정 적용하기]를 누를 수 있는가. 이 조건을 늘리지 말 것. */
export function canApply(params: {
  status: string;
  hasPermission: boolean;
  prNumber: number | null | undefined;
}): { allowed: boolean; reason: string } {
  if (!params.prNumber) {
    return { allowed: false, reason: "적용할 수정이 아직 올라가지 않았습니다." };
  }
  if (params.status !== "ready_to_apply") {
    return {
      allowed: false,
      reason:
        params.status === "verifying"
          ? "미리보기에서 확인하는 중입니다. 끝나면 적용할 수 있습니다."
          : params.status === "needs_human"
            ? "자동 검증을 통과하지 못했습니다. 내용을 직접 확인해주세요."
            : "지금은 적용할 수 있는 상태가 아닙니다.",
    };
  }
  if (!params.hasPermission) {
    return { allowed: false, reason: "'확인한 수정 적용하기' 권한이 꺼져 있습니다." };
  }
  return { allowed: true, reason: "" };
}

/**
 * 화면에 보여줄 한 줄.
 *
 * 간편 모드는 **무슨 일이 일어나고 있는지**를, 전문가 모드는 **어느 단계인지**를
 * 말한다. 둘 다 같은 상태를 가리키고, 둘 다 거짓이 아니다.
 */
export const REPAIR_STAGE_LABELS: Record<RepairStatus, Record<UiMode, string>> = {
  draft: { simple: "수정 방법을 찾는 중입니다", expert: "수정 생성 중" },
  proposed: { simple: "수정 방법을 찾았습니다", expert: "수정 생성됨 (미적용)" },
  opened: { simple: "수정을 준비했습니다", expert: "브랜치·PR 생성됨" },
  verifying: { simple: "미리 돌려보는 중입니다", expert: "프리뷰 검증 중" },
  ready_to_apply: { simple: "확인 끝났습니다. 적용할 수 있습니다", expert: "검증 통과 · 적용 대기" },
  needs_human: { simple: "직접 확인이 필요합니다", expert: "자동 검증 실패 · 사람 확인 필요" },
  applying: { simple: "적용하는 중입니다", expert: "머지 진행 중" },
  applied: { simple: "적용했습니다. 실제 서비스에서 확인하는 중입니다", expert: "머지됨 · 운영 검증 대기" },
  verified: { simple: "고쳤습니다. 실제 서비스에서 확인했습니다", expert: "운영 검증 통과" },
  rejected: { simple: "적용하지 않기로 했습니다", expert: "거절됨" },
  failed: { simple: "수정하지 못했습니다", expert: "실패" },
  superseded: { simple: "더 나은 수정으로 대체했습니다", expert: "다음 제안으로 대체됨" },
};

export function stageLabel(status: string, mode: UiMode): string {
  const entry = REPAIR_STAGE_LABELS[status as RepairStatus];
  return entry ? entry[mode] : status;
}

/**
 * 진행 막대에 쓰는 단계 번호(1~5). 실패·거절은 0 = 막대를 그리지 않는다.
 * 사람은 "몇 단계 중 몇 번째"를 보면 기다릴 수 있다.
 */
export const REPAIR_STEP_TITLES = ["원인 찾기", "수정 만들기", "미리 확인", "적용", "실서비스 확인"];

export function stepIndex(status: string): number {
  switch (status) {
    case "draft":
      return 1;
    case "proposed":
    case "opened":
      return 2;
    case "verifying":
    case "ready_to_apply":
    case "needs_human":
      return 3;
    case "applying":
    case "applied":
      return 4;
    case "verified":
      return 5;
    default:
      return 0;
  }
}
