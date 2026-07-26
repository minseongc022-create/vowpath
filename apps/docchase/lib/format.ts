import type { ChaseStatus } from "./types";

export function statusClass(status: ChaseStatus): string {
  switch (status) {
    case "제출완료":
      return "bg-pine-100 text-pine-800";
    case "지연":
      return "bg-rose-soft text-rose-ink";
    case "2차발송":
      return "bg-amber-soft text-amber-ink";
    case "1차발송":
      return "bg-pine-50 text-pine-700";
    default:
      return "bg-paper text-ink-muted border border-paper-line";
  }
}

export function formatWhen(iso?: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function alimtalkPreview(office: string, client: string, docs: string[], month: string) {
  const list = docs.map((d) => `· ${d}`).join("\n");
  return `[${office}] ${month} 기장 자료 제출 안내

안녕하세요, ${client} 담당자님.
이번 달 마감을 위해 아래 자료 제출을 요청드립니다.

${list}

제출이 완료되면 이 알림은 더 이상 발송되지 않습니다.
문의: 사무소로 회신해 주세요.`;
}
