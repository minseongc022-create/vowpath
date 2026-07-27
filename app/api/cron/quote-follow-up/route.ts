import { NextResponse } from "next/server";
import { listJobs, patchJobRecord } from "@/lib/jobs-db";
import { listUsers } from "@/lib/users-db";
import { hasCustomerMarketingSmsConsent } from "@/lib/customer-marketing-consent";
import { notifyCustomerQuoteFollowUp } from "@/lib/customer-sms";
import {
  isChaseDue,
  nextChaseStageIndex,
  quoteAmountCents,
  quoteChaseSentStages,
} from "@/lib/quote-chase";

/** Daily: multi-stage chase SMS for quotes sent but not booked (48h, 7d, 14d). */
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
    const users = await listUsers();
    const now = Date.now();

    let checked = 0;
    let sent = 0;
    let skippedNoConsent = 0;
    let failed = 0;

    for (const user of users) {
      const jobs = await listJobs(user.id);
      const due = jobs.filter((j) => isChaseDue(j, now));
      checked += due.length;

      for (const job of due) {
        try {
          const stageIndex = nextChaseStageIndex(job);
          const amount = quoteAmountCents(job);
          if (stageIndex == null || !amount) continue;

          if (!(await hasCustomerMarketingSmsConsent(user.id, job.id))) {
            skippedNoConsent += 1;
            continue;
          }

          await notifyCustomerQuoteFollowUp({
            userId: user.id,
            bookingId: job.id,
            amountCents: amount,
            stage: stageIndex,
          });

          const sentAt = new Date().toISOString();
          const prev = quoteChaseSentStages(job);
          const nextChase = [...prev, sentAt];

          await patchJobRecord(user.id, job.id, {
            quoteChaseSentAt: nextChase,
            quoteFollowUpSentAt: job.quoteFollowUpSentAt ?? sentAt,
          });
          sent += 1;
        } catch (e) {
          console.error("[cron/quote-follow-up]", user.id, job.id, e);
          failed += 1;
        }
      }
    }

    return NextResponse.json({ ok: true, checked, sent, skippedNoConsent, failed });
  } catch (e) {
    console.error("[cron/quote-follow-up]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 },
    );
  }
}
