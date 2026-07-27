import type { ChaseStatus, ClientAccount } from "./types";

export function statusClass(status: ChaseStatus): string {
  switch (status) {
    case "제출완료":
    case "해당없음":
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
    case "해당없음":
      return "이번 달 해당없음";
    case "지연":
      return "늦음 · 전화 필요";
    case "2차발송":
      return "두 번 보냄";
    case "1차발송":
      return "한 번 보냄";
    default:
      return "아직 안 보냄";
  }
}

export function sendStepLabel(status: ChaseStatus): string {
  if (status === "대기" || status === "제출완료" || status === "해당없음") return "1차 안내";
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
  replyUrl?: string,
) {
  const who = client.contactName?.trim() || "담당자";
  const shop = client.name;
  const list = client.docs.map((d) => `· ${d}`).join("\n");
  const linkBlock = submitUrl
    ? `\n자료 올리기: ${submitUrl}\n`
    : "\n자료는 사무소로 전달해 주세요.\n";
  const replyBlock = replyUrl
    ? `이미 냈거나 해당 없으면: ${replyUrl}\n`
    : "";
  return `[${office}] ${month} 기장 자료 제출 안내

안녕하세요, ${shop} ${who}님.
저희 사무소 기장 마감을 위해 아래 자료 제출을 부탁드립니다.

${list}
${linkBlock}${replyBlock}
문의는 사무소로 연락 주세요.

${office}`;
}

export const CHANNEL_HELP =
  "카카오 알림톡으로 나갑니다. 거래처 휴대폰 → 카톡. 링크 두 개: ①자료 올리기 ②이미냈어요/해당없음 원탭. 그래도 안 되면 ‘전화 잔여 큐’에만 남습니다.";

export const WEDGE_ONE_LINER =
  "클로브는 자동수집·기장 올인. 수임체크는 마감 독촉 OS — 알림톡 → 원탭 회신 → 남은 곳만 전화.";
