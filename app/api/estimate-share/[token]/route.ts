import { NextResponse } from "next/server";
import { getEstimateShare } from "@/lib/estimate-share-store";
import { listJobs } from "@/lib/jobs-db";
import { computeEstimateTotals } from "@/lib/estimate-document";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token: raw } = await context.params;
  const token = String(raw || "").trim();
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const share = await getEstimateShare(token);
  if (!share) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const jobs = await listJobs(share.userId);
  const job = jobs.find((j) => j.id === share.jobId);
  const estimate = job?.estimateDoc;
  if (!estimate || estimate.shareToken !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const totals = computeEstimateTotals(estimate);
  return NextResponse.json({
    ok: true,
    estimate,
    totals,
  });
}
