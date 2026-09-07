import { NextResponse } from "next/server";
import { canAccessBatch } from "@/dajeong/lib/reservation-queue";
import { reservationMetrics } from "@/dajeong/lib/reservation-metrics";
import { reservationStateStore } from "@/dajeong/lib/reservation-store";

function bearer(request: Request): string {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await reservationStateStore.read();
  const batch = state.batches[id];
  if (!batch) return NextResponse.json({ error: "예약 작업을 찾지 못했어요." }, { status: 404 });
  if (!canAccessBatch(batch, bearer(request))) return NextResponse.json({ error: "이 예약 작업을 볼 권한이 없어요." }, { status: 403 });
  const { accessTokenHash: _, ...safeBatch } = batch;
  const jobs = batch.jobIds.map((jobId) => state.jobs[jobId]).filter(Boolean).map((job) => ({ ...job, contact: { ...job.contact, phone: job.contact.phone.replace(/(\d{3})\d+(\d{4})/, "$1****$2") } }));
  const notifications = state.notifications.filter((notification) => notification.batchId === id);
  return NextResponse.json({ batch: safeBatch, jobs, notifications, queue: reservationMetrics(state) });
}
