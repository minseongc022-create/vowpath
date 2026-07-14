import { NextResponse } from "next/server";
import { processExpiredTechOffersAll } from "@/lib/tech-dispatch/timeout";
import { processApptRemindersAll } from "@/lib/tech-dispatch/appointment-reminder";

// Schedule: see CRON.md (source of truth — NOT vercel.json alone).
// Production: cron-job.org hits this route every 60s (tech offer timeout + appt reminders).
// vercel.json lists 0 8 * * * as a daily backup only (Vercel Hobby blocks sub-daily crons).

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
    const [timeouts, reminders] = await Promise.all([
      processExpiredTechOffersAll(),
      processApptRemindersAll(),
    ]);
    return NextResponse.json({ ok: true, timeouts, reminders });
  } catch (e) {
    console.error("[cron/tech-dispatch]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 },
    );
  }
}
