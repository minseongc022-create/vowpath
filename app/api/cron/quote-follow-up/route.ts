import { NextResponse } from "next/server";
import { listJobs, patchJobRecord } from "@/lib/jobs-db";
import { listUsers } from "@/lib/users-db";
import { notifyCustomerQuoteFollowUp } from "@/lib/customer-sms";

const FOLLOW_UP_AFTER_DAYS = 3;

/** Daily: nudges customers who got a quote/estimate but haven't booked or completed N days later. */
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
    const cutoff = Date.now() - FOLLOW_UP_AFTER_DAYS * 24 * 60 * 60 * 1000;
    const users = await listUsers();

    let checked = 0;
    let sent = 0;
    let failed = 0;

    for (const user of users) {
      const jobs = await listJobs(user.id);
      const due = jobs.filter(
        (j) =>
          j.quotedAt &&
          j.quotedAmountCents &&
          !j.quoteFollowUpSentAt &&
          new Date(j.quotedAt).getTime() <= cutoff &&
          j.status !== "completed" &&
          j.status !== "scheduled",
      );
      checked += due.length;

      for (const job of due) {
        try {
          await notifyCustomerQuoteFollowUp({
            userId: user.id,
            bookingId: job.id,
            amountCents: job.quotedAmountCents!,
          });
          await patchJobRecord(user.id, job.id, {
            quoteFollowUpSentAt: new Date().toISOString(),
          });
          sent += 1;
        } catch (e) {
          console.error("[cron/quote-follow-up]", user.id, job.id, e);
          failed += 1;
        }
      }
    }

    return NextResponse.json({ ok: true, checked, sent, failed });
  } catch (e) {
    console.error("[cron/quote-follow-up]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 },
    );
  }
}
