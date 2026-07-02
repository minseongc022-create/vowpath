import { NextResponse } from "next/server";
import { isEntitled } from "@/lib/billing";
import { listCallLogs } from "@/lib/call-logs";
import { listOperationFailures } from "@/lib/ops-failures";
import { alertOwner } from "@/lib/owner-alerts";
import { listUsers } from "@/lib/users-db";

function yesterdayUtcRange(): { start: string; end: string } {
  const now = new Date();
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return {
    start: new Date(startOfToday - 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(startOfToday - 1).toISOString(),
  };
}

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
    const { start, end } = yesterdayUtcRange();
    const users = await listUsers();

    let totalCalls = 0;
    let aiSuccessCalls = 0;
    let failureCount = 0;
    let activeShops = 0;

    for (const user of users) {
      if (isEntitled(user)) activeShops += 1;

      const calls = await listCallLogs(user.id, { start, end });
      totalCalls += calls.length;
      aiSuccessCalls += calls.filter((c) => c.verificationComplete).length;

      const failures = await listOperationFailures(user.id, 200);
      failureCount += failures.filter(
        (f) =>
          (f.category === "ai" || f.category === "intake") &&
          f.createdAt >= start &&
          f.createdAt <= end,
      ).length;
    }

    const successRate = totalCalls > 0 ? Math.round((aiSuccessCalls / totalCalls) * 100) : 100;
    // Revenue aggregation isn't wired to Paddle yet — always "N/A" for now.
    const revenue = "N/A";

    const summary =
      `📊 Daily Summary — Calls: ${totalCalls}, AI success: ${successRate}%, ` +
      `Failures: ${failureCount}, Active shops: ${activeShops}, Revenue: ${revenue}`;

    await alertOwner(summary);

    return NextResponse.json({
      ok: true,
      range: { start, end },
      totalCalls,
      aiSuccessCalls,
      successRate,
      failureCount,
      activeShops,
      revenue,
    });
  } catch (e) {
    console.error("[cron/daily-summary]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 },
    );
  }
}
