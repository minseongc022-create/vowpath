import type { RevenueFact } from "./revenue-facts";
import { formatRevenueUsd } from "./revenue-estimate";

export type RevenueMetrics = {
  periodLabel: string;
  jobberConnected: boolean;
  syncedAt: string | null;
  invoiceCount: number;
  attributedInvoiceCount: number;
  collectedCents: number;
  attributedCollectedCents: number;
  invoicedCents: number;
  outstandingCents: number;
  collectedLabel: string;
  attributedCollectedLabel: string;
  invoicedLabel: string;
  outstandingLabel: string;
};

function factInRange(fact: RevenueFact, start: Date, end: Date): boolean {
  const raw = fact.issuedDate ?? fact.updatedAt;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return true;
  return t >= start.getTime() && t <= end.getTime();
}

export function buildRevenueMetrics(params: {
  facts: RevenueFact[];
  start: Date;
  end: Date;
  syncedAt: string | null;
  jobberConnected: boolean;
}): RevenueMetrics {
  const { facts, start, end, syncedAt, jobberConnected } = params;
  const inRange = facts.filter((f) => factInRange(f, start, end));

  let collectedCents = 0;
  let attributedCollectedCents = 0;
  let invoicedCents = 0;
  let outstandingCents = 0;
  let attributedInvoiceCount = 0;

  for (const fact of inRange) {
    collectedCents += fact.collectedCents;
    invoicedCents += fact.invoicedCents;
    outstandingCents += fact.outstandingCents;
    if (fact.attributedToEffiroad) {
      attributedCollectedCents += fact.collectedCents;
      attributedInvoiceCount += 1;
    }
  }

  return {
    periodLabel: `${start.toLocaleDateString("en-US")} – ${end.toLocaleDateString("en-US")}`,
    jobberConnected,
    syncedAt,
    invoiceCount: inRange.length,
    attributedInvoiceCount,
    collectedCents,
    attributedCollectedCents,
    invoicedCents,
    outstandingCents,
    collectedLabel: formatRevenueUsd(collectedCents / 100),
    attributedCollectedLabel: formatRevenueUsd(attributedCollectedCents / 100),
    invoicedLabel: formatRevenueUsd(invoicedCents / 100),
    outstandingLabel: formatRevenueUsd(outstandingCents / 100),
  };
}

export function factsFromLedger(
  factsByInvoiceId: Record<string, RevenueFact> | undefined,
): RevenueFact[] {
  if (!factsByInvoiceId) return [];
  return Object.values(factsByInvoiceId);
}
