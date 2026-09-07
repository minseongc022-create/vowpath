import { NextResponse } from "next/server";
import { clawOpsConfigured, clawOpsReservationProvider } from "@/dajeong/lib/clawops-provider";
import { reservationMetrics } from "@/dajeong/lib/reservation-metrics";
import { tickReservationQueue } from "@/dajeong/lib/reservation-queue";
import { extractReservationResult } from "@/dajeong/lib/reservation-result-extractor";
import { reservationPersistenceMode, reservationStateStore } from "@/dajeong/lib/reservation-store";
import { recordAllReservationSuccessAttributions } from "@/dajeong/lib/reservation-attribution";
import { deliverReservationNotifications } from "@/dajeong/lib/reservation-notifications";

function authorized(request: Request): boolean {
  if (process.env.NODE_ENV !== "production" && !process.env.HARUWITH_WORKER_TOKEN && !process.env.CRON_SECRET) return true;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? request.headers.get("x-cron-secret") ?? "";
  return Boolean(token && [process.env.HARUWITH_WORKER_TOKEN, process.env.CRON_SECRET].filter(Boolean).includes(token));
}

function capacity(): number {
  const parsed = Number(process.env.HARUWITH_RESERVATION_CONCURRENCY ?? "1");
  return Number.isFinite(parsed) ? Math.max(1, Math.min(50, Math.floor(parsed))) : 1;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!clawOpsConfigured()) return NextResponse.json({ error: "ClawOps 환경변수가 준비되지 않았어요.", configured: false }, { status: 503 });
  const tick = await tickReservationQueue(reservationStateStore, clawOpsReservationProvider, { capacity: capacity(), extractResult: extractReservationResult });
  const state = await reservationStateStore.read();
  await recordAllReservationSuccessAttributions(state);
  const notificationsDelivered = await deliverReservationNotifications(reservationStateStore);
  return NextResponse.json({ ok: true, tick, notificationsDelivered, capacity: capacity(), persistence: reservationPersistenceMode(), metrics: reservationMetrics(state) });
}

export async function GET(request: Request) {
  return POST(request);
}
