import type { ChaseStatus, ClientAccount } from "./types";

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

export function statusLabel(status: ChaseStatus): string {
  switch (status) {
    case "제출완료":
      return "자료 받음";
    case "지연":
      return "늦음 · 다시 필요";
    case "2차발송":
      return "두 번 보냄";
    case "1차발송":
      return "한 번 보냄";
    default:
      return "아직 안 보냄";
  }
}

export function sendStepLabel(status: ChaseStatus): string {
  if (status === "대기" || status === "제출완료") return "1차 안내";
  if (status === "1차발송") return "2차 독촉";
  return "지연 안내";
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

export function maskPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length < 8) return phone || "번호 없음";
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 5)}**-**${d.slice(9)}`;
  return phone;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`;
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}

export function alimtalkPreview(
  office: string,
  client: ClientAccount | { name: string; contactName: string; docs: string[] },
  month: string,
  submitUrl?: string,
) {
  const who = client.contactName?.trim() || "담당자";
  const shop = client.name;
  const list = client.docs.map((d) => `· ${d}`).join("\n");
  const linkBlock = submitUrl
    ? `\n아래 링크로 자료만 올려 주시면 됩니다.\n${submitUrl}\n`
    : "\n자료는 사무소로 전달해 주세요.\n";
  return `[${office}] ${month} 기장 자료 제출 안내

안녕하세요, ${shop} ${who}님.
저희 사무소 기장 마감을 위해 아래 자료 제출을 부탁드립니다.

${list}
${linkBlock}
이미 제출해 주셨다면 이 안내는 무시하셔도 됩니다.
문의는 사무소로 연락 주세요.

${office}`;
}

export const CHANNEL_HELP =
  "문자는 카카오 알림톡으로 나갑니다. 거래처 ‘휴대폰 번호’로 보내며, 그 번호에 연결된 카카오톡으로 도착합니다. 스탠다드 이상에서는 알림 안에 제출 링크가 붙어, 가게 사장이 앱 설치 없이 파일만 올리면 됩니다.";
