import { NextResponse } from "next/server";
import { processExpiredTechOffersAll } from "@/lib/tech-dispatch/timeout";

/**
 * Timeouts only (no appointment reminders). Schedule: see CRON.md.
 * Production: optional external target at 60s via cron-job.org; primary path is
 * /api/cron/tech-dispatch (same interval, includes reminders).
 * NOT listed in vercel.json — sub-daily Vercel crons block Hobby deploys.
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
    const timeouts = await processExpiredTechOffersAll();
    return NextResponse.json({ ok: true, timeouts });
  } catch (e) {
    console.error("[cron/tech-offer-escalation]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 },
    );
  }
}
