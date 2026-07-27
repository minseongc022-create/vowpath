import type { JobCard } from "./types";

/** Days after quote sent before each automated chase SMS (48h, 7d, 14d). */
export const QUOTE_CHASE_INTERVALS_DAYS = [2, 7, 14] as const;

export type QuotePipelineStage =
  | "lead"
  | "draft"
  | "ready"
  | "sent"
  | "chasing"
  | "booked"
  | "closed";

const CLOSED_STATUSES = new Set(["completed", "scheduled", "rejected"]);

export function isEstimateLead(job: JobCard): boolean {
  if (job.requestKind === "estimate") return true;
  if (job.estimateDoc) return true;
  if (job.quotedAmountCents) return true;
  return /estimate|quote/i.test(
    `${job.arrivalWindow ?? ""} ${job.symptom ?? ""}`,
  );
}

export function quoteSentAt(job: JobCard): string | undefined {
  return job.quoteSentToCustomerAt ?? job.estimateDoc?.sentAt;
}

export function quoteAmountCents(job: JobCard): number | null {
  if (job.quotedAmountCents && job.quotedAmountCents > 0) {
    return job.quotedAmountCents;
  }
  const doc = job.estimateDoc;
  if (doc?.lineItems?.length) {
    const sub = doc.lineItems.reduce((sum, line) => {
      const qty = Number.isFinite(line.qty) ? line.qty : 0;
      const price = Number.isFinite(line.unitPriceCents) ? line.unitPriceCents : 0;
      return sum + Math.round(qty * price);
    }, 0);
    const tax = Math.round(sub * ((doc.taxRatePercent ?? 0) / 100));
    return sub + tax;
  }
  return null;
}

export function quoteChaseSentStages(job: JobCard): string[] {
  if (job.quoteChaseSentAt?.length) return job.quoteChaseSentAt;
  if (job.quoteFollowUpSentAt) return [job.quoteFollowUpSentAt];
  return [];
}

export function quotePipelineStage(job: JobCard): QuotePipelineStage {
  if (CLOSED_STATUSES.has(job.status)) {
    return job.status === "scheduled" || job.status === "completed" ? "booked" : "closed";
  }

  const sent = quoteSentAt(job);
  const amount = quoteAmountCents(job);
  const chaseCount = quoteChaseSentStages(job).length;

  if (sent && amount) {
    if (chaseCount > 0) return "chasing";
    return "sent";
  }

  if (job.estimateDoc?.status === "draft" || (job.estimateDoc && !sent)) {
    return job.estimateDoc.lineItems.some((l) => l.unitPriceCents > 0) ? "ready" : "draft";
  }

  if (amount && !sent) return "ready";
  if (isEstimateLead(job)) return "lead";
  return "closed";
}

export function isOpenQuote(job: JobCard): boolean {
  const stage = quotePipelineStage(job);
  return stage === "lead" || stage === "draft" || stage === "ready";
}

export function isInChaseQueue(job: JobCard): boolean {
  const stage = quotePipelineStage(job);
  return stage === "sent" || stage === "chasing";
}

export function nextChaseStageIndex(job: JobCard): number | null {
  const sent = quoteSentAt(job);
  const amount = quoteAmountCents(job);
  if (!sent || !amount || CLOSED_STATUSES.has(job.status)) return null;

  const done = quoteChaseSentStages(job).length;
  if (done >= QUOTE_CHASE_INTERVALS_DAYS.length) return null;
  return done;
}

export function chaseDueAt(job: JobCard, stageIndex: number): Date | null {
  const sent = quoteSentAt(job);
  if (!sent) return null;
  const days = QUOTE_CHASE_INTERVALS_DAYS[stageIndex];
  if (days == null) return null;
  const due = new Date(sent);
  due.setDate(due.getDate() + days);
  return due;
}

export function isChaseDue(job: JobCard, now = Date.now()): boolean {
  const idx = nextChaseStageIndex(job);
  if (idx == null) return false;
  const due = chaseDueAt(job, idx);
  return Boolean(due && due.getTime() <= now);
}

export function formatQuoteAmount(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

export function chaseStageLabel(stageIndex: number): string {
  const days = QUOTE_CHASE_INTERVALS_DAYS[stageIndex];
  if (days === 2) return "48-hour nudge";
  if (days === 7) return "7-day check-in";
  if (days === 14) return "14-day last touch";
  return `Day ${days} follow-up`;
}
