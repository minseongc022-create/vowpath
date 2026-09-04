import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { defaultNotificationPreferences } from "./notification-engine";
import type { NotificationDraft, WeatherDigestEntry } from "./notification-engine";
import type {
  DajeongNotification,
  DajeongPlan,
  NotificationPreferences,
  PushSubscriptionRecord,
} from "./types";
import type { RegisteredPlan } from "./notification-store-file";

function prefsFromRow(row: {
  personId: string;
  masterEnabled: boolean;
  categories: unknown;
  secretPrivacyLevel: string;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  updatedAt: Date;
}): NotificationPreferences {
  return {
    personId: row.personId,
    masterEnabled: row.masterEnabled,
    categories: row.categories as NotificationPreferences["categories"],
    secretPrivacyLevel: row.secretPrivacyLevel as NotificationPreferences["secretPrivacyLevel"],
    quietHours: row.quietHoursStart && row.quietHoursEnd ? { startTime: row.quietHoursStart, endTime: row.quietHoursEnd } : undefined,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function notificationFromRow(row: {
  id: string; planId: string; planVersion: number; targetPersonId: string; kind: string; priority: string; status: string;
  dedupeKey: string; scheduledFor: Date; title: string; body: string; privacyAtSend: string; deepLink: string;
  relatedItemId: string | null; createdAt: Date; updatedAt: Date; sentAt: Date | null; supersededBy: string | null; failureReason: string | null;
}): DajeongNotification {
  return {
    id: row.id,
    planId: row.planId,
    planVersion: row.planVersion,
    targetPersonId: row.targetPersonId,
    kind: row.kind as DajeongNotification["kind"],
    priority: row.priority as DajeongNotification["priority"],
    status: row.status as DajeongNotification["status"],
    dedupeKey: row.dedupeKey,
    scheduledFor: row.scheduledFor.toISOString(),
    title: row.title,
    body: row.body,
    privacyAtSend: row.privacyAtSend as DajeongNotification["privacyAtSend"],
    deepLink: row.deepLink,
    relatedItemId: row.relatedItemId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    sentAt: row.sentAt?.toISOString(),
    supersededBy: row.supersededBy ?? undefined,
    failureReason: row.failureReason ?? undefined,
  };
}

export async function getPreferences(personId: string): Promise<NotificationPreferences> {
  const row = await prisma.dajeongNotificationPreference.findUnique({ where: { personId } });
  return row ? prefsFromRow(row) : defaultNotificationPreferences(personId);
}

export async function setPreferences(
  personId: string,
  update: Partial<Omit<NotificationPreferences, "personId" | "updatedAt" | "quietHours" | "categories">> & {
    categories?: Partial<NotificationPreferences["categories"]>;
    quietHours?: NotificationPreferences["quietHours"] | null;
  },
): Promise<NotificationPreferences> {
  const current = await getPreferences(personId);
  const categories = { ...current.categories, ...(update.categories ?? {}) };
  const quietHours = update.quietHours === undefined ? current.quietHours : update.quietHours === null ? undefined : update.quietHours;
  const row = await prisma.dajeongNotificationPreference.upsert({
    where: { personId },
    create: {
      personId,
      masterEnabled: update.masterEnabled ?? current.masterEnabled,
      categories: categories as object,
      secretPrivacyLevel: update.secretPrivacyLevel ?? current.secretPrivacyLevel,
      quietHoursStart: quietHours?.startTime,
      quietHoursEnd: quietHours?.endTime,
    },
    update: {
      masterEnabled: update.masterEnabled ?? current.masterEnabled,
      categories: categories as object,
      secretPrivacyLevel: update.secretPrivacyLevel ?? current.secretPrivacyLevel,
      quietHoursStart: quietHours?.startTime ?? null,
      quietHoursEnd: quietHours?.endTime ?? null,
    },
  });
  return prefsFromRow(row);
}

export async function addSubscription(personId: string, endpoint: string, keys: PushSubscriptionRecord["keys"], userAgent?: string): Promise<PushSubscriptionRecord> {
  // `endpoint` is globally unique and never exposed to any client via this app's own API
  // responses, but defense-in-depth: never let a request re-point an existing subscription
  // (however it was obtained) onto a different personId. Same endpoint, same owner: refresh
  // the keys (normal browser resubscribe). Different owner: treat as a fresh subscription
  // instead of hijacking — old rows for another person are left alone, this one just fails to
  // upsert onto them silently.
  const existing = await prisma.dajeongPushSubscription.findUnique({ where: { endpoint } });
  if (existing && existing.personId !== personId) {
    throw new Error("이 구독은 다른 사용자에게 등록되어 있어.");
  }
  const row = await prisma.dajeongPushSubscription.upsert({
    where: { endpoint },
    create: { personId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    update: { p256dh: keys.p256dh, auth: keys.auth, userAgent },
  });
  return { id: row.id, personId: row.personId, endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth }, userAgent: row.userAgent ?? undefined, createdAt: row.createdAt.toISOString() };
}

export async function removeSubscription(personId: string, endpoint: string): Promise<void> {
  await prisma.dajeongPushSubscription.deleteMany({ where: { personId, endpoint } });
}

export async function removeAllSubscriptionsForPerson(personId: string): Promise<void> {
  await prisma.dajeongPushSubscription.deleteMany({ where: { personId } });
}

export async function listSubscriptions(personId: string): Promise<PushSubscriptionRecord[]> {
  const rows = await prisma.dajeongPushSubscription.findMany({ where: { personId } });
  return rows.map((row) => ({ id: row.id, personId: row.personId, endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth }, userAgent: row.userAgent ?? undefined, createdAt: row.createdAt.toISOString() }));
}

export async function removeSubscriptionById(personId: string, subscriptionId: string): Promise<void> {
  await prisma.dajeongPushSubscription.deleteMany({ where: { id: subscriptionId, personId } });
}

export async function registerPlanForNotifications(plan: DajeongPlan, ownerId: string): Promise<void> {
  await prisma.dajeongRegisteredPlan.upsert({
    where: { planId: plan.id },
    create: { planId: plan.id, ownerId, plan: plan as object },
    update: { ownerId, plan: plan as object },
  });
}

export async function unregisterPlan(planId: string): Promise<void> {
  await prisma.$transaction([
    prisma.dajeongRegisteredPlan.deleteMany({ where: { planId } }),
    prisma.dajeongWeatherDigest.deleteMany({ where: { planId } }),
    prisma.dajeongDiscoveryDigest.deleteMany({ where: { planId } }),
  ]);
}

export async function listRegisteredPlans(): Promise<RegisteredPlan[]> {
  const rows = await prisma.dajeongRegisteredPlan.findMany();
  return rows.map((row) => ({ plan: row.plan as DajeongPlan, ownerId: row.ownerId, updatedAt: row.updatedAt.toISOString() }));
}

export async function getRegisteredPlan(planId: string): Promise<RegisteredPlan | null> {
  const row = await prisma.dajeongRegisteredPlan.findUnique({ where: { planId } });
  return row ? { plan: row.plan as DajeongPlan, ownerId: row.ownerId, updatedAt: row.updatedAt.toISOString() } : null;
}

export async function getWeatherDigest(planId: string): Promise<WeatherDigestEntry[]> {
  const row = await prisma.dajeongWeatherDigest.findUnique({ where: { planId } });
  return row ? (row.digest as WeatherDigestEntry[]) : [];
}

export async function setWeatherDigest(planId: string, digest: WeatherDigestEntry[]): Promise<void> {
  await prisma.dajeongWeatherDigest.upsert({
    where: { planId },
    create: { planId, digest: digest as unknown as object },
    update: { digest: digest as unknown as object },
  });
}

export async function getDiscoveryDigest(planId: string): Promise<string[]> {
  const row = await prisma.dajeongDiscoveryDigest.findUnique({ where: { planId } });
  return row ? (row.notifiedIds as string[]) : [];
}

export async function setDiscoveryDigest(planId: string, notifiedIds: string[]): Promise<void> {
  await prisma.dajeongDiscoveryDigest.upsert({
    where: { planId },
    create: { planId, notifiedIds: notifiedIds as unknown as object },
    update: { notifiedIds: notifiedIds as unknown as object },
  });
}

/** Same reconciliation contract as the file store: unchanged drafts are left alone, changed ones
 * supersede their predecessor, drafts no longer present cancel their stale row. The DB partial
 * unique index (dajeong_notifications_active_dedupe_key, applied via prisma/dajeong-tables.sql —
 * see that file for why it can't be declared in schema.prisma) is the race-safety backstop: if
 * two reconcile calls for the same person genuinely overlap, the loser's insert hits a unique
 * violation instead of creating a duplicate "scheduled" row, and is treated as an idempotent
 * no-op (the winner's row already represents the same event).
 */
export async function reconcileNotifications(params: {
  planId: string;
  planVersion: number;
  targetPersonId: string;
  drafts: NotificationDraft[];
}): Promise<DajeongNotification[]> {
  return prisma.$transaction(async (tx) => {
    const existingForPerson = await tx.dajeongNotification.findMany({
      where: { planId: params.planId, targetPersonId: params.targetPersonId, status: "scheduled" },
    });
    const existingByKey = new Map(existingForPerson.map((row) => [row.dedupeKey, row]));
    const draftKeys = new Set(params.drafts.map((draft) => draft.dedupeKey));
    const results: DajeongNotification[] = [];

    for (const draft of params.drafts) {
      const existing = existingByKey.get(draft.dedupeKey);
      const scheduledForDate = new Date(draft.scheduledFor);
      if (existing && existing.title === draft.title && existing.body === draft.body && existing.scheduledFor.getTime() === scheduledForDate.getTime() && existing.planVersion === params.planVersion) {
        results.push(notificationFromRow(existing));
        continue;
      }
      if (existing) {
        await tx.dajeongNotification.update({ where: { id: existing.id }, data: { status: "superseded" } });
      }
      try {
        const created = await tx.dajeongNotification.create({
          data: {
            planId: params.planId,
            planVersion: params.planVersion,
            targetPersonId: params.targetPersonId,
            kind: draft.kind,
            priority: draft.priority,
            status: "scheduled",
            dedupeKey: draft.dedupeKey,
            scheduledFor: scheduledForDate,
            title: draft.title,
            body: draft.body,
            privacyAtSend: draft.privacyAtSend,
            deepLink: draft.deepLink,
            relatedItemId: draft.relatedItemId,
          },
        });
        if (existing) await tx.dajeongNotification.update({ where: { id: existing.id }, data: { supersededBy: created.id } });
        results.push(notificationFromRow(created));
      } catch (error) {
        // Partial-unique race: another concurrent reconcile already created the active row for
        // this (person, dedupeKey) — read it back rather than erroring the whole sweep out.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          const winner = await tx.dajeongNotification.findFirst({ where: { targetPersonId: params.targetPersonId, dedupeKey: draft.dedupeKey, status: "scheduled" } });
          if (winner) results.push(notificationFromRow(winner));
        } else {
          throw error;
        }
      }
    }

    for (const stale of existingForPerson) {
      if (!draftKeys.has(stale.dedupeKey)) {
        await tx.dajeongNotification.update({ where: { id: stale.id }, data: { status: "cancelled" } });
      }
    }

    return results;
  });
}

export async function dueNotifications(now: Date): Promise<DajeongNotification[]> {
  const rows = await prisma.dajeongNotification.findMany({ where: { status: "scheduled", scheduledFor: { lte: now } } });
  return rows.map(notificationFromRow);
}

export async function markSent(id: string): Promise<void> {
  await prisma.dajeongNotification.updateMany({ where: { id }, data: { status: "sent", sentAt: new Date() } });
}

export async function markFailed(id: string, reason: string): Promise<void> {
  await prisma.dajeongNotification.updateMany({ where: { id }, data: { status: "failed", failureReason: reason } });
}

export async function listNotificationsForPerson(personId: string, limit = 30): Promise<DajeongNotification[]> {
  const rows = await prisma.dajeongNotification.findMany({
    where: { targetPersonId: personId, status: { notIn: ["cancelled", "superseded"] } },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return rows.map(notificationFromRow);
}
