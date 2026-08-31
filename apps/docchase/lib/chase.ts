import type { ClientAccount, ChaseStatus } from "./types";
import { isDoneStatus } from "./types";

/** Days until monthly deadline (same-month heuristic). */
export function daysToDeadline(deadlineDay: number, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  const day = Math.min(deadlineDay, last);
  const due = new Date(y, m, day, 23, 59, 59);
  const ms = due.getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function urgencyLabel(c: ClientAccount) {
  if (isDoneStatus(c.status)) return { label: "완료", score: 0, tone: "done" as const };
  const d = daysToDeadline(c.deadlineDay);
  if (c.status === "지연" || d < 0) return { label: "마감 지남", score: 100, tone: "hot" as const };
  if (d <= 1) return { label: "D-1", score: 90, tone: "hot" as const };
  if (d <= 3) return { label: `D-${d}`, score: 70, tone: "warn" as const };
  if (d <= 7) return { label: `D-${d}`, score: 50, tone: "mid" as const };
  return { label: `D-${d}`, score: 20, tone: "cool" as const };
}

/**
 * Wedge: after Alimtalk stages, residual becomes phone work —
 * Clobe doesn't own this "chase → call leftover" loop.
 */
export function shouldEnterCallQueue(c: ClientAccount, now = new Date()) {
  if (isDoneStatus(c.status)) return false;
  if (c.inCallQueue) return true;
  if (c.status === "지연") return true;
  if (c.status === "2차발송" && c.lastSentAt) {
    const hours = (now.getTime() - new Date(c.lastSentAt).getTime()) / 36e5;
    return hours >= 48;
  }
  return false;
}

export function callScript(office: string, c: ClientAccount, month: string) {
  return `안녕하세요, ${c.contactName || "담당자"}님. ${office}입니다. ${month} 기장 자료 중 ${c.docs.join(", ")}이(가) 아직 안 들어와 연락드렸습니다. 제출 링크는 카톡으로 다시 보내 드릴 수도 있습니다.`;
}

export function buildCallQueue(clients: ClientAccount[]) {
  return clients
    .filter((c) => shouldEnterCallQueue(c))
    .sort((a, b) => urgencyLabel(b).score - urgencyLabel(a).score);
}

export function statusAfterClientReply(
  reply: "이미냈어요" | "해당없음",
): ChaseStatus {
  return reply === "해당없음" ? "해당없음" : "제출완료";
}
