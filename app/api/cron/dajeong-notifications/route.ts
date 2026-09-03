import { NextResponse } from "next/server";
import { sweepDueNotifications } from "@/dajeong/lib/notification-sweep";

/**
 * Recomputes and dispatches every dajeong proactive notification that's currently due.
 * Same auth/deploy pattern as the rest of this repo's crons — see CRON.md before assuming an
 * interval from vercel.json alone. This route persists everything through notification-store.ts
 * (file-backed, .data/dajeong/notifications.json), so a server restart between two sweeps loses
 * nothing: scheduled rows are exactly where the last successful write left them, and
 * reconcileNotifications is idempotent, so re-running a sweep never double-sends.
 *
 * Production wiring intentionally NOT done here — this repo's own CRON.md process is: add an
 * external cron-job.org job hitting this path every 60s with CRON_SECRET, plus a daily backup
 * entry in vercel.json (sub-daily entries break Vercel Hobby deploys). See the final report for
 * the exact steps; wiring the actual external trigger requires deployment access this
 * environment doesn't have.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const isDeployed = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  if (isDeployed && !secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (secret) {
    const auth = request.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    const header = request.headers.get("x-cron-secret");
    if (bearer !== secret && header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const summary = await sweepDueNotifications();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[cron/dajeong-notifications]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cron failed" }, { status: 500 });
  }
}
