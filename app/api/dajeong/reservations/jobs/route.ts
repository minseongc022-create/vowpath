import { NextResponse } from "next/server";
import { z } from "zod";
import { clawOpsConfigured, clawOpsReservationProvider } from "@/dajeong/lib/clawops-provider";
import { enqueueReservationBatch, tickReservationQueue } from "@/dajeong/lib/reservation-queue";
import { extractReservationResult } from "@/dajeong/lib/reservation-result-extractor";
import { recordReservationAttemptAttribution } from "@/dajeong/lib/reservation-attribution";
import { reservationPersistenceMode, reservationStateStore } from "@/dajeong/lib/reservation-store";
import type { DajeongPlan, ReservationOrder } from "@/dajeong/lib/types";
import { checkRateLimit, clientIpFromRequest, rateLimitKey } from "@/lib/security/rate-limit";

const schema = z.object({
  plan: z.object({
    id: z.string().min(4).max(180),
    situation: z.object({ targetDate: z.string().min(8).max(20), partySize: z.number().int().min(1).max(30) }).passthrough(),
    items: z.array(z.object({ id: z.string().min(1).max(180), title: z.string().min(1).max(160), time: z.string().regex(/^\d{2}:\d{2}$/), reality: z.object({ phoneNumber: z.string().regex(/^(?:\+82|0)[0-9 -]{8,15}$/).optional() }).passthrough().optional() }).passthrough()).min(1).max(100),
  }).passthrough(),
  order: z.object({
    id: z.string().min(4).max(180),
    planId: z.string().min(4).max(180),
    tasks: z.array(z.object({ id: z.string().min(1).max(180), itemId: z.string().min(1).max(180), title: z.string().min(1).max(160), time: z.string().regex(/^\d{2}:\d{2}$/), kind: z.string(), phoneNumber: z.string().regex(/^(?:\+82|0)[0-9 -]{8,15}$/).optional() }).passthrough()).min(1).max(100),
  }).passthrough(),
  ownerId: z.string().trim().min(4).max(120),
  accessToken: z.string().min(32).max(200),
  requestKey: z.string().min(12).max(200),
  contact: z.object({
    name: z.string().trim().min(2).max(40),
    phone: z.string().trim().regex(/^0\d{8,10}$/),
    approvedFields: z.array(z.enum(["name", "phone"])).min(2).max(2),
    approvedAt: z.string().datetime(),
    purpose: z.string().min(5).max(160),
  }),
  attributionTokens: z.array(z.string().min(20).max(500)).max(10).optional(),
});

function capacity(): number {
  const parsed = Number(process.env.HARUWITH_RESERVATION_CONCURRENCY ?? "1");
  return Number.isFinite(parsed) ? Math.max(1, Math.min(50, Math.floor(parsed))) : 1;
}

function publicBatch(batch: Awaited<ReturnType<typeof enqueueReservationBatch>>["batch"]) {
  const { accessTokenHash: _, ...safe } = batch;
  return safe;
}

export async function POST(request: Request) {
  const expectedOrigin = process.env.HARUWITH_PUBLIC_BASE_URL?.trim() || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  const origin = request.headers.get("origin");
  if (process.env.NODE_ENV === "production" && expectedOrigin && origin && new URL(expectedOrigin).origin !== origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const limit = await checkRateLimit({ key: rateLimitKey("haruwith:reservation", clientIpFromRequest(request)), limit: 10, windowSeconds: 60 * 60 });
  if (!limit.ok) return NextResponse.json({ error: "예약 요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "예약자 이름·전화번호와 개인정보 전달 동의를 확인해 주세요." }, { status: 400 });
  try {
    if (process.env.NODE_ENV === "production" && reservationPersistenceMode() !== "vercel_kv") return NextResponse.json({ error: "영속 예약 저장소가 설정되지 않아 실제 전화를 안전하게 시작할 수 없어요." }, { status: 503 });
    const result = await enqueueReservationBatch(reservationStateStore, {
      ...parsed.data,
      plan: parsed.data.plan as DajeongPlan,
      order: parsed.data.order as ReservationOrder,
    });
    if (result.created) await recordReservationAttemptAttribution(result.batch);
    if (clawOpsConfigured()) {
      await tickReservationQueue(reservationStateStore, clawOpsReservationProvider, { capacity: capacity(), extractResult: extractReservationResult });
    }
    const state = await reservationStateStore.read();
    const batch = state.batches[result.batch.id] ?? result.batch;
    const jobs = batch.jobIds.map((id) => state.jobs[id]).filter(Boolean).map((job) => ({ ...job, contact: { ...job.contact, phone: job.contact.phone.replace(/(\d{3})\d+(\d{4})/, "$1****$2") } }));
    return NextResponse.json({ batch: publicBatch(batch), jobs, created: result.created, providerConfigured: clawOpsConfigured(), persistence: reservationPersistenceMode() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "예약 대기열을 만들지 못했어요.";
    if (message === "NO_PHONE_RESERVATIONS") return NextResponse.json({ error: "전화번호가 확인된 식당 예약 항목이 없어요. 장소 전화번호를 먼저 확인해 주세요." }, { status: 409 });
    if (["INVALID_RESERVATION_INPUT", "INVALID_RESERVATION_CONTACT", "RESERVATION_TASK_PLAN_MISMATCH"].includes(message)) return NextResponse.json({ error: "계획과 예약 항목이 일치하지 않아 전화를 시작하지 않았어요. 계획을 다시 불러와 주세요." }, { status: 409 });
    return NextResponse.json({ error: "예약 대기열을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
