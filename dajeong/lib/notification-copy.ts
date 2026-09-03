import type { NotificationKind } from "./types";

/**
 * All proactive notification text is generated from these deterministic templates — never a
 * per-notification LLM call. A push firing every few minutes across every active plan would make
 * an LLM-per-notification design slow and expensive for no real benefit: the phrasing that
 * matters here is tone and factual grounding, both of which a template with the right inputs
 * already gives us. Reserve real model calls for the conversational reply after a tap, where an
 * actual open-ended question is being asked.
 */

function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}

export function departureCopy(input: { itemTitle: string; travelMinutes: number; bufferMinutes: number; leadMinutes: number; travelKnown: boolean }): { title: string; body: string } {
  const { itemTitle, travelMinutes, leadMinutes, travelKnown } = input;
  const cushion = Math.max(0, leadMinutes - travelMinutes);
  const travelNote = travelKnown
    ? `이동시간은 계획상 약 ${minutesLabel(travelMinutes)}이야. 실시간 교통정보는 확인되지 않아서 조금 여유 있게 움직이는 게 좋아.`
    : "정확한 이동시간은 아직 확인되지 않아서 넉넉하게 움직이는 걸 권할게.";
  if (leadMinutes < 0) {
    return {
      title: "지금 출발해도 조금 늦을 것 같아",
      body: `${itemTitle}까지 지금 출발해도 예정 시간보다 늦을 수 있어. ${travelNote} 일정 조정해볼까?`,
    };
  }
  if (leadMinutes <= 5) {
    return {
      title: "지금 출발하면 딱 맞아",
      body: `${itemTitle} 시간 맞추려면 지금 출발하는 게 좋아. ${travelNote}`,
    };
  }
  return {
    title: "슬슬 출발 준비하면 좋겠다",
    body: `이제 슬슬 출발하면 딱 좋겠다. 지금 가면 ${minutesLabel(cushion)} 정도 여유 있게 도착해. ${travelNote}`,
  };
}

export function prepDeadlineCopy(input: { title: string; daysLeft: number; deadlineIsToday: boolean }): { title: string; body: string } {
  if (input.deadlineIsToday) {
    return {
      title: `${input.title} 준비 오늘까지야`,
      body: `${input.title} 주문·예약은 보통 오늘까지 해야 여유가 있어. 아직 안 정했으면 지금 같이 골라볼까?`,
    };
  }
  if (input.daysLeft <= 1) {
    return {
      title: `${input.title} 준비 하루 남았어`,
      body: `내일 ${input.title} 필요하니까 오늘 안에 준비해두는 게 편하겠다.`,
    };
  }
  return {
    title: `${input.title} 준비 마감이 다가와`,
    body: `${input.title} 준비 마감까지 ${input.daysLeft}일 남았어. 여유 있을 때 미리 정해두면 편해.`,
  };
}

export function prepPickupCopy(input: { title: string; minutesLeft: number; feasible: boolean }): { title: string; body: string } {
  if (!input.feasible) {
    return {
      title: `${input.title} 픽업 시간이 촉박해`,
      body: `${input.title} 픽업까지 얼마 안 남았는데 지금 일정대로면 빠듯할 수 있어. 동선을 다시 봐줄까?`,
    };
  }
  return {
    title: `${input.title} 픽업까지 ${minutesLabel(input.minutesLeft)} 남았어`,
    body: `${input.title} 찾으러 갈 시간 슬슬 다가온다. 지금 일정대로면 충분히 갈 수 있어.`,
  };
}

export function weatherChangeCopy(input: { itemTitle: string; note: string }): { title: string; body: string } {
  return {
    title: "날씨가 조금 바뀌었어",
    body: `${input.note} ${input.itemTitle} 일정 조금 바꾸는 게 좋을 수도 있어. 어떻게 할까?`,
  };
}

export function homeboundCopy(input: { homeByTime: string; travelMinutes: number; travelKnown: boolean }): { title: string; body: string } {
  const travelNote = input.travelKnown
    ? `귀가까지 이동시간은 약 ${minutesLabel(input.travelMinutes)}로 계획했어.`
    : "귀가 이동시간은 정확히 확인되지 않아 넉넉히 잡았어.";
  return {
    title: "이제 슬슬 집에 갈 준비하면 좋겠다",
    body: `${input.homeByTime}까지 여유 있게 들어가려면 이제 출발하면 딱 좋아. ${travelNote}`,
  };
}

export function reservationRiskCopy(input: { itemTitle: string; lateMinutes: number }): { title: string; body: string } {
  return {
    title: `${input.itemTitle} 예약 시간을 놓칠 수도 있어`,
    body: `지금 출발해도 예약 시간보다 ${minutesLabel(input.lateMinutes)} 정도 늦을 것 같아. 이동수단을 바꾸거나 일정을 조정해볼까?`,
  };
}

export function checkinCheckoutCopy(input: { kind: "checkin" | "checkout"; title: string; minutesLeft: number }): { title: string; body: string } {
  if (input.kind === "checkout") {
    return {
      title: "체크아웃 시간이 다가와",
      body: `체크아웃까지 ${minutesLabel(input.minutesLeft)} 남았어. 짐 맡기고 더 놀기로 했으면 그것도 챙기자.`,
    };
  }
  return {
    title: "체크인 시간이 다가와",
    body: `${input.title} 체크인까지 ${minutesLabel(input.minutesLeft)} 남았어.`,
  };
}

const CONTENT_HIDDEN_BODY: Record<NotificationKind, string> = {
  departure: "하루온에서 확인할 게 있어.",
  prep_deadline: "하루온에서 확인할 게 있어.",
  prep_pickup: "하루온에서 확인할 게 있어.",
  weather_change: "하루온에서 확인할 게 있어.",
  homebound: "하루온에서 확인할 게 있어.",
  reservation_risk: "하루온에서 확인할 게 있어.",
  checkin_checkout: "하루온에서 확인할 게 있어.",
};

/** Level-2 privacy: replace both title and body with a generic line before the notification is
 * ever persisted or sent — the real content never reaches storage or a device in that state. */
export function contentHiddenCopy(kind: NotificationKind): { title: string; body: string } {
  return { title: "하루온", body: CONTENT_HIDDEN_BODY[kind] };
}
