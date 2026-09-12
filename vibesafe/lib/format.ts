/** 화면에 쓰는 시간·숫자 표기. 서버와 클라이언트가 같은 문자열을 만들어야 한다. */

export function relativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const target = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - target.getTime();
  if (!Number.isFinite(diffMs)) return "—";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
}

export function absoluteTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const target = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(target.getTime())) return "—";
  // 서버(UTC)와 브라우저(로컬)가 다른 문자열을 만들면 hydration 경고가 난다.
  // 한국 사용자 대상이라 KST로 고정한다.
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(target);
}

export function duration(ms: number | null | undefined): string {
  if (!ms || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}초`;
  return `${Math.floor(ms / 60_000)}분 ${Math.round((ms % 60_000) / 1000)}초`;
}

export const TRIGGER_LABELS: Record<string, string> = {
  manual: "직접 실행",
  github: "코드 변경",
  schedule: "정기 확인",
};

export const CATEGORY_LABELS: Record<string, string> = {
  auth: "로그인·가입",
  browse: "둘러보기",
  search: "검색",
  create: "작성·등록",
  admin: "관리자",
  checkout: "결제",
  other: "기타",
};
