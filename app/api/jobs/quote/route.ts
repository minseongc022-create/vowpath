import { NextResponse } from "next/server";
import { listJobs, patchJobRecord } from "@/lib/jobs-db";
import { listCallLogs } from "@/lib/call-logs";
import { findJobsToUpdateForBooking } from "@/lib/request-status-resolve";
import type { CallRecord } from "@/lib/operations-analytics";
import { getSession } from "@/lib/session";
import { verifySameOriginRequest } from "@/lib/security/request-guard";

/** Owner records a quote/estimate amount on a job — starts the unbooked-quote follow-up clock. */
export async function PATCH(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const bookingId = String(body?.id ?? "").trim();
    const amountCents = Number(body?.quotedAmountCents);

    if (!bookingId) {
      return NextResponse.json({ error: "Job id required" }, { status: 400 });
    }
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: "Enter a valid quote amount" }, { status: 400 });
    }

    const [jobs, callLogs] = await Promise.all([
      listJobs(session.sub),
      listCallLogs(session.sub),
    ]);
    const calls: CallRecord[] = callLogs.map((c) => ({
      id: c.id,
      from: c.from,
      createdAt: c.createdAt,
      jobberRequestId: c.jobberRequestId,
    }));
    const [job] = findJobsToUpdateForBooking(bookingId, jobs, calls);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const saved = await patchJobRecord(session.sub, job.id, {
      quotedAmountCents: Math.round(amountCents),
      quotedAt: new Date().toISOString(),
      quoteFollowUpSentAt: undefined,
    });

    if (!saved) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const { userId: _u, ...publicJob } = saved;
    return NextResponse.json({ ok: true, job: publicJob });
  } catch (e) {
    console.error("[jobs/quote PATCH]", e);
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json(
        { error: "Server storage not configured. Connect Vercel KV." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Failed to save quote" }, { status: 500 });
  }
}
