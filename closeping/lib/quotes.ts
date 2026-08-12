import { CHASE_INTERVALS_DAYS, type Quote, type QuoteStatus } from "./types";
import { chaseStageLabel, formatUsd } from "./format";

export {
  chaseStageLabel,
  formatUsd,
  normalizePhone,
  parseCsv,
  CHASE_INTERVALS_DAYS,
} from "./format";

export function deriveStatus(q: Quote): QuoteStatus {
  if (q.status === "won" || q.status === "lost") return q.status;
  if (!q.sentAt) return "draft";
  if (q.chaseSentAt.length > 0) return "chasing";
  return "sent";
}

export function nextChaseIndex(q: Quote): number | null {
  if (!q.sentAt || q.status === "won" || q.status === "lost") return null;
  if (q.chaseSentAt.length >= CHASE_INTERVALS_DAYS.length) return null;
  return q.chaseSentAt.length;
}

export function chaseDueAt(q: Quote, index: number): Date | null {
  if (!q.sentAt) return null;
  const days = CHASE_INTERVALS_DAYS[index];
  if (days == null) return null;
  const d = new Date(q.sentAt);
  d.setDate(d.getDate() + days);
  return d;
}

export function isChaseDue(q: Quote, now = Date.now()): boolean {
  const idx = nextChaseIndex(q);
  if (idx == null) return false;
  const due = chaseDueAt(q, idx);
  return Boolean(due && due.getTime() <= now);
}

export type Stats = {
  openCount: number;
  chasingCount: number;
  wonMonth: number;
  pipelineCents: number;
  recoveredCents: number;
};

export function computeStats(quotes: Quote[]): Stats {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const ms = monthStart.getTime();

  let openCount = 0;
  let chasingCount = 0;
  let wonMonth = 0;
  let pipelineCents = 0;
  let recoveredCents = 0;

  for (const q of quotes) {
    const st = deriveStatus(q);
    if (st === "draft" || st === "sent" || st === "chasing") {
      openCount += 1;
      pipelineCents += q.amountCents;
    }
    if (st === "sent" || st === "chasing") chasingCount += 1;
    if (st === "won" && q.sentAt && new Date(q.sentAt).getTime() >= ms) {
      wonMonth += 1;
      recoveredCents += q.amountCents;
    }
  }
  return { openCount, chasingCount, wonMonth, pipelineCents, recoveredCents };
}
