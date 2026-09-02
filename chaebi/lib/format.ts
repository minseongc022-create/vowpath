import type { ItemStatus, OccasionKind, PlanStatus } from "./types";

/** 42000 → "4만 2,000원". 큰 금액을 한눈에 읽히게. */
export function formatKrw(value: number): string {
  if (value === 0) return "무료";
  if (value < 10_000) return `${value.toLocaleString("ko-KR")}원`;
  const man = Math.floor(value / 10_000);
  const rest = value % 10_000;
  return rest === 0
    ? `${man.toLocaleString("ko-KR")}만원`
    : `${man.toLocaleString("ko-KR")}만 ${rest.toLocaleString("ko-KR")}원`;
}

/** 정확한 숫자가 필요할 때 (합계·결제) */
export function formatKrwExact(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

export const OCCASION_LABEL: Record<OccasionKind, string> = {
  birthday: "생일",
  anniversary: "기념일",
  proposal: "프로포즈",
  parents_day: "어버이날",
  date: "데이트",
  apology: "화해",
  congratulation: "축하",
  farewell: "송별",
  other: "준비",
};

export const OCCASION_EMOJI: Record<OccasionKind, string> = {
  birthday: "🎂",
  anniversary: "💗",
  proposal: "💍",
  parents_day: "🌷",
  date: "🌙",
  apology: "🕊",
  congratulation: "🎉",
  farewell: "🍀",
  other: "✨",
};

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  draft: "확인 대기",
  requested: "요청 보냄",
  pending: "확인 중",
  confirmed: "확정",
  in_transit: "배송 중",
  ready: "준비 완료",
  done: "완료",
  reassigned: "대안으로 교체",
  failed: "실패",
  skipped: "제외",
};

/** 상태별 색 계열 — UI 토큰 이름 (chaebi.css 참고) */
export const ITEM_STATUS_TONE: Record<ItemStatus, "idle" | "progress" | "good" | "warn" | "muted"> = {
  draft: "idle",
  requested: "progress",
  pending: "progress",
  confirmed: "good",
  in_transit: "progress",
  ready: "good",
  done: "good",
  reassigned: "warn",
  failed: "warn",
  skipped: "muted",
};

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  draft: "확인 대기",
  running: "처리 중",
  confirmed: "확정됨",
  completed: "완료",
  cancelled: "취소됨",
};

/** 진행률 0~1 */
export function planProgress(statuses: ItemStatus[]): number {
  const live = statuses.filter((status) => status !== "skipped");
  if (!live.length) return 0;
  const weight: Record<ItemStatus, number> = {
    draft: 0,
    requested: 0.25,
    pending: 0.45,
    reassigned: 0.6,
    confirmed: 0.75,
    in_transit: 0.85,
    ready: 0.9,
    done: 1,
    failed: 0.5,
    skipped: 0,
  };
  const sum = live.reduce((total, status) => total + weight[status], 0);
  return Math.min(1, sum / live.length);
}
