import { NextResponse } from "next/server";
import { getShopBookingSettings } from "@/lib/shop-settings-db";
import { getShopProfile } from "@/lib/shop-profile-db";
import { getSession } from "@/lib/session";
import { listWorkflowRules } from "@/lib/workflow-rules/store";
import { simulateWorkflowBatch } from "@/lib/workflow-rules/simulate";
import { buildAllRecentBookings } from "@/lib/recent-bookings";
import { listCallLogs } from "@/lib/call-logs";
import { listJobs } from "@/lib/jobs-db";
import { getBookingRequestStatuses } from "@/lib/booking-status";
import { fetchJobberRequestsInRange } from "@/lib/jobber-api";
import { getJobberTokens } from "@/lib/jobber-tokens";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const ruleId = typeof body?.ruleId === "string" ? body.ruleId : null;
    const days = typeof body?.days === "number" ? Math.min(body.days, 90) : 30;

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const [rules, calls, jobs, statuses, tokens, settings, profile] = await Promise.all([
      listWorkflowRules(session.sub),
      listCallLogs(session.sub, {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      }),
      listJobs(session.sub, {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      }),
      getBookingRequestStatuses(session.sub),
      getJobberTokens(session.sub),
      getShopBookingSettings(session.sub),
      getShopProfile(session.sub),
    ]);

    const jobberBookings = tokens
      ? await fetchJobberRequestsInRange(session.sub, start, end).catch(() => [])
      : [];

    const activeRules = ruleId ? rules.filter((r) => r.id === ruleId && r.enabled) : rules.filter((r) => r.enabled);
    const bookings = buildAllRecentBookings(jobs, jobberBookings, calls, statuses);

    const results = simulateWorkflowBatch({
      rules: activeRules,
      bookings,
      bookingSettings: settings,
      vertical: profile.vertical ?? "restoration",
      limit: 40,
    }).filter((r) => r.matchedRules.length > 0);

    return NextResponse.json({
      ok: true,
      simulated: results.length,
      results,
    });
  } catch (e) {
    console.error("[workflow-rules/simulate]", e);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
