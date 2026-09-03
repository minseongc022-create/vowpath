import "server-only";

import { getSharedPlanRecord, listAllSharedPlans } from "./companion-store";
import {
  computeNotificationDrafts,
  secretRelatedItemIds,
  weatherDigestFor,
} from "./notification-engine";
import {
  dueNotifications,
  getPreferences,
  getWeatherDigest,
  listRegisteredPlans,
  markFailed,
  markSent,
  reconcileNotifications,
  setWeatherDigest,
} from "./notification-store";
import { dispatchToPerson } from "./push-dispatch";
import { redactPlanForViewer } from "./secrecy";
import type { DajeongPlan } from "./types";

type Participant = { plan: DajeongPlan; personId: string; role: "owner" | "companion" };

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

async function sweepOneParticipant(participant: Participant): Promise<{ created: number; dispatched: number }> {
  const viewerPlan = participant.role === "owner" ? participant.plan : redactPlanForViewer(participant.plan, participant.personId);
  if (!viewerPlan) return { created: 0, dispatched: 0 };
  const prefs = await getPreferences(participant.personId);
  const previousDigest = await getWeatherDigest(participant.plan.id);
  const ownerSecretItemIds = participant.role === "owner" ? secretRelatedItemIds(participant.plan) : new Set<string>();
  const drafts = computeNotificationDrafts({
    plan: viewerPlan,
    targetPersonId: participant.personId,
    now: new Date(),
    prefs,
    previousWeatherDigest: previousDigest,
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
  for (const participant of participants) {
    const result = await sweepOneParticipant(participant);
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
  for (const participant of participants) await sweepOneParticipant(participant);
}
