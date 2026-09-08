import { createHmac, timingSafeEqual } from "node:crypto";
import { createDajeongPlan } from "./plan-engine";
import { prepareReservationOrder } from "./reservation-engine";
import type { DajeongPlan, PlanItem, ReservationOrder } from "./types";

export const LIVE_TEST_CONFIRMATION = "내 테스트 번호로 전화 1건 실행";
export const LIVE_TEST_OWNER_ID = "haruwith_operator_live_test";

export type LiveTestReadiness = {
  configured: boolean;
  enabled: boolean;
  targetPhone?: string;
  missing: Array<"HARUWITH_LIVE_TEST_ENABLED" | "HARUWITH_TEST_PHONE" | "HARUWITH_OPS_TOKEN">;
  invalid: string[];
};

function domesticKoreanPhone(value: string): string {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (/^0\d{8,10}$/.test(compact)) return compact;
  if (/^\+82\d{8,11}$/.test(compact)) return `0${compact.slice(3)}`;
  throw new Error("HARUWITH_TEST_PHONE_INVALID");
}

export function liveTestReadiness(env: NodeJS.ProcessEnv = process.env): LiveTestReadiness {
  const enabled = env.HARUWITH_LIVE_TEST_ENABLED?.trim().toLowerCase() === "true";
  const missing: LiveTestReadiness["missing"] = [];
  const invalid: string[] = [];
  if (!enabled) missing.push("HARUWITH_LIVE_TEST_ENABLED");
  if (!env.HARUWITH_TEST_PHONE?.trim()) missing.push("HARUWITH_TEST_PHONE");
  if (!env.HARUWITH_OPS_TOKEN?.trim()) missing.push("HARUWITH_OPS_TOKEN");
  let targetPhone: string | undefined;
  if (env.HARUWITH_TEST_PHONE?.trim()) {
    try { targetPhone = domesticKoreanPhone(env.HARUWITH_TEST_PHONE); }
    catch { invalid.push("HARUWITH_TEST_PHONE must be a Korean phone number"); }
  }
  if (targetPhone && env.CLAWOPS_FROM_NUMBER?.trim()) {
    try {
      if (targetPhone === domesticKoreanPhone(env.CLAWOPS_FROM_NUMBER)) invalid.push("HARUWITH_TEST_PHONE cannot equal CLAWOPS_FROM_NUMBER");
    } catch {
      // The general ClawOps readiness endpoint reports an invalid from number.
    }
  }
  return { configured: enabled && missing.length === 0 && invalid.length === 0, enabled, targetPhone, missing, invalid };
}

export function secureOpsTokenEqual(provided: string, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const left = Buffer.from(createHmac("sha256", expected).update(provided).digest("hex"));
  const right = Buffer.from(createHmac("sha256", expected).update(expected).digest("hex"));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function liveTestAccessToken(opsToken: string, requestKey: string): string {
  return createHmac("sha256", opsToken).update(`haruwith-live-test:${requestKey}`).digest("hex");
}

export function maskKoreanPhone(phone: string): string {
  return phone.replace(/(\d{3})\d+(\d{4})/, "$1****$2");
}

export function buildLiveTestReservation(input: {
  targetPhone: string;
  reservationName: string;
  targetDate: string;
  time: string;
  partySize: number;
  requestKey: string;
  accessToken: string;
  now?: Date;
}): { plan: DajeongPlan; order: ReservationOrder; ownerId: string; requestKey: string; accessToken: string; contact: { name: string; phone: string; approvedFields: Array<"name" | "phone">; approvedAt: string; purpose: string } } {
  const now = input.now ?? new Date();
  const suffix = createHmac("sha256", input.accessToken).update(input.requestKey).digest("hex").slice(0, 16);
  const base = createDajeongPlan({
    request: "운영자가 허용한 번호로 Haruwith 전화 예약 전체 경로를 검증합니다.",
    region: "테스트",
    targetDate: input.targetDate,
    budget: 100_000,
    partySize: input.partySize,
    requestKind: "reservation",
    planScope: "single",
    singleCategory: "meal",
    availabilityStartTime: input.time,
    preferences: ["전화 예약 기능 검증"],
  });
  const meal = base.items.find((item) => item.category === "meal") ?? base.items[0];
  const item: PlanItem = {
    ...meal,
    id: `live_test_item_${suffix}`,
    title: "Haruwith 테스트 식당",
    subtitle: "운영자 승인 실전화 테스트",
    time: input.time,
    durationMinutes: 90,
    reservationRequired: true,
    timeLocked: false,
    alternatives: [],
    reality: {
      ...(meal.reality ?? {
        source: "curated",
        sourceLabel: "Haruwith 운영 테스트",
        priceLabel: "테스트",
        priceConfidence: "unknown",
        openNow: null,
        openingHours: [],
        businessStatus: "unknown",
        checkedAt: now.toISOString(),
        freshness: "reference",
        imageKind: "reference",
        detailsUrl: "https://haruwith.com/dajeong",
        reservationState: "manual",
        reservationLabel: "AI 전화 테스트",
      }),
      phoneNumber: input.targetPhone,
      bookingMethod: "phone_only",
      reservationState: "manual",
      reservationLabel: "Haruwith 운영자 실전화 테스트",
      checkedAt: now.toISOString(),
    },
  };
  const plan: DajeongPlan = {
    ...base,
    id: `live_test_plan_${suffix}`,
    sourceRequest: "운영자 실전화 테스트",
    title: "Haruwith 실전화 테스트",
    summary: "허용된 테스트 번호로 Queue, ClawOps, callback과 구조화 결과를 검증합니다.",
    items: [item],
    subtotal: item.price,
    reserve: 0,
    total: item.price,
    budgetRemaining: Math.max(0, base.budget - item.price),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const order = prepareReservationOrder(plan, { targetItemIds: [item.id] });
  return {
    plan: { ...plan, execution: order },
    order,
    ownerId: LIVE_TEST_OWNER_ID,
    requestKey: input.requestKey,
    accessToken: input.accessToken,
    contact: {
      name: input.reservationName,
      phone: input.targetPhone,
      approvedFields: ["name", "phone"],
      approvedAt: now.toISOString(),
      purpose: "운영자가 명시적으로 승인한 Haruwith 실전화 예약 테스트",
    },
  };
}
