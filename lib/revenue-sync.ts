import { listCallLogs } from "./call-logs";
import { fetchJobberInvoicesInRange, fetchJobberRequestsInRange } from "./jobber-api";
import { getJobberTokens } from "./jobber-tokens";
import { listJobs } from "./jobs-db";
import {
  attributeInvoiceJobs,
  buildAttributionMaps,
} from "./revenue-attribution";
import {
  getRevenueLedger,
  ledgerCoversRange,
  ledgerIsStale,
  mergeRevenueFacts,
  saveRevenueLedger,
  type RevenueFact,
  type RevenueLedger,
} from "./revenue-facts";
import { listScheduledBookings } from "./schedule-bookings-db";

export type RevenueSyncResult = {
  ledger: RevenueLedger;
  factCount: number;
  skipped: boolean;
};

export async function syncRevenueLedgerForUser(
  userId: string,
  start: Date,
  end: Date,
  options?: { force?: boolean },
): Promise<RevenueSyncResult> {
  const tokens = await getJobberTokens(userId);
  if (!tokens) {
    throw new Error("JOBBER_NOT_CONNECTED");
  }

  const existing = await getRevenueLedger(userId);
  const force = options?.force === true;
  if (
    !force &&
    existing &&
    !ledgerIsStale(existing) &&
    ledgerCoversRange(existing, start, end)
  ) {
    return { ledger: existing, factCount: Object.keys(existing.factsByInvoiceId).length, skipped: true };
  }

  const syncStart = new Date(start);
  syncStart.setDate(syncStart.getDate() - 7);
  const syncEnd = new Date(end);

  const [invoices, jobberBookings, calls, jobs, scheduledBookings] = await Promise.all([
    fetchJobberInvoicesInRange(userId, syncStart, syncEnd),
    fetchJobberRequestsInRange(userId, syncStart, syncEnd),
    listCallLogs(userId),
    listJobs(userId),
    listScheduledBookings(userId),
  ]);

  const maps = buildAttributionMaps({
    calls,
    jobs,
    jobberBookings,
    scheduledBookings,
  });

  const facts: RevenueFact[] = invoices.map((inv) => attributeInvoiceJobs(inv, maps));

  const mergedFacts = mergeRevenueFacts(
    force ? {} : (existing?.factsByInvoiceId ?? {}),
    facts,
  );

  const ledger: RevenueLedger = {
    factsByInvoiceId: mergedFacts,
    syncedAt: new Date().toISOString(),
    rangeStart: syncStart.toISOString(),
    rangeEnd: syncEnd.toISOString(),
  };

  await saveRevenueLedger(userId, ledger);

  return {
    ledger,
    factCount: facts.length,
    skipped: false,
  };
}

export async function syncRevenueForAllJobberShops(): Promise<{
  synced: number;
  skipped: number;
  failed: number;
}> {
  const { listUsers } = await import("./users-db");
  const { getJobberTokens } = await import("./jobber-tokens");

  const users = await listUsers();
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  start.setHours(0, 0, 0, 0);

  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const tokens = await getJobberTokens(user.id);
    if (!tokens) continue;
    try {
      const result = await syncRevenueLedgerForUser(user.id, start, end);
      if (result.skipped) skipped += 1;
      else synced += 1;
    } catch (e) {
      failed += 1;
      console.warn("[revenue-sync] user", user.id, e);
    }
  }

  return { synced, skipped, failed };
}
