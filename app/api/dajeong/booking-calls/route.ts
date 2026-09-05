import { NextResponse } from "next/server";
import { z } from "zod";
import { canCallForBooking, callPreviewScript, withinCallableHours } from "@/dajeong/lib/booking-call-brief";
import { bookingCallsConfigured, placeBookingCall, toE164Korea } from "@/dajeong/lib/booking-call";
import { activeCallForTask, createBookingCall, listBookingCallsForPlan, newBookingCallId, updateBookingCall } from "@/dajeong/lib/booking-call-store";
import { IDENTITY_MISMATCH_ERROR, verifyClaimedIdentity } from "@/dajeong/lib/identity-guard";
import { dajeongAiRateLimit } from "@/lib/security/ai-route-guard";
import type { BookingCallRecord, DajeongPlan } from "@/dajeong/lib/types";

/**
 * "하루위드가 대신 전화해서 예약해줘"를 실제로 실행하는 입구.
 *
 * 전화는 진짜 사람에게 걸린다. 그래서 여기서 막는 게 많다 — 사용자가 이 통화를 명시적으로
 * 승인했는지, 이름·번호를 알려줘도 된다고 했는지, 지금이 전화할 만한 시간인지, 같은 항목에
 * 이미 걸고 있는 전화가 없는지. 하나라도 아니면 걸지 않는다.
 */

const startSchema = z.object({
  personId: z.string().trim().min(1).max(80),
  plan: z.record(z.string(), z.unknown()),
  taskId: z.string().trim().min(1).max(200),
  /** 사용자가 이 통화를 분명히 승인했다는 표시. 버튼을 눌렀다는 사실만으로는 부족해 명시한다. */
  approveCall: z.literal(true),
  /** 가게에 알려줘도 된다고 승인한 정보만 넘어온다. */
  discloseName: z.string().trim().max(40).optional(),
  disclosePhone: z.string().trim().max(30).optional(),
});

export async function POST(request: Request) {
  const limited = await dajeongAiRateLimit(request);
  if (limited) return NextResponse.json(limited, { status: 429 });

  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "통화 요청 정보를 확인해줘." }, { status: 400 });
  if (!(await verifyClaimedIdentity(parsed.data.personId))) {
    return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });
  }

  if (!bookingCallsConfigured()) {
    return NextResponse.json({
      error: "지금은 대신 전화를 걸 수 없어. 기능이 아직 이 배포에 연결되지 않았어 — 가게가 예약을 안 받는다는 뜻은 아니야.",
    }, { status: 503 });
  }

  const plan = parsed.data.plan as DajeongPlan;
  if (plan.ownerId && plan.ownerId !== parsed.data.personId) {
    return NextResponse.json({ error: "이 계획의 예약을 대신 진행할 권한이 없어." }, { status: 403 });
  }

  const task = plan.execution?.tasks.find((entry) => entry.id === parsed.data.taskId);
  if (!task) return NextResponse.json({ error: "그 실행 항목을 찾지 못했어." }, { status: 404 });
  if (!canCallForBooking(task)) {
    return NextResponse.json({ error: "이 항목은 전화로 예약할 수 있는 상태가 아니야." }, { status: 409 });
  }

  const toNumber = task.phoneNumber ? toE164Korea(task.phoneNumber) : undefined;
  if (!toNumber) return NextResponse.json({ error: "가게 전화번호를 정확히 읽지 못해서 걸지 않았어." }, { status: 409 });

  const hours = withinCallableHours(new Date(), task.phoneHours);
  if (!hours.ok) return NextResponse.json({ error: hours.reason }, { status: 409 });

  const existing = await activeCallForTask(plan.id, task.id);
  if (existing) {
    return NextResponse.json({ error: "이 항목은 지금 통화 중이야. 끝나면 결과를 알려줄게.", call: existing }, { status: 409 });
  }

  const now = new Date().toISOString();
  const record: BookingCallRecord = {
    id: newBookingCallId(),
    planId: plan.id,
    taskId: task.id,
    ownerId: parsed.data.personId,
    toNumber,
    placeName: task.title,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };
  await createBookingCall(record);

  const contact = { name: parsed.data.discloseName, phone: parsed.data.disclosePhone };
  const placed = await placeBookingCall({
    task,
    plan,
    contact,
    metadata: { planId: plan.id, taskId: task.id, ownerId: parsed.data.personId, callRecordId: record.id },
  });

  if (!placed.ok) {
    const failed = await updateBookingCall(record.id, { status: "failed", failureReason: placed.error, endedAt: new Date().toISOString() });
    return NextResponse.json({
      error: "전화를 걸지 못했어. 잠시 후 다시 해보거나, 직접 전화할 수 있게 문구를 보여줄게.",
      call: failed ?? record,
    }, { status: 502 });
  }

  const started = await updateBookingCall(record.id, { providerCallId: placed.callId, status: "in_progress" });
  return NextResponse.json({
    call: started ?? record,
    spokenScript: callPreviewScript({ task, plan, contact }),
    message: `${task.title}에 지금 전화 걸고 있어. 통화 끝나면 결과 알려줄게.`,
  });
}

const listSchema = z.object({
  personId: z.string().trim().min(1).max(80),
  planId: z.string().trim().min(1).max(120),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = listSchema.safeParse({
    personId: url.searchParams.get("personId") ?? "",
    planId: url.searchParams.get("planId") ?? "",
  });
  if (!parsed.success) return NextResponse.json({ error: "조회 정보를 확인해줘." }, { status: 400 });
  if (!(await verifyClaimedIdentity(parsed.data.personId))) {
    return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });
  }
  const calls = await listBookingCallsForPlan(parsed.data.planId, parsed.data.personId);
  return NextResponse.json({ calls, configured: bookingCallsConfigured() });
}
