import { NextResponse } from "next/server";
import { addJobRecord, listJobs, upsertJobRecord } from "@/lib/jobs-db";
import { getSession } from "@/lib/session";
import { initialRequestStatusAfterIntake, normalizeRequestStatus } from "@/lib/booking-policy";
import { resolvePriorityFields } from "@/lib/service-priority";
import { normalizeJobPriority } from "@/lib/priority-display";
import type { JobCard } from "@/lib/types";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const start = url.searchParams.get("start")?.trim() || undefined;
  const end = url.searchParams.get("end")?.trim() || undefined;

  const jobs = await listJobs(session.sub, { start, end });
  const publicJobs: JobCard[] = jobs.map(({ userId: _u, ...job }) => job);
  return NextResponse.json({ jobs: publicJobs });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const existingId = String(body?.id ?? "").trim();

    if (existingId) {
      const pf = resolvePriorityFields({ priority: body.priority, ...body });
      const job: JobCard = {
        id: existingId,
        priority: pf.priority,
        servicePriority: pf.servicePriority,
        priorityReasons: pf.priorityReasons,
        prioritySource: pf.prioritySource,
        symptom: String(body.symptom ?? ""),
        customerName: String(body.customerName ?? ""),
        address: String(body.address ?? ""),
        arrivalWindow: String(body.arrivalWindow ?? ""),
        status: normalizeRequestStatus(body.status),
        jobberJobId: body.jobberJobId ? String(body.jobberJobId) : undefined,
        createdAt: body.createdAt ? String(body.createdAt) : new Date().toISOString(),
      };
      const saved = await upsertJobRecord(session.sub, job);
      const { userId: _u, ...publicJob } = saved;
      return NextResponse.json({ ok: true, job: publicJob });
    }

    const pf = resolvePriorityFields({ priority: body.priority, ...body });
    const saved = await addJobRecord(session.sub, {
      priority: pf.priority,
      servicePriority: pf.servicePriority,
      priorityReasons: pf.priorityReasons,
      prioritySource: pf.prioritySource,
      symptom: String(body.symptom ?? ""),
      customerName: String(body.customerName ?? ""),
      address: String(body.address ?? ""),
      arrivalWindow: String(body.arrivalWindow ?? ""),
      status: normalizeRequestStatus(body.status) ?? initialRequestStatusAfterIntake(),
      jobberJobId: body.jobberJobId ? String(body.jobberJobId) : undefined,
      sourceCallId: body.sourceCallId ? String(body.sourceCallId) : undefined,
    });

    const { userId: _u, ...publicJob } = saved;
    return NextResponse.json({ ok: true, job: publicJob });
  } catch (e) {
    console.error("[jobs POST]", e);
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json(
        { error: "Server storage not configured. Connect Vercel KV." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Failed to save job" }, { status: 500 });
  }
}
