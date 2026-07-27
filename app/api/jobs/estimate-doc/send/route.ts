import { NextResponse } from "next/server";
import { listJobs, patchJobRecord } from "@/lib/jobs-db";
import { listCallLogs } from "@/lib/call-logs";
import { findJobsToUpdateForBooking } from "@/lib/request-status-resolve";
import type { CallRecord } from "@/lib/operations-analytics";
import { getSession } from "@/lib/session";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import { computeEstimateTotals } from "@/lib/estimate-document";
import {
  getEstimateShare,
  newEstimateShareToken,
  saveEstimateShare,
} from "@/lib/estimate-share-store";
import { notifyCustomerEstimateDocument } from "@/lib/customer-sms";
import { SITE } from "@/lib/constants";

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { id?: string };
    const bookingId = String(body.id ?? "").trim();
    if (!bookingId) {
      return NextResponse.json({ error: "Job id required" }, { status: 400 });
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
    const job = findJobsToUpdateForBooking(bookingId, jobs, calls)[0];
    if (!job?.estimateDoc) {
      return NextResponse.json(
        { error: "Save the estimate with line items before sending." },
        { status: 400 },
      );
    }

    const estimate = { ...job.estimateDoc };
    if (estimate.lineItems.length === 0) {
      return NextResponse.json(
        { error: "Add at least one line item before sending." },
        { status: 400 },
      );
    }

    let token = estimate.shareToken?.trim();
    if (token) {
      const existing = await getEstimateShare(token);
      if (!existing || existing.jobId !== job.id) token = undefined;
    }
    if (!token) {
      token = newEstimateShareToken();
      await saveEstimateShare(token, {
        userId: session.sub,
        jobId: job.id,
        estimateId: estimate.id,
        createdAt: new Date().toISOString(),
      });
      estimate.shareToken = token;
    }

    const totals = computeEstimateTotals(estimate);
    const shareUrl = `${SITE.url}/e/${token}`;
    const sent = await notifyCustomerEstimateDocument({
      userId: session.sub,
      bookingId,
      phone: estimate.customerPhone,
      customerName: estimate.customerName,
      amountCents: totals.totalCents,
      estimateNumber: estimate.number,
      shareUrl,
    });
    if (!sent.ok) {
      return NextResponse.json(
        { error: sent.reason ?? "Could not text the customer." },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    estimate.status = "sent";
    estimate.sentAt = now;
    estimate.updatedAt = now;

    const saved = await patchJobRecord(session.sub, job.id, {
      estimateDoc: estimate,
      quotedAmountCents: totals.totalCents,
      quotedAt: now,
      quoteSentToCustomerAt: now,
      quoteFollowUpSentAt: undefined,
      quoteChaseSentAt: [],
      requestKind: "estimate",
    });

    return NextResponse.json({
      ok: true,
      estimate: saved?.estimateDoc,
      totals,
      shareUrl,
    });
  } catch (e) {
    console.error("[jobs/estimate-doc/send]", e);
    return NextResponse.json({ error: "Failed to send estimate" }, { status: 500 });
  }
}
