import "server-only";

import { getSharedPlanRecord, listAllSharedPlans } from "./companion-store";
import {
  computeNotificationDrafts,
  discoveryIdsFromDrafts,
  secretRelatedItemIds,
  weatherDigestFor,
} from "./notification-engine";
import { refreshDiscoveredEventsForPlan } from "./discovery-region-refresh";
import {
  dueNotifications,
  getDiscoveryDigest,
  getPreferences,
  getWeatherDigest,
  listRegisteredPlans,
  markFailed,
  markSent,
  reconcileNotifications,
  setDiscoveryDigest,
  setWeatherDigest,
} from "./notification-store";
import { dispatchToPerson } from "./push-dispatch";
import { redactPlanForViewer } from "./secrecy";
import type { DajeongPlan } from "./types";

type Participant = { plan: DajeongPlan; personId: string; role: "owner" | "companion" };

/**
 * 발견 항목 갱신(지역 API 호출 포함)은 계획당 한 번이면 된다 — 같은 계획을 보는 소유자·동반자
 * 둘 다에게 매번 다시 부를 이유가 없다. 이 스윕 한 번(sweepDueNotifications 한 호출) 동안만
 * 살아있는 캐시라 여러 스윕에 걸쳐 재사용되진 않지만, discovery-region-refresh.ts 쪽 지역
 * 캐시가 실제 API 호출 빈도를 이미 3시간 단위로 눌러준다.
 */
async function refreshedDiscoveredEvents(plan: DajeongPlan, cache: Map<string, DajeongPlan>): Promise<DajeongPlan> {
  const cached = cache.get(plan.id);
  if (cached) return cached;
  const refreshed = await refreshDiscoveredEventsForPlan(plan);
  cache.set(plan.id, refreshed);
  return refreshed;
}

/** Two distinct sources of "plans that need proactive scheduling": solo plans a person opted
 * into (registeredPlans, owner only — solo plans never leave the browser otherwise), and shared
 * plans, which the server already holds canonically via companion-store and which sweep both
 * the owner and the companion. A plan present in both (owner registered it solo before sharing
 * it) is deduped so it's swept once per participant, not twice. */
async function collectParticipants(): Promise<Participant[]> {
  const participants: Participant[] = [];
  const sharedPlanIds = new Set<string>();
  for (const record of await listAllSharedPlans()) {
    sharedPlanIds.add(record.planId);
    participants.push({ plan: record.plan, personId: record.ownerId, role: "owner" });
    participants.push({ plan: record.plan, personId: record.companionId, role: "companion" });
  }
  for (const registered of await listRegisteredPlans()) {
    if (sharedPlanIds.has(registered.plan.id)) continue;
    participants.push({ plan: registered.plan, personId: registered.ownerId, role: "owner" });
  }
  return participants;
}

/**
 * dajeong_discovery_digests 테이블은 이 기능과 함께 새로 추가됐다 — 운영 DB에 아직
 * `prisma db push`가 안 돌았으면 테이블이 없어서 쿼리가 실패한다. 그렇다고 그 실패가 날씨·
 * 출발·준비물 등 이미 정상 동작하던 다른 알림까지 통째로 멈추게 하면 안 된다. 그래서 여기서만
 * 조용히 실패를 흡수한다 — 발견 알림 하나가 이번 틱에 빠지는 것과, 스윕 전체가 죽는 것은
 * 전혀 다른 크기의 문제다.
 */
async function safeGetDiscoveryDigest(planId: string): Promise<string[]> {
  try {
    return await getDiscoveryDigest(planId);
  } catch {
    return [];
  }
}

async function safeSetDiscoveryDigest(planId: string, notifiedIds: string[]): Promise<void> {
  try {
    await setDiscoveryDigest(planId, notifiedIds);
  } catch {
    // 테이블이 아직 없으면 이번엔 못 남기고 넘어간다 — db push 이후 다음 스윕부터 정상 동작한다.
  }
}

async function sweepOneParticipant(participant: Participant, discoveryCache: Map<string, DajeongPlan>): Promise<{ created: number; dispatched: number }> {
  const refreshedPlan = await refreshedDiscoveredEvents(participant.plan, discoveryCache);
  const viewerPlan = participant.role === "owner" ? refreshedPlan : redactPlanForViewer(refreshedPlan, participant.personId);
  if (!viewerPlan) return { created: 0, dispatched: 0 };
  const prefs = await getPreferences(participant.personId);
  const previousDigest = await getWeatherDigest(participant.plan.id);
  const previousNotifiedDiscoveryIds = await safeGetDiscoveryDigest(participant.plan.id);
  const ownerSecretItemIds = participant.role === "owner" ? secretRelatedItemIds(participant.plan) : new Set<string>();
  const drafts = computeNotificationDrafts({
    plan: viewerPlan,
    targetPersonId: participant.personId,
    now: new Date(),
    prefs,
    previousWeatherDigest: previousDigest,
    previousNotifiedDiscoveryIds,
    ownerSecretItemIds,
  });
  const created = await reconcileNotifications({
    planId: participant.plan.id,
    planVersion: participant.plan.sharedVersion ?? participant.plan.versions?.length ?? 0,
    targetPersonId: participant.personId,
    drafts,
  });
  if (participant.role === "owner") {
    await setWeatherDigest(participant.plan.id, weatherDigestFor(viewerPlan));
    const newlyNotified = discoveryIdsFromDrafts(drafts, participant.plan.id);
    if (newlyNotified.length) await safeSetDiscoveryDigest(participant.plan.id, [...previousNotifiedDiscoveryIds, ...newlyNotified]);
  }
  return { created: created.length, dispatched: 0 };
}

export type SweepSummary = { plansScanned: number; participantsScanned: number; notificationsReconciled: number; dispatched: number; failed: number; expiredSubscriptionsRemoved: number };

/** The one function the external cron (and the internal "plan just changed" hook) both call.
 * Recomputes every registered/shared plan's due notifications, reconciles them against what's
 * already scheduled, then dispatches whatever is now due. Idempotent and safe to call as often
 * as needed — reconcileNotifications never double-schedules, and dispatch only fires rows still
 * in "scheduled" state. */
export async function sweepDueNotifications(): Promise<SweepSummary> {
  const participants = await collectParticipants();
  let notificationsReconciled = 0;
  const discoveryCache = new Map<string, DajeongPlan>();
  for (const participant of participants) {
    const result = await sweepOneParticipant(participant, discoveryCache);
    notificationsReconciled += result.created;
  }
  const now = new Date();
  const due = await dueNotifications(now);
  let dispatched = 0;
  let failed = 0;
  let expiredSubscriptionsRemoved = 0;
  for (const notification of due) {
    try {
      const result = await dispatchToPerson(notification.targetPersonId, notification);
      expiredSubscriptionsRemoved += result.expiredRemoved;
      if (result.delivered > 0 || result.failed === 0) {
        await markSent(notification.id);
        dispatched += 1;
      } else {
        await markFailed(notification.id, "모든 구독 전송 실패");
        failed += 1;
      }
    } catch (error) {
      await markFailed(notification.id, error instanceof Error ? error.message : "알 수 없는 오류");
      failed += 1;
    }
  }
  return { plansScanned: new Set(participants.map((p) => p.plan.id)).size, participantsScanned: participants.length, notificationsReconciled, dispatched, failed, expiredSubscriptionsRemoved };
}

/** Called right after a plan mutation (revise/live/sync) so notifications react immediately
 * instead of waiting for the next external cron tick — the cron sweep is the durability
 * guarantee (survives restarts, catches anything this path misses), this is just responsiveness. */
export async function resweepPlan(planId: string): Promise<void> {
  const participants: Participant[] = [];
  const registered = (await listRegisteredPlans()).find((entry) => entry.plan.id === planId);
  if (registered) participants.push({ plan: registered.plan, personId: registered.ownerId, role: "owner" });
  const shared = await getSharedPlanRecord(planId);
  if (shared) {
    participants.push({ plan: shared.plan, personId: shared.ownerId, role: "owner" });
    participants.push({ plan: shared.plan, personId: shared.companionId, role: "companion" });
  }
  const discoveryCache = new Map<string, DajeongPlan>();
  for (const participant of participants) await sweepOneParticipant(participant, discoveryCache);
}
