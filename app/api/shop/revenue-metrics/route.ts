import { NextResponse } from "next/server";
import { parseDateInput } from "@/lib/dashboard-analytics";
import { getJobberTokens } from "@/lib/jobber-tokens";
import { buildRevenueMetrics, factsFromLedger } from "@/lib/revenue-metrics";
import { getRevenueLedger } from "@/lib/revenue-facts";
import { syncRevenueLedgerForUser } from "@/lib/revenue-sync";
import { getSession } from "@/lib/session";
import { recordJobberSyncFailed } from "@/lib/record-tenant-events";

export const maxDuration = 30;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.sub;
  const tokens = await getJobberTokens(userId);
  if (!tokens) {
    return NextResponse.json({
      connected: false,
      metrics: null,
    });
  }

  const url = new URL(request.url);
  const startRaw = url.searchParams.get("start");
  const endRaw = url.searchParams.get("end");
  const force = url.searchParams.get("refresh") === "1";

  const end = parseDateInput(endRaw ?? "") ?? new Date();
  const endDay = new Date(end);
  endDay.setHours(23, 59, 59, 999);

  const defaultStart = new Date(endDay);
  defaultStart.setDate(defaultStart.getDate() - 29);
  defaultStart.setHours(0, 0, 0, 0);
  const start = parseDateInput(startRaw ?? "") ?? defaultStart;

  try {
    const sync = await syncRevenueLedgerForUser(userId, start, endDay, { force });
    const facts = factsFromLedger(sync.ledger.factsByInvoiceId);
    const metrics = buildRevenueMetrics({
      facts,
      start,
      end: endDay,
      syncedAt: sync.ledger.syncedAt,
      jobberConnected: true,
    });

    return NextResponse.json({
      connected: true,
      metrics,
      sync: {
        skipped: sync.skipped,
        factCount: sync.factCount,
        syncedAt: sync.ledger.syncedAt,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load revenue";
    if (message === "JOBBER_NOT_CONNECTED") {
      return NextResponse.json({ connected: false, metrics: null });
    }

    console.warn("[shop/revenue-metrics]", message);

    const cached = await getRevenueLedger(userId);
    if (cached) {
      const facts = factsFromLedger(cached.factsByInvoiceId);
      const metrics = buildRevenueMetrics({
        facts,
        start,
        end: endDay,
        syncedAt: cached.syncedAt,
        jobberConnected: true,
      });
      return NextResponse.json({
        connected: true,
        metrics,
        sync: { skipped: true, syncedAt: cached.syncedAt, stale: true },
        warning: "Showing cached Jobber data — live sync failed.",
      });
    }

    try {
      await recordJobberSyncFailed({ userId, message });
    } catch (logErr) {
      console.warn("[shop/revenue-metrics] tenant event", logErr);
    }

    return NextResponse.json(
      { connected: true, metrics: null, error: message },
      { status: 502 },
    );
  }
}
