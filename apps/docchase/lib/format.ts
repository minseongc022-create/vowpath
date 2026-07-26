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

/** Short label clerks scan in a list */
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

/**
 * Real office flow: Alimtalk is sent to the client's mobile number.
 * Kakao delivers to the Kakao account linked to that phone.
 */
export function alimtalkPreview(
  office: string,
  client: ClientAccount | { name: string; contactName: string; docs: string[] },
  month: string,
) {
  const who = client.contactName?.trim() || "담당자";
  const shop = client.name;
  const list = client.docs.map((d) => `· ${d}`).join("\n");
  return `[${office}] ${month} 기장 자료 제출 안내

안녕하세요, ${shop} ${who}님.
저희 사무소 기장 마감을 위해 아래 자료 제출을 부탁드립니다.

${list}

이미 제출해 주셨다면 이 안내는 무시하셔도 됩니다.
문의는 이 알림에 회신하시거나 사무소로 연락 주세요.

${office}`;
}

export const CHANNEL_HELP =
  "문자는 카카오 알림톡으로 나갑니다. 거래처에 적어 둔 ‘휴대폰 번호’로 보내지며, 그 번호에 연결된 카카오톡으로 도착합니다. (개인 카톡·일반 문자가 아닙니다.)";
