import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type {
  DajeongNotification,
  DajeongPlan,
  NotificationPreferences,
  PushSubscriptionRecord,
} from "./types";
import type { NotificationDraft, WeatherDigestEntry } from "./notification-engine";
import { defaultNotificationPreferences } from "./notification-engine";

// Same isolation convention as companion-store.ts (.data/dajeong/*) — kept in its own file so a
// notification-store bug can never touch companion/shared-plan data, and vice versa.
const DATA_DIR = join(process.cwd(), ".data", "dajeong");
const STORE_FILE = join(DATA_DIR, "notifications.json");

export type RegisteredPlan = { plan: DajeongPlan; ownerId: string; updatedAt: string };

type Store = {
  subscriptions: Record<string, PushSubscriptionRecord[]>;
  preferences: Record<string, NotificationPreferences>;
  notifications: Record<string, DajeongNotification>;
  registeredPlans: Record<string, RegisteredPlan>;
  weatherDigests: Record<string, WeatherDigestEntry[]>;
  discoveryDigests: Record<string, string[]>;
};

function defaultStore(): Store {
  return { subscriptions: {}, preferences: {}, notifications: {}, registeredPlans: {}, weatherDigests: {}, discoveryDigests: {} };
}

function normalizeStore(raw: Partial<Store>): Store {
  const base = defaultStore();
  return {
    subscriptions: raw.subscriptions ?? base.subscriptions,
    preferences: raw.preferences ?? base.preferences,
    notifications: raw.notifications ?? base.notifications,
    registeredPlans: raw.registeredPlans ?? base.registeredPlans,
    weatherDigests: raw.weatherDigests ?? base.weatherDigests,
    discoveryDigests: raw.discoveryDigests ?? base.discoveryDigests,
  };
}

async function loadStore(): Promise<Store> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(STORE_FILE, "utf8");
    return normalizeStore(JSON.parse(raw) as Partial<Store>);
  } catch {
    const store = defaultStore();
    await saveStore(store);
    return store;
  }
}

async function saveStore(store: Store): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(STORE_FILE, JSON.stringify(store, null, 2));
  } catch {
    // read-only FS on some hosts — in-memory only for this request, same tradeoff as companion-store.ts
  }
}

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

// ── Preferences ──────────────────────────────────────────────────────────

export async function getPreferences(personId: string): Promise<NotificationPreferences> {
  const store = await loadStore();
  return store.preferences[personId] ?? defaultNotificationPreferences(personId);
}

export async function setPreferences(
  personId: string,
  update: Partial<Omit<NotificationPreferences, "personId" | "updatedAt" | "quietHours" | "categories">> & {
    categories?: Partial<NotificationPreferences["categories"]>;
    quietHours?: NotificationPreferences["quietHours"] | null;
  },
): Promise<NotificationPreferences> {
  const store = await loadStore();
  const current = store.preferences[personId] ?? defaultNotificationPreferences(personId);
  const next: NotificationPreferences = {
    ...current,
    ...update,
    categories: { ...current.categories, ...(update.categories ?? {}) },
    // undefined = "field not sent, keep current"; null = "explicitly clear" (a plain spread
    // can't tell those apart, since an undefined value doesn't override the existing one).
    quietHours: update.quietHours === undefined ? current.quietHours : update.quietHours === null ? undefined : update.quietHours,
    personId,
    updatedAt: new Date().toISOString(),
  };
  store.preferences[personId] = next;
  await saveStore(store);
  return next;
}

// ── Push subscriptions ───────────────────────────────────────────────────

export async function addSubscription(personId: string, endpoint: string, keys: PushSubscriptionRecord["keys"], userAgent?: string): Promise<PushSubscriptionRecord> {
  const store = await loadStore();
  const existing = store.subscriptions[personId] ?? [];
  const withoutDuplicate = existing.filter((entry) => entry.endpoint !== endpoint);
  const record: PushSubscriptionRecord = { id: newId("push"), personId, endpoint, keys, userAgent, createdAt: new Date().toISOString() };
  store.subscriptions[personId] = [...withoutDuplicate, record].slice(-10);
  await saveStore(store);
  return record;
}

export async function removeSubscription(personId: string, endpoint: string): Promise<void> {
  const store = await loadStore();
  store.subscriptions[personId] = (store.subscriptions[personId] ?? []).filter((entry) => entry.endpoint !== endpoint);
  await saveStore(store);
}

/** Called on logout/account switch so a device that no longer represents this person stops
 * receiving anything tied to their plans — see identity-guard's reasoning for why this matters
 * once real accounts exist. */
export async function removeAllSubscriptionsForPerson(personId: string): Promise<void> {
  const store = await loadStore();
  delete store.subscriptions[personId];
  await saveStore(store);
}

export async function listSubscriptions(personId: string): Promise<PushSubscriptionRecord[]> {
  const store = await loadStore();
  return store.subscriptions[personId] ?? [];
}

export async function removeSubscriptionById(personId: string, subscriptionId: string): Promise<void> {
  const store = await loadStore();
  store.subscriptions[personId] = (store.subscriptions[personId] ?? []).filter((entry) => entry.id !== subscriptionId);
  await saveStore(store);
}

// ── Registered solo plans (for proactive scheduling of non-shared plans) ───

export async function registerPlanForNotifications(plan: DajeongPlan, ownerId: string): Promise<void> {
  const store = await loadStore();
  store.registeredPlans[plan.id] = { plan, ownerId, updatedAt: new Date().toISOString() };
  await saveStore(store);
}

export async function unregisterPlan(planId: string): Promise<void> {
  const store = await loadStore();
  delete store.registeredPlans[planId];
  delete store.weatherDigests[planId];
  delete store.discoveryDigests[planId];
  await saveStore(store);
}

export async function listRegisteredPlans(): Promise<RegisteredPlan[]> {
  const store = await loadStore();
  return Object.values(store.registeredPlans);
}

export async function getRegisteredPlan(planId: string): Promise<RegisteredPlan | null> {
  const store = await loadStore();
  return store.registeredPlans[planId] ?? null;
}

// ── Weather digest (change-detection baseline) ──────────────────────────

export async function getWeatherDigest(planId: string): Promise<WeatherDigestEntry[]> {
  const store = await loadStore();
  return store.weatherDigests[planId] ?? [];
}

export async function setWeatherDigest(planId: string, digest: WeatherDigestEntry[]): Promise<void> {
  const store = await loadStore();
  store.weatherDigests[planId] = digest;
  await saveStore(store);
}

// ── Discovery digest (which discovery item ids we've already notified about) ───────────

export async function getDiscoveryDigest(planId: string): Promise<string[]> {
  const store = await loadStore();
  return store.discoveryDigests[planId] ?? [];
}

export async function setDiscoveryDigest(planId: string, notifiedIds: string[]): Promise<void> {
  const store = await loadStore();
  store.discoveryDigests[planId] = notifiedIds;
  await saveStore(store);
}

// ── Notifications ────────────────────────────────────────────────────────

/**
 * Reconciles freshly computed drafts against what is already scheduled for this person, so a
 * recompute never stacks duplicate reminders for the same event: an unchanged draft is left
 * alone, a changed one supersedes its predecessor, and a scheduled row whose dedupe key is no
 * longer among the drafts (the trigger stopped applying — item done, prep completed, deleted)
 * gets cancelled outright.
 */
export async function reconcileNotifications(params: {
  planId: string;
  planVersion: number;
  targetPersonId: string;
  drafts: NotificationDraft[];
}): Promise<DajeongNotification[]> {
  const store = await loadStore();
  const now = new Date().toISOString();
  const existingForPerson = Object.values(store.notifications).filter(
    (entry) => entry.planId === params.planId && entry.targetPersonId === params.targetPersonId && entry.status === "scheduled",
  );
  const existingByKey = new Map(existingForPerson.map((entry) => [entry.dedupeKey, entry]));
  const draftKeys = new Set(params.drafts.map((draft) => draft.dedupeKey));
  const created: DajeongNotification[] = [];

  for (const draft of params.drafts) {
    const existing = existingByKey.get(draft.dedupeKey);
    if (existing && existing.title === draft.title && existing.body === draft.body && existing.scheduledFor === draft.scheduledFor && existing.planVersion === params.planVersion) {
      created.push(existing);
      continue;
    }
    const record: DajeongNotification = {
      id: newId("notif"),
      planId: params.planId,
      planVersion: params.planVersion,
      targetPersonId: params.targetPersonId,
      kind: draft.kind,
      priority: draft.priority,
      status: "scheduled",
      dedupeKey: draft.dedupeKey,
      scheduledFor: draft.scheduledFor,
      title: draft.title,
      body: draft.body,
      privacyAtSend: draft.privacyAtSend,
      deepLink: draft.deepLink,
      relatedItemId: draft.relatedItemId,
      createdAt: now,
      updatedAt: now,
    };
    if (existing) {
      store.notifications[existing.id] = { ...existing, status: "superseded", supersededBy: record.id, updatedAt: now };
    }
    store.notifications[record.id] = record;
    created.push(record);
  }

  for (const stale of existingForPerson) {
    if (!draftKeys.has(stale.dedupeKey)) {
      store.notifications[stale.id] = { ...stale, status: "cancelled", updatedAt: now };
    }
  }

  await saveStore(store);
  return created;
}

export async function dueNotifications(now: Date): Promise<DajeongNotification[]> {
  const store = await loadStore();
  return Object.values(store.notifications).filter((entry) => entry.status === "scheduled" && new Date(entry.scheduledFor).getTime() <= now.getTime());
}

export async function markSent(id: string): Promise<void> {
  const store = await loadStore();
  const entry = store.notifications[id];
  if (!entry) return;
  store.notifications[id] = { ...entry, status: "sent", sentAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await saveStore(store);
}

export async function markFailed(id: string, reason: string): Promise<void> {
  const store = await loadStore();
  const entry = store.notifications[id];
  if (!entry) return;
  store.notifications[id] = { ...entry, status: "failed", failureReason: reason, updatedAt: new Date().toISOString() };
  await saveStore(store);
}

export async function listNotificationsForPerson(personId: string, limit = 30): Promise<DajeongNotification[]> {
  const store = await loadStore();
  return Object.values(store.notifications)
    .filter((entry) => entry.targetPersonId === personId && entry.status !== "cancelled" && entry.status !== "superseded")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}
