/**
 * 무료 베타의 평생 1회 자동 수정(PR 생성) 크레딧 — 새로 시작해도 되는가.
 *
 * ★ 이 판단을 한 곳에 모아둔 이유
 *
 * 같은 판단을 repair/view.ts(화면에 무엇을 보여줄지)와
 * repair/propose-fix.ts(실제로 막을지) 두 곳에서 내려야 한다. 각자 조건을
 * 따로 적으면 나중에 규칙이 바뀔 때 한쪽만 고치는 실수가 난다 — 이
 * 프로젝트에서 orderId 계산과 past_due dunning 재시도 둘 다 똑같은
 * "같은 판단이 두 곳에 따로 있다 한쪽만 고쳐졌다" 패턴으로 실제 버그가
 * 났다. 순수 함수 하나로 모아 두 곳이 반드시 같은 답을 보게 한다.
 *
 * ★ "같은 사고를 계속 재시도하는 것"은 막지 않는다
 *
 * 크레딧은 실제로 PR이 열렸을 때(propose-fix.ts) 그 사고의 id와 함께
 * 소진 처리된다. 그 사고에서 다시 시도하는 것("다른 방법으로 다시
 * 시도")까지 막으면, 첫 시도가 틀렸다는 이유로 사용자의 유일한 무료
 * 체험이 통째로 날아간다 — 그건 이 기능의 의도가 아니다. 크레딧을 이미
 * 쓴 사고와 **다른** 사고를 새로 시작하려 할 때만 막는다.
 */
export function canStartFreeRepair(
  user: {
    planKey: string;
    freeRepairUsedAt: Date | null;
    freeRepairIncidentId: string | null;
  } | null,
  incidentId: string | null,
): { blocked: boolean } {
  if (!user || user.planKey === "pro") return { blocked: false };
  if (!user.freeRepairUsedAt) return { blocked: false };

  const continuingCreditedIncident = incidentId != null && incidentId === user.freeRepairIncidentId;
  return { blocked: !continuingCreditedIncident };
}

/** 화면·API 양쪽에서 그대로 쓰는 안내 문구. */
export const FREE_REPAIR_USED_MESSAGE =
  "무료 베타의 자동 수정 체험(PR 생성)을 이미 사용하셨습니다. 원인 분석은 계속 무제한으로 보실 수 있고, 그걸 보고 직접 고치셔도 됩니다. 저희가 계속 자동으로 고쳐드리는 건 Pro 플랜에서 무제한입니다.";
