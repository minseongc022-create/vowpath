import { appendPlanConversation } from "./plan-engine";
import type { DajeongPlan, DiscoveryBooking, DiscoveryItem } from "./types";

export type DiscoveryBookingResult = { handled: boolean; plan: DajeongPlan; message: string; bookingIds: string[] };

function bookingId(): string {
  return `discovery_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function compact(text: string): string {
  return text.replace(/\s+/g, "");
}

function findDiscoveryItem(plan: DajeongPlan, text: string): DiscoveryItem | undefined {
  const events = plan.discoveredEvents ?? [];
  const target = compact(text);
  return events.find((item) => target.includes(compact(item.title)));
}

function findBooking(plan: DajeongPlan, text: string): DiscoveryBooking | undefined {
  const bookings = (plan.discoveryBookings ?? []).filter((booking) => booking.status !== "cancelled");
  const target = compact(text);
  return bookings.find((booking) => target.includes(compact(booking.title)));
}

function upsertBookings(plan: DajeongPlan, next: DiscoveryBooking[]): DajeongPlan {
  return { ...plan, discoveryBookings: next };
}

const INTEREST_PATTERN = /넣어\s*줘|넣을래|추가해\s*줘|가볼래|가고\s*싶어|예약해\s*줘|예약하고\s*싶어|확인해\s*줘|일정에\s*넣/;
const CANCEL_PATTERN = /빼\s*줘|빼자|취소해|안\s*갈래|그냥\s*둘게/;

/**
 * 발견(discovery) 항목("코스에 넣어볼까?")에 대한 사용자 반응을 처리한다.
 *
 * DiscoveryItem은 전화번호도 예약 URL도 없다 — 기관·블로그 데이터일 뿐 실제 예약 채널이
 * 아니라서다. 그래서 "넣어줘"라고 해도 일정에 자동으로 끼워 넣거나 가짜로 예약 완료 처리하지
 * 않는다 — 대신 예약(실행) 목록에 "확인·예약 필요" 항목으로 올려서, 기존 reservation-engine이
 * 전화 스크립트나 외부 링크 안내와 똑같은 방식으로 다루게 한다.
 */
export function applyDiscoveryInstruction(plan: DajeongPlan, instructionRaw: string): DiscoveryBookingResult {
  const instruction = instructionRaw.trim();
  if (!(plan.discoveredEvents?.length || plan.discoveryBookings?.length)) return { handled: false, plan, message: "", bookingIds: [] };

  if (CANCEL_PATTERN.test(instruction)) {
    const target = findBooking(plan, instruction);
    if (target) {
      const next = upsertBookings(plan, (plan.discoveryBookings ?? []).map((booking) => booking.id === target.id
        ? { ...booking, status: "cancelled" as const, updatedAt: new Date().toISOString() }
        : booking));
      const message = `${target.title}은 예약 목록에서 뺐어.`;
      return { handled: true, plan: appendPlanConversation(next, instruction, message), message, bookingIds: [target.id] };
    }
  }

  if (INTEREST_PATTERN.test(instruction)) {
    const item = findDiscoveryItem(plan, instruction);
    if (!item) return { handled: false, plan, message: "", bookingIds: [] };
    const existing = (plan.discoveryBookings ?? []).find((booking) => booking.discoveryItemId === item.id && booking.status !== "cancelled");
    if (existing) {
      const message = `${item.title}은 이미 예약 목록에 있어.`;
      return { handled: true, plan: appendPlanConversation(plan, instruction, message), message, bookingIds: [existing.id] };
    }
    const now = new Date().toISOString();
    const booking: DiscoveryBooking = {
      id: bookingId(),
      discoveryItemId: item.id,
      title: item.title,
      place: item.place,
      startDate: item.startDate,
      endDate: item.endDate,
      detailsUrl: item.detailsUrl,
      confidence: item.confidence,
      status: "interested",
      createdAt: now,
      updatedAt: now,
    };
    const next = upsertBookings(plan, [...(plan.discoveryBookings ?? []), booking]);
    const message = item.detailsUrl
      ? `${item.title}을 예약 목록에 넣었어. ${item.confidence === "official" ? "기관에 등록된 정보야" : "아직 화제성으로만 확인된 정보라 날짜·운영 여부를 직접 확인해야 해"} — 원문 페이지에서 직접 확인·예약해야 해, 하루위드가 대신 예약해주진 않아.`
      : `${item.title}을 예약 목록에 넣었어. 다만 원문 링크를 아직 못 찾아서 직접 검색해서 확인해야 해.`;
    return { handled: true, plan: appendPlanConversation(next, instruction, message), message, bookingIds: [booking.id] };
  }

  return { handled: false, plan, message: "", bookingIds: [] };
}
