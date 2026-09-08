import { NextResponse } from "next/server";
import { z } from "zod";
import { clawOpsReadiness } from "@/dajeong/lib/clawops-config";
import {
  buildLiveTestReservation,
  LIVE_TEST_CONFIRMATION,
  LIVE_TEST_OWNER_ID,
  liveTestAccessToken,
  liveTestReadiness,
  maskKoreanPhone,
  secureOpsTokenEqual,
} from "@/dajeong/lib/reservation-live-test";
import { enqueueReservationBatch } from "@/dajeong/lib/reservation-queue";
import { reservationPersistenceMode, reservationStateStore } from "@/dajeong/lib/reservation-store";
import { checkRateLimit, clientIpFromRequest, rateLimitKey } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  confirmation: z.literal(LIVE_TEST_CONFIRMATION),
  reservationName: z.string().trim().min(2).max(40),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  partySize: z.number().int().min(1).max(8),
  requestKey: z.string().regex(/^live_test_[a-zA-Z0-9-]{12,120}$/),
});

function bearer(request: Request): string {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
}

function publicBatch<T extends { accessTokenHash: string }>(batch: T): Omit<T, "accessTokenHash"> {
  const { accessTokenHash: _, ...safe } = batch;
  return safe;
}

function validTestDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return false;
  const now = Date.now();
  return date.getTime() >= now - 24 * 60 * 60 * 1000 && date.getTime() <= now + 90 * 24 * 60 * 60 * 1000;
}

export async function POST(request: Request) {
  const opsToken = process.env.HARUWITH_OPS_TOKEN?.trim();
  if (!secureOpsTokenEqual(bearer(request), opsToken)) return NextResponse.json({ error: "운영자 인증값이 올바르지 않아요." }, { status: 401 });

  const limit = await checkRateLimit({ key: rateLimitKey("haruwith:live-test", clientIpFromRequest(request)), limit: 3, windowSeconds: 60 * 60 });
  if (!limit.ok) return NextResponse.json({ error: "안전을 위해 실전화 테스트는 한 시간에 최대 3번만 가능합니다." }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !validTestDate(parsed.data?.targetDate ?? "")) {
    return NextResponse.json({ error: "예약자명·날짜·시간과 실전화 확인 문구를 확인해 주세요." }, { status: 400 });
  }

  const readiness = liveTestReadiness();
  const clawops = clawOpsReadiness();
  const persistence = reservationPersistenceMode();
  if (!readiness.configured || !readiness.targetPhone) {
    return NextResponse.json({
      error: "실전화 테스트 환경변수가 준비되지 않았어요.",
      missing: readiness.missing,
      invalid: readiness.invalid,
    }, { status: 503 });
  }
  if (!clawops.configured || persistence !== "vercel_kv") {
    return NextResponse.json({
      error: "ClawOps 또는 영속 Queue가 준비되지 않아 전화를 시작하지 않았어요.",
      clawops,
      persistence,
    }, { status: 503 });
  }

  const state = await reservationStateStore.read();
  const active = Object.values(state.jobs).find((job) =>
    job.ownerId === LIVE_TEST_OWNER_ID
    && job.goal.venuePhone === readiness.targetPhone
    && ["queued", "calling", "awaiting_result", "retry_scheduled"].includes(job.status)
    && Date.now() - new Date(job.createdAt).getTime() < 30 * 60 * 1000,
  );
  if (active) {
    return NextResponse.json({ error: "이미 진행 중인 실전화 테스트가 있어요. 결과가 나온 뒤 다시 시도해 주세요." }, { status: 409 });
  }

  const accessToken = liveTestAccessToken(opsToken!, parsed.data.requestKey);
  const input = buildLiveTestReservation({
    targetPhone: readiness.targetPhone,
    reservationName: parsed.data.reservationName,
    targetDate: parsed.data.targetDate,
    time: parsed.data.time,
    partySize: parsed.data.partySize,
    requestKey: parsed.data.requestKey,
    accessToken,
  });
  const result = await enqueueReservationBatch(reservationStateStore, input);
  const refreshed = await reservationStateStore.read();
  const batch = refreshed.batches[result.batch.id] ?? result.batch;
  const jobs = batch.jobIds.map((id) => refreshed.jobs[id]).filter(Boolean).map((job) => ({
    ...job,
    contact: { ...job.contact, phone: maskKoreanPhone(job.contact.phone) },
    goal: { ...job.goal, venuePhone: maskKoreanPhone(job.goal.venuePhone) },
  }));

  return NextResponse.json({
    batch: publicBatch(batch),
    jobs,
    accessToken,
    created: result.created,
    targetPhone: maskKoreanPhone(readiness.targetPhone),
    message: "테스트 예약을 영속 Queue에 넣었어요. Render Worker가 최대 5초 안에 순서대로 시작합니다.",
  }, { status: result.created ? 201 : 200 });
}
