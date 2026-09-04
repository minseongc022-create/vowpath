import { parseSituation } from "./situation";
import { appendPlanConversation, buildPlanLogistics, initializePlanVersion } from "./plan-engine";
import { buildExperienceFlow } from "./experience";
import { scheduleDajeongPlan } from "./schedule-engine";
import { estimatePlacePrice } from "./place-utils";
import type { DajeongPlan, PlanCategory, PlanItem, PlanRequest } from "./types";

/**
 * 사용자가 직접 고른 장소로 계획을 만든다.
 *
 * 자동 추천과 다른 점은 "무엇을 담을지"를 사람이 정한다는 것뿐이고, 만들어진 계획은 완전히
 * 같은 DajeongPlan이다 — 그래야 확정·예약·오늘 화면·공유가 갈라지지 않고 그대로 이어진다.
 */

export type ManualPick = {
  placeId: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  category: PlanCategory;
  /** 사용자가 정한 시작 시각 (HH:MM). */
  time: string;
  durationMinutes: number;
  price: number;
  mapsUrl: string;
  phoneNumber?: string;
  rating?: number;
  reviewCount?: number;
  sourceLabel?: string;
  memo?: string;
};

const CATEGORY_LABEL: Record<PlanCategory, string> = {
  activity: "경험",
  cafe: "카페",
  meal: "식사",
  view: "전망",
  lodging: "숙소",
  cake: "케이크",
  flower: "꽃",
  gift: "선물",
  moment: "준비",
};

function toMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
}

function manualItem(pick: ManualPick, index: number): PlanItem {
  const price = Math.max(0, Math.round(pick.price));
  const reservationRequired = ["meal", "lodging", "activity", "flower", "cake"].includes(pick.category);
  return {
    id: `manual-${index}-${pick.placeId}`.slice(0, 90),
    title: pick.name,
    subtitle: pick.memo?.trim() || `${CATEGORY_LABEL[pick.category]} · 직접 고른 장소`,
    price,
    durationMinutes: Math.max(15, Math.round(pick.durationMinutes)),
    provider: pick.sourceLabel ?? "직접 선택",
    handoffKind: reservationRequired ? "call" : "search",
    href: pick.mapsUrl,
    notes: [],
    location: pick.address,
    imageUrl: "",
    imageAlt: pick.name,
    reason: "직접 고른 장소야.",
    venueType: "mixed",
    reservationRequired,
    category: pick.category,
    categoryLabel: CATEGORY_LABEL[pick.category],
    icon: pick.category,
    time: pick.time,
    status: "proposed",
    dayNumber: 1,
    alternatives: [],
    // 사용자가 직접 정한 시간이다 — 스케줄러가 동선에 맞춰 임의로 당기거나 밀지 않는다.
    timeLocked: true,
    lockReason: "직접 정한 시간",
    reality: {
      // 직접 고른 장소도 출처는 실제 지도 데이터다 — 예약·확인 단계가 같은 근거를 쓴다.
      source: "kakao_local",
      sourceLabel: pick.sourceLabel ?? "직접 선택한 장소",
      placeId: pick.placeId,
      address: pick.address,
      latitude: pick.latitude,
      longitude: pick.longitude,
      rating: pick.rating,
      reviewCount: pick.reviewCount,
      priceLabel: price ? `예상 ${price.toLocaleString("ko-KR")}원` : "비용 미정",
      priceConfidence: price ? "estimated" : "unknown",
      openNow: null,
      openingHours: [],
      businessStatus: "operational",
      checkedAt: new Date().toISOString(),
      freshness: "recent",
      imageKind: "reference",
      detailsUrl: pick.mapsUrl,
      phoneNumber: pick.phoneNumber,
      reservationState: reservationRequired ? "manual" : "walk_in",
      reservationLabel: reservationRequired ? "예약 필요 — 확정 후 진행" : "예약 없이 방문 가능",
    },
  };
}

export function createManualDajeongPlan(input: PlanRequest & { picks: ManualPick[] }): DajeongPlan {
  const situation = parseSituation(input);
  const ordered = [...input.picks].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  const items = ordered.map(manualItem);
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const budget = input.budget && input.budget > 0 ? input.budget : Math.max(subtotal, 10_000);
  const reserve = Math.max(0, budget - subtotal);

  const plan: DajeongPlan = {
    id: `dj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    sourceRequest: input.request.trim() || "직접 만든 계획",
    situation,
    title: `직접 만든 ${situation.region} 계획`,
    summary: `직접 고른 ${items.length}곳을 시간 순서대로 담았어. 이동 시간과 완충 시간은 자동으로 맞췄어.`,
    items,
    subtotal,
    reserve,
    total: subtotal,
    budget,
    budgetRemaining: reserve,
    readiness: 88,
    status: "draft",
    notice: "네가 직접 고른 실제 장소로 짰어. 영업시간·가격·예약 가능 여부는 실행 직전에 다시 확인하며, 승인 없이 결제하지 않아.",
    revisions: [],
    logistics: buildPlanLogistics(situation),
    experienceFlow: buildExperienceFlow(items),
  };

  const scheduled = scheduleDajeongPlan(plan);
  const withConversation = appendPlanConversation(
    scheduled,
    input.request.trim() || "직접 계획을 만들었어",
    `직접 고른 ${items.length}곳으로 계획을 만들었어. 여기서도 말로 바꾸거나 예약 준비로 넘어갈 수 있어.`,
  );
  return initializePlanVersion(withConversation);
}

/** 카테고리별 기본 체류시간·예상 비용 — 사용자가 바꾸기 전 출발점. */
export function manualDefaults(category: PlanCategory): { durationMinutes: number; price: number } {
  const duration: Record<PlanCategory, number> = {
    activity: 90, cafe: 60, meal: 90, view: 45, lodging: 720, cake: 20, flower: 20, gift: 30, moment: 20,
  };
  return { durationMinutes: duration[category], price: estimatePlacePrice(category, undefined, 30_000) };
}
