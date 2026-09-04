import { labelFor } from "./prep-conversation";
import { isLeadTimeFeasible } from "./prep-engine";
import { daysRemaining, worthNotifying } from "./discovery-engine";
import {
  checkinCheckoutCopy,
  contentHiddenCopy,
  departureCopy,
  discoveryEventCopy,
  homeboundCopy,
  prepDeadlineCopy,
  prepPickupCopy,
  weatherChangeCopy,
} from "./notification-copy";
import type {
  DajeongPlan,
  NotificationCategoryToggles,
  NotificationKind,
  NotificationPreferences,
  NotificationPriority,
  PlanItem,
} from "./types";

export type NotificationDraft = {
  targetPersonId: string;
  kind: NotificationKind;
  priority: NotificationPriority;
  dedupeKey: string;
  scheduledFor: string;
  title: string;
  body: string;
  privacyAtSend: "normal" | "content_hidden";
  deepLink: string;
  relatedItemId?: string;
};

const KST_OFFSET_MINUTES = 9 * 60;

/** Korea runs no DST, so a fixed +09:00 offset — computed independent of whatever timezone the
 * server process itself happens to run in — is the correct, reproducible conversion. The base
 * itinerary engine doesn't model non-Korean timezones at all yet (region lookup is Korea-only),
 * so this is deliberately the one and only timezone this notification layer understands. */
export function kstToUtc(dateKey: string, time: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0) - KST_OFFSET_MINUTES * 60_000);
}

export function itemDateKey(plan: DajeongPlan, dayNumber = 1): string {
  const date = new Date(`${plan.situation.targetDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Math.max(0, dayNumber - 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function deepLinkFor(plan: DajeongPlan): string {
  return `/dajeong/plan/${plan.id}/today`;
}

function isActive(item: PlanItem): boolean {
  return item.liveState !== "done" && item.liveState !== "skipped";
}

const DEFAULT_BUFFER_MINUTES = 10;

function travelMinutesFor(item: PlanItem): { minutes: number; known: boolean } {
  const minutes = item.reality?.travelEstimateMinutes ?? item.travelFromPrevious?.minutes;
  return minutes != null ? { minutes, known: true } : { minutes: 20, known: false };
}

function departureDrafts(plan: DajeongPlan, now: Date, categories: NotificationCategoryToggles): NotificationDraft[] {
  if (!categories.departure && !categories.execution) return [];
  const drafts: NotificationDraft[] = [];
  for (const item of plan.items) {
    if (!isActive(item) || !item.time) continue;
    const dateKey = itemDateKey(plan, item.dayNumber ?? 1);
    const arrival = kstToUtc(dateKey, item.time);
    const { minutes: travelMinutes, known } = travelMinutesFor(item);
    const leadMinutes = Math.round((arrival.getTime() - now.getTime()) / 60_000) - travelMinutes - DEFAULT_BUFFER_MINUTES;
    // Only worth telling the user about once it's within a realistic planning horizon —
    // otherwise every future item would generate a "scheduled" row the moment the plan exists.
    if (leadMinutes > 90) continue;
    const critical = leadMinutes < -5;
    const copy = departureCopy({ itemTitle: item.title, travelMinutes, bufferMinutes: DEFAULT_BUFFER_MINUTES, leadMinutes, travelKnown: known });
    drafts.push({
      targetPersonId: "",
      kind: critical ? "reservation_risk" : "departure",
      priority: critical ? "critical" : leadMinutes <= 15 ? "high" : "normal",
      dedupeKey: `dep:${item.id}`,
      scheduledFor: new Date(arrival.getTime() - (travelMinutes + DEFAULT_BUFFER_MINUTES) * 60_000).toISOString(),
      title: copy.title,
      body: copy.body,
      privacyAtSend: "normal",
      deepLink: deepLinkFor(plan),
      relatedItemId: item.id,
    });
  }
  return drafts;
}

function homeboundDrafts(plan: DajeongPlan, now: Date, categories: NotificationCategoryToggles): NotificationDraft[] {
  if (!categories.departure || !plan.situation.homeByTime) return [];
  const lastDay = plan.situation.planScope === "trip" ? (plan.situation.tripDays ?? 1) : 1;
  const dayItems = plan.items.filter((item) => (item.dayNumber ?? 1) === lastDay && isActive(item));
  if (!dayItems.length) return [];
  const dateKey = itemDateKey(plan, lastDay);
  const homeBy = kstToUtc(dateKey, plan.situation.homeByTime);
  const travelMinutes = plan.situation.homeTravelMinutes;
  const known = travelMinutes != null;
  const departAt = new Date(homeBy.getTime() - (travelMinutes ?? 30) * 60_000);
  const leadMinutes = Math.round((departAt.getTime() - now.getTime()) / 60_000);
  if (leadMinutes > 120 || leadMinutes < -30) return [];
  const copy = homeboundCopy({ homeByTime: plan.situation.homeByTime, travelMinutes: travelMinutes ?? 30, travelKnown: known });
  return [{
    targetPersonId: "",
    kind: "homebound",
    priority: leadMinutes < 0 ? "critical" : "high",
    dedupeKey: `home:${plan.id}:${lastDay}`,
    scheduledFor: departAt.toISOString(),
    title: copy.title,
    body: copy.body,
    privacyAtSend: "normal",
    deepLink: deepLinkFor(plan),
  }];
}

function prepDrafts(plan: DajeongPlan, now: Date, categories: NotificationCategoryToggles): NotificationDraft[] {
  if (!categories.prep) return [];
  const drafts: NotificationDraft[] = [];
  const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  for (const item of plan.prep ?? []) {
    if (["cancelled", "ready", "picked_up", "delivered"].includes(item.status)) continue;
    const label = labelFor(item.category);
    if (item.orderDeadline && item.status === "suggested" && isLeadTimeFeasible(item, todayKey)) {
      const daysLeft = Math.round((new Date(`${item.orderDeadline}T12:00:00Z`).getTime() - new Date(`${todayKey}T12:00:00Z`).getTime()) / 86_400_000);
      if (daysLeft <= 2 && daysLeft >= 0) {
        const copy = prepDeadlineCopy({ title: label, daysLeft, deadlineIsToday: daysLeft === 0 });
        drafts.push({
          targetPersonId: "",
          kind: "prep_deadline",
          priority: daysLeft === 0 ? "high" : "normal",
          dedupeKey: `prep-deadline:${item.id}`,
          scheduledFor: kstToUtc(item.orderDeadline, "09:00").toISOString(),
          title: copy.title,
          body: copy.body,
          privacyAtSend: "normal",
          deepLink: deepLinkFor(plan),
          relatedItemId: item.id,
        });
      }
    }
    if (item.time && item.date && (item.status === "confirmed" || item.status === "ordered")) {
      const pickupAt = kstToUtc(item.date, item.time);
      const minutesLeft = Math.round((pickupAt.getTime() - now.getTime()) / 60_000);
      if (minutesLeft <= 90 && minutesLeft >= -15) {
        const feasible = minutesLeft >= 0;
        const copy = prepPickupCopy({ title: label, minutesLeft: Math.max(0, minutesLeft), feasible });
        drafts.push({
          targetPersonId: "",
          kind: "prep_pickup",
          priority: feasible ? (minutesLeft <= 20 ? "high" : "normal") : "critical",
          dedupeKey: `prep-pickup:${item.id}`,
          scheduledFor: new Date(pickupAt.getTime() - 60 * 60_000).toISOString(),
          title: copy.title,
          body: copy.body,
          privacyAtSend: "normal",
          deepLink: deepLinkFor(plan),
          relatedItemId: item.id,
        });
      }
    }
  }
  return drafts;
}

function checkinCheckoutDrafts(plan: DajeongPlan, now: Date, categories: NotificationCategoryToggles): NotificationDraft[] {
  if (!categories.execution || plan.situation.planScope !== "trip") return [];
  const drafts: NotificationDraft[] = [];
  for (const logistics of plan.logistics ?? []) {
    if (logistics.kind !== "checkin" && logistics.kind !== "checkout") continue;
    const dateKey = itemDateKey(plan, logistics.dayNumber);
    const at = kstToUtc(dateKey, logistics.time);
    const minutesLeft = Math.round((at.getTime() - now.getTime()) / 60_000);
    if (minutesLeft > 90 || minutesLeft < -30) continue;
    const copy = checkinCheckoutCopy({ kind: logistics.kind, title: logistics.title, minutesLeft: Math.max(0, minutesLeft) });
    drafts.push({
      targetPersonId: "",
      kind: "checkin_checkout",
      priority: minutesLeft <= 20 ? "high" : "normal",
      dedupeKey: `stay:${logistics.id}`,
      scheduledFor: new Date(at.getTime() - 60 * 60_000).toISOString(),
      title: copy.title,
      body: copy.body,
      privacyAtSend: "normal",
      deepLink: deepLinkFor(plan),
    });
  }
  return drafts;
}

export type WeatherDigestEntry = { date: string; impact: "low" | "medium" | "high"; rainMax: number };

export function weatherDigestFor(plan: DajeongPlan): WeatherDigestEntry[] {
  return (plan.schedule?.weather.days ?? []).map((day) => ({ date: day.date, impact: day.impact, rainMax: day.precipitationProbabilityMax ?? 0 }));
}

function weatherEscalated(previous: WeatherDigestEntry | undefined, current: WeatherDigestEntry): boolean {
  if (!previous) return current.impact !== "low";
  const rank = { low: 0, medium: 1, high: 2 } as const;
  if (rank[current.impact] > rank[previous.impact]) return true;
  return current.rainMax - previous.rainMax >= 30;
}

function weatherDrafts(plan: DajeongPlan, now: Date, categories: NotificationCategoryToggles, previousDigest: WeatherDigestEntry[]): NotificationDraft[] {
  if (!categories.weather || !plan.schedule?.weather.days.length) return [];
  const drafts: NotificationDraft[] = [];
  const previousByDate = new Map(previousDigest.map((entry) => [entry.date, entry]));
  for (const item of plan.items) {
    if (!isActive(item) || item.venueType === "indoor" || !item.time) continue;
    const dateKey = itemDateKey(plan, item.dayNumber ?? 1);
    const itemTime = kstToUtc(dateKey, item.time);
    if (itemTime.getTime() < now.getTime()) continue;
    const day = plan.schedule.weather.days.find((entry) => entry.date === dateKey);
    if (!day) continue;
    const current: WeatherDigestEntry = { date: dateKey, impact: day.impact, rainMax: day.precipitationProbabilityMax ?? 0 };
    if (!weatherEscalated(previousByDate.get(dateKey), current)) continue;
    const note = day.impact === "high" ? "비가 생각보다 많이 올 것 같아." : "비가 생각보다 조금 일찍 올 것 같아.";
    const copy = weatherChangeCopy({ itemTitle: item.title, note });
    drafts.push({
      targetPersonId: "",
      kind: "weather_change",
      priority: day.impact === "high" ? "high" : "normal",
      dedupeKey: `weather:${plan.id}:${dateKey}`,
      scheduledFor: now.toISOString(),
      title: copy.title,
      body: copy.body,
      privacyAtSend: "normal",
      deepLink: deepLinkFor(plan),
      relatedItemId: item.id,
    });
  }
  return drafts;
}

/**
 * "요즘 뜨는 것" 알림 — 계획의 지역·날짜 근처에서 기관에 등록된 기간 한정 행사(경복궁
 * 야간개장류)를 찾았고, 종료까지 14일 이내로 다가온 것만 알린다(worthNotifying 기준).
 * 화제성(블로그 추정)만으로는 먼저 찔러 알리지 않는다 — 앱을 열었을 때 보여주는 걸로 충분하다.
 * 같은 항목을 사용자당 한 번만 알리도록 previousNotifiedIds에 이미 있는 건 건너뛴다 — 아니면
 * 종료 전까지 매 스윕(60초)마다 같은 알림이 반복해서 나가게 된다.
 */
function discoveryDrafts(plan: DajeongPlan, now: Date, categories: NotificationCategoryToggles, previousNotifiedIds: string[]): NotificationDraft[] {
  if (!categories.proactiveSuggestions || !plan.discoveredEvents?.length) return [];
  const alreadyNotified = new Set(previousNotifiedIds);
  const drafts: NotificationDraft[] = [];
  for (const item of plan.discoveredEvents) {
    if (alreadyNotified.has(item.id) || !worthNotifying(item, now)) continue;
    const copy = discoveryEventCopy({ title: item.title, region: item.region ?? plan.situation.region, daysLeft: daysRemaining(item, now) });
    drafts.push({
      targetPersonId: "",
      kind: "discovery_event",
      priority: "normal",
      dedupeKey: `discovery:${plan.id}:${item.id}`,
      scheduledFor: now.toISOString(),
      title: copy.title,
      body: copy.body,
      privacyAtSend: "normal",
      deepLink: deepLinkFor(plan),
    });
  }
  return drafts;
}

/** Push quiet-hours-blocked, non-critical notifications to the end of quiet hours instead of
 * dropping or firing them silently at 3am. Critical notifications (missed reservation, deadline
 * today) are never delayed — that's the one case where waking someone is the point. */
export function applyQuietHours(scheduledForIso: string, priority: NotificationPriority, quietHours?: { startTime: string; endTime: string }): string {
  if (!quietHours || priority === "critical") return scheduledForIso;
  const scheduled = new Date(scheduledForIso);
  const dateKey = `${scheduled.getUTCFullYear()}-${String(scheduled.getUTCMonth() + 1).padStart(2, "0")}-${String(scheduled.getUTCDate()).padStart(2, "0")}`;
  const start = kstToUtc(dateKey, quietHours.startTime);
  let end = kstToUtc(dateKey, quietHours.endTime);
  if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + 24 * 60 * 60_000); // overnight window
  if (scheduled.getTime() >= start.getTime() && scheduled.getTime() < end.getTime()) return end.toISOString();
  // Also check the previous day's overnight window spilling into today.
  const prevStart = new Date(start.getTime() - 24 * 60 * 60_000);
  const prevEnd = new Date(end.getTime() - 24 * 60 * 60_000);
  if (scheduled.getTime() >= prevStart.getTime() && scheduled.getTime() < prevEnd.getTime()) return prevEnd.toISOString();
  return scheduledForIso;
}

const DEFAULT_CATEGORIES: NotificationCategoryToggles = {
  departure: true,
  prep: true,
  execution: true,
  weather: true,
  sharedPlanChanges: true,
  proactiveSuggestions: true,
};

export function defaultNotificationPreferences(personId: string): NotificationPreferences {
  return {
    personId,
    masterEnabled: true,
    categories: { ...DEFAULT_CATEGORIES },
    secretPrivacyLevel: "content_hidden",
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Computes every notification that SHOULD currently be scheduled for one recipient, from that
 * recipient's own view of the plan. Callers must pass an already-redacted plan for a companion
 * (via secrecy.redactPlanForViewer) — this function has no idea what "secret" means and never
 * needs to, because a redacted plan structurally cannot contain the hidden items/prep at all.
 * That is the actual privacy boundary; privacyAtSend below only governs the OWNER's own
 * lockscreen-visible content for prep/items they marked secret themselves.
 */
export function computeNotificationDrafts(input: {
  plan: DajeongPlan;
  targetPersonId: string;
  now: Date;
  prefs: NotificationPreferences;
  previousWeatherDigest: WeatherDigestEntry[];
  /** discovery item ids this person has already been notified about — see discoveryDrafts. */
  previousNotifiedDiscoveryIds: string[];
  /** ids of secret main items / non-shared prep — used only to decide privacyAtSend for the
   * OWNER's own device (their lockscreen could be seen by the person they're hiding this from);
   * never used to decide whether a draft is generated at all. */
  ownerSecretItemIds: Set<string>;
}): NotificationDraft[] {
  const { plan, targetPersonId, now, prefs, previousWeatherDigest, previousNotifiedDiscoveryIds, ownerSecretItemIds } = input;
  if (!prefs.masterEnabled) return [];
  const raw = [
    ...departureDrafts(plan, now, prefs.categories),
    ...homeboundDrafts(plan, now, prefs.categories),
    ...prepDrafts(plan, now, prefs.categories),
    ...checkinCheckoutDrafts(plan, now, prefs.categories),
    ...weatherDrafts(plan, now, prefs.categories, previousWeatherDigest),
    ...discoveryDrafts(plan, now, prefs.categories, previousNotifiedDiscoveryIds),
  ];
  return raw.flatMap((draft) => {
    const isSecretForOwner = Boolean(draft.relatedItemId && ownerSecretItemIds.has(draft.relatedItemId));
    if (isSecretForOwner && prefs.secretPrivacyLevel === "off") return [];
    const privacyAtSend: "normal" | "content_hidden" = isSecretForOwner && prefs.secretPrivacyLevel === "content_hidden" ? "content_hidden" : "normal";
    const copy = privacyAtSend === "content_hidden" ? contentHiddenCopy(draft.kind) : { title: draft.title, body: draft.body };
    return [{
      ...draft,
      targetPersonId,
      title: copy.title,
      body: copy.body,
      privacyAtSend,
      scheduledFor: applyQuietHours(draft.scheduledFor, draft.priority, prefs.quietHours),
    }];
  });
}

/** Extracts which discovery item ids just got a draft for this plan, so the sweep can add them
 * to that plan's notified-ids digest and never re-fire the same "○○ 떴어" push again. */
export function discoveryIdsFromDrafts(drafts: NotificationDraft[], planId: string): string[] {
  const prefix = `discovery:${planId}:`;
  return drafts.filter((draft) => draft.kind === "discovery_event" && draft.dedupeKey.startsWith(prefix)).map((draft) => draft.dedupeKey.slice(prefix.length));
}

export function secretRelatedItemIds(plan: DajeongPlan): Set<string> {
  const ids = new Set<string>();
  for (const item of plan.items) if (item.visibility === "secret") ids.add(item.id);
  for (const item of plan.prep ?? []) if (item.visibility !== "shared") ids.add(item.id);
  return ids;
}
