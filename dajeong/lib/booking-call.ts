import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { bookingCallVariables, type BookingCallContact } from "./booking-call-brief";
import type { DajeongPlan, ReservationTask } from "./types";

/**
 * 하루위드가 사용자를 대신해 가게에 실제로 전화를 거는 발신 모듈.
 *
 * 통화 자체는 Retell 음성 에이전트가 하고, 여기서는 "누구에게, 무슨 정보를 들고" 걸지를 넘긴다.
 * 에피로드(다른 제품)도 같은 Retell을 쓰지만 키·에이전트·번호를 공유하지 않는다 — 제품별로
 * 목소리도 대본도 요금도 다르고, 한쪽 설정이 다른 쪽 통화를 건드리면 안 되기 때문이다.
 */

export function bookingCallApiKey(): string | undefined {
  return process.env.DAJEONG_RETELL_API_KEY?.trim() || undefined;
}

export function bookingCallAgentId(): string | undefined {
  return process.env.DAJEONG_RETELL_BOOKING_AGENT_ID?.trim() || undefined;
}

/** 하루위드 이름으로 전화가 나가는 발신번호(E.164). Retell에 등록된 번호여야 한다. */
export function bookingCallFromNumber(): string | undefined {
  return process.env.DAJEONG_RETELL_FROM_NUMBER?.trim() || undefined;
}

/** 셋 중 하나라도 없으면 대신 걸어줄 수 없다 — "전화해줄게"라고 말해놓고 못 거는 일이 없어야 한다. */
export function bookingCallsConfigured(): boolean {
  return Boolean(bookingCallApiKey() && bookingCallAgentId() && bookingCallFromNumber());
}

/**
 * 한국 전화번호를 E.164로. "02-123-4567" → "+82212345678".
 * 변환에 실패하면 undefined를 돌려준다 — 이상한 번호로 아무 데나 전화가 걸리는 것보다
 * 안 거는 게 낫다.
 */
export function toE164Korea(raw: string): string | undefined {
  const digits = raw.replace(/[^0-9+]/g, "");
  if (digits.startsWith("+")) return /^\+\d{8,15}$/.test(digits) ? digits : undefined;
  const local = digits.replace(/^0+/, "");
  if (!/^\d{8,11}$/.test(local)) return undefined;
  return `+82${local}`;
}

/**
 * 통화 결과가 진짜 통화 서비스에서 온 것인지 확인한다. 이걸 안 하면 아무나 "예약 됐어요"라고
 * 우리 서버에 쏴서 가짜 예약 확정을 심을 수 있다 — 이 앱에서 가장 하면 안 되는 일이다.
 */
export function validateBookingCallSignature(request: Request, rawBody: string): boolean {
  const apiKey = bookingCallApiKey();
  if (!apiKey) return process.env.NODE_ENV !== "production";
  const signature = request.headers.get("x-retell-signature");
  if (!signature) return false;
  const expected = Buffer.from(createHmac("sha256", apiKey).update(rawBody).digest("hex"), "hex");
  const got = Buffer.from(signature, "hex");
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}

export type PlaceCallResult =
  | { ok: true; callId: string }
  | { ok: false; error: string };

/**
 * 실제로 전화를 건다. 성공하면 Retell 통화 id를 돌려주고, 이후 결과는 웹훅/툴 콜로 돌아온다.
 * 여기서 "예약됐다"고 판단하는 건 아무것도 없다 — 발신에 성공했다는 것뿐이다.
 */
export async function placeBookingCall(params: {
  task: ReservationTask;
  plan: DajeongPlan;
  contact: BookingCallContact;
  /** 통화 결과를 우리 쪽 기록과 연결하기 위한 값들. */
  metadata: { planId: string; taskId: string; ownerId: string; callRecordId: string };
}): Promise<PlaceCallResult> {
  const apiKey = bookingCallApiKey();
  const agentId = bookingCallAgentId();
  const fromNumber = bookingCallFromNumber();
  if (!apiKey || !agentId || !fromNumber) return { ok: false, error: "booking_calls_not_configured" };

  const toNumber = params.task.phoneNumber ? toE164Korea(params.task.phoneNumber) : undefined;
  if (!toNumber) return { ok: false, error: "invalid_phone_number" };

  try {
    const response = await fetch("https://api.retellai.com/v2/create-phone-call", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from_number: fromNumber,
        to_number: toNumber,
        override_agent_id: agentId,
        retell_llm_dynamic_variables: bookingCallVariables({ task: params.task, plan: params.plan, contact: params.contact }),
        metadata: params.metadata,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error("[dajeong booking-call] create-phone-call failed:", response.status, text);
      return { ok: false, error: `create_call_${response.status}` };
    }
    const data = JSON.parse(text) as { call_id?: string };
    const callId = data.call_id?.trim();
    if (!callId) return { ok: false, error: "missing_call_id" };
    return { ok: true, callId };
  } catch (error) {
    console.error("[dajeong booking-call] create-phone-call error:", error);
    return { ok: false, error: error instanceof Error ? error.message : "call_failed" };
  }
}
