import "server-only";

import { checkRateLimit, peekRateLimit, rateLimitKey } from "@/lib/security/rate-limit";

/**
 * 전화 예약 비용 안전장치.
 *
 * 통화 1건마다 실제 요금이 나간다 — 버그나 악용으로 무한정 걸리면 그대로 비용으로 이어진다.
 * 그래서 사람 단위, 계획 단위, 그리고 서비스 전체 단위로 하루 상한을 둔다. 개별 항목 재시도
 * 제한(booking-call-brief.ts의 callGateStatus)과는 다른 층이다 — 저건 "같은 곳에 계속 걸지
 * 마라", 이건 "하루에 너무 많이 걸지 마라".
 *
 * 기본값은 환경변수로 조정 가능하고, 안 정해도 합리적인 기본치로 동작한다.
 */

const DAY_SECONDS = 86_400;

function envLimit(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function bookingCallLimits() {
  return {
    personDaily: envLimit("DAJEONG_BOOKING_CALL_PERSON_DAILY_LIMIT", 10),
    planDaily: envLimit("DAJEONG_BOOKING_CALL_PLAN_DAILY_LIMIT", 6),
    // 서비스 전체 킬 스위치 — 개별 한도를 다 지켜도 뭔가 잘못돼 요청이 몰리면 여기서 멈춘다.
    globalDaily: envLimit("DAJEONG_BOOKING_CALL_GLOBAL_DAILY_LIMIT", 300),
  };
}

export type CallRateLimitResult = { ok: true } | { ok: false; error: string };

/**
 * 세 단계 다 먼저 조회만 해보고(peek — 아직 안 늘림), 전부 여유가 있을 때만 실제로 하나씩
 * 소비한다. 순서대로 그냥 checkRateLimit을 부르면, 뒤에서 막히는 케이스에서 앞 단계
 * 한도만 억울하게 깎인다.
 */
export async function checkBookingCallRateLimits(params: { personId: string; planId: string }): Promise<CallRateLimitResult> {
  const limits = bookingCallLimits();
  const keys = {
    person: rateLimitKey("dajeong-call:person", params.personId),
    plan: rateLimitKey("dajeong-call:plan", params.planId),
    global: rateLimitKey("dajeong-call:global", "all"),
  };

  const [person, plan, global] = await Promise.all([
    peekRateLimit({ key: keys.person, limit: limits.personDaily, windowSeconds: DAY_SECONDS }),
    peekRateLimit({ key: keys.plan, limit: limits.planDaily, windowSeconds: DAY_SECONDS }),
    peekRateLimit({ key: keys.global, limit: limits.globalDaily, windowSeconds: DAY_SECONDS }),
  ]);

  if (!global.ok) return { ok: false, error: "지금 전화 예약 요청이 많이 몰려서 잠시 후에 다시 해봐야 해." };
  if (!plan.ok) return { ok: false, error: "이 계획에서 오늘 대신 전화할 수 있는 횟수를 다 썼어. 내일 다시 해볼래?" };
  if (!person.ok) return { ok: false, error: "오늘 대신 전화할 수 있는 횟수를 다 썼어. 내일 다시 해볼래?" };

  await Promise.all([
    checkRateLimit({ key: keys.person, limit: limits.personDaily, windowSeconds: DAY_SECONDS }),
    checkRateLimit({ key: keys.plan, limit: limits.planDaily, windowSeconds: DAY_SECONDS }),
    checkRateLimit({ key: keys.global, limit: limits.globalDaily, windowSeconds: DAY_SECONDS }),
  ]);
  return { ok: true };
}
