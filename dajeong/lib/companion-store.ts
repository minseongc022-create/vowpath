import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type { CompanionInvite, CompanionLink, CompanionRelationLabel, DajeongPlan, PacePreference } from "./types";

const DATA_DIR = join(process.cwd(), ".data", "dajeong");
const STORE_FILE = join(DATA_DIR, "companions.json");
const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type SharedPlanRecord = {
  planId: string;
  ownerId: string;
  ownerName: string;
  companionId: string;
  companionName: string;
  plan: DajeongPlan;
  version: number;
  updatedAt: string;
};

type Store = {
  people: Record<string, { id: string; name: string; updatedAt: string }>;
  links: CompanionLink[];
  invites: CompanionInvite[];
  sharedPlans: Record<string, SharedPlanRecord>;
  pace: Record<string, PacePreference>;
};

function defaultStore(): Store {
  return { people: {}, links: [], invites: [], sharedPlans: {}, pace: {} };
}

function normalizeStore(raw: Partial<Store>): Store {
  const base = defaultStore();
  return {
    people: raw.people ?? base.people,
    links: raw.links ?? base.links,
    invites: raw.invites ?? base.invites,
    sharedPlans: raw.sharedPlans ?? base.sharedPlans,
    pace: raw.pace ?? base.pace,
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
    // read-only FS on some hosts — in-memory only for this request
  }
}

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function newInviteCode(): string {
  // 4 bytes (8 hex chars, 32 bits) — resistant enough to guessing for a short-lived,
  // single-use, per-owner-capped invite without adding real auth.
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function upsertPerson(id: string, name: string): Promise<void> {
  const store = await loadStore();
  store.people[id] = { id, name: name.trim().slice(0, 20) || "나", updatedAt: new Date().toISOString() };
  await saveStore(store);
}

export async function createInvite(fromId: string, fromName: string, relationLabel: CompanionRelationLabel, note?: string): Promise<CompanionInvite> {
  const store = await loadStore();
  const invite: CompanionInvite = {
    code: newInviteCode(),
    fromId,
    fromName: fromName.trim().slice(0, 20) || "나",
    relationLabel,
    note: note?.trim().slice(0, 80) || undefined,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    status: "pending",
  };
  store.invites = [invite, ...store.invites.filter((entry) => entry.fromId !== fromId || entry.status !== "pending")].slice(0, 200);
  await saveStore(store);
  return invite;
}

export async function listInvitesFrom(personId: string): Promise<CompanionInvite[]> {
  const store = await loadStore();
  const now = Date.now();
  return store.invites.filter((invite) => invite.fromId === personId && invite.status === "pending" && new Date(invite.expiresAt).getTime() > now);
}

export async function findLink(aId: string, bId: string): Promise<CompanionLink | null> {
  const store = await loadStore();
  return store.links.find((link) => link.memberIds.includes(aId) && link.memberIds.includes(bId)) ?? null;
}

export async function acceptInvite(code: string, accepterId: string, accepterName: string): Promise<{ link: CompanionLink } | { error: string }> {
  const store = await loadStore();
  const invite = store.invites.find((entry) => entry.code === code.trim().toUpperCase());
  if (!invite) return { error: "초대 코드를 찾지 못했어요." };
  if (invite.status !== "pending") return { error: "이미 사용됐거나 취소된 초대예요." };
  if (new Date(invite.expiresAt).getTime() < Date.now()) return { error: "초대 코드가 만료됐어요. 새 초대를 받아주세요." };
  if (invite.fromId === accepterId) return { error: "자기 자신을 동반자로 연결할 수 없어요." };
  const existing = store.links.find((link) => link.memberIds.includes(invite.fromId) && link.memberIds.includes(accepterId));
  if (existing) {
    invite.status = "accepted";
    invite.acceptedBy = accepterId;
    await saveStore(store);
    return { link: existing };
  }
  const link: CompanionLink = {
    id: newId("link"),
    memberIds: [invite.fromId, accepterId],
    memberNames: [invite.fromName, accepterName.trim().slice(0, 20) || "동반자"],
    relationLabel: invite.relationLabel,
    createdAt: new Date().toISOString(),
  };
  store.links.push(link);
  invite.status = "accepted";
  invite.acceptedBy = accepterId;
  store.people[accepterId] = { id: accepterId, name: link.memberNames[1], updatedAt: new Date().toISOString() };
  await saveStore(store);
  return { link };
}

export async function listCompanions(personId: string): Promise<Array<{ link: CompanionLink; companionId: string; companionName: string }>> {
  const store = await loadStore();
  return store.links
    .filter((link) => link.memberIds.includes(personId))
    .map((link) => {
      const index = link.memberIds[0] === personId ? 1 : 0;
      return { link, companionId: link.memberIds[index], companionName: link.memberNames[index] };
    });
}

export async function removeCompanion(linkId: string, actorId: string): Promise<boolean> {
  const store = await loadStore();
  const link = store.links.find((entry) => entry.id === linkId);
  if (!link || !link.memberIds.includes(actorId)) return false;
  store.links = store.links.filter((entry) => entry.id !== linkId);
  const removedPlans = Object.values(store.sharedPlans).filter((record) =>
    (record.ownerId === link.memberIds[0] && record.companionId === link.memberIds[1]) ||
    (record.ownerId === link.memberIds[1] && record.companionId === link.memberIds[0]));
  removedPlans.forEach((record) => { delete store.sharedPlans[record.planId]; });
  await saveStore(store);
  return true;
}

function paceKey(personId: string, companionKey: string): string {
  return `${personId}::${companionKey}`;
}

export async function getPace(personId: string, companionKey: string): Promise<PacePreference | null> {
  const store = await loadStore();
  return store.pace[paceKey(personId, companionKey)] ?? null;
}

export async function upsertPace(personId: string, companionKey: string, update: { density?: PacePreference["density"]; placesPerDay?: number; notes?: string[] }): Promise<PacePreference> {
  const store = await loadStore();
  const key = paceKey(personId, companionKey);
  const current = store.pace[key];
  const next: PacePreference = {
    personId,
    companionKey,
    density: update.density ?? current?.density,
    placesPerDay: update.placesPerDay ?? current?.placesPerDay,
    notes: Array.from(new Set([...(current?.notes ?? []), ...(update.notes ?? [])])).slice(-20),
    updatedAt: new Date().toISOString(),
  };
  store.pace[key] = next;
  await saveStore(store);
  return next;
}

export async function getSharedPlanRecord(planId: string): Promise<SharedPlanRecord | null> {
  const store = await loadStore();
  return store.sharedPlans[planId] ?? null;
}

export async function listSharedWithMe(viewerId: string): Promise<SharedPlanRecord[]> {
  const store = await loadStore();
  return Object.values(store.sharedPlans)
    .filter((record) => record.companionId === viewerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listMySharedPlans(ownerId: string): Promise<SharedPlanRecord[]> {
  const store = await loadStore();
  return Object.values(store.sharedPlans)
    .filter((record) => record.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function shareplan(plan: DajeongPlan, ownerId: string, ownerName: string, companionId: string, companionName: string): Promise<{ ok: true; record: SharedPlanRecord } | { error: string }> {
  const link = await findLink(ownerId, companionId);
  if (!link) return { error: "연결된 동반자가 아니에요. 먼저 동반자를 연결해 주세요." };
  const store = await loadStore();
  const record: SharedPlanRecord = {
    planId: plan.id,
    ownerId,
    ownerName,
    companionId,
    companionName,
    plan: { ...plan, ownerId, ownerName, planKind: "shared", companionId, companionName },
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  store.sharedPlans[plan.id] = record;
  await saveStore(store);
  return { ok: true, record };
}

export async function unshareplan(planId: string, actorId: string): Promise<boolean> {
  const store = await loadStore();
  const record = store.sharedPlans[planId];
  if (!record || record.ownerId !== actorId) return false;
  delete store.sharedPlans[planId];
  await saveStore(store);
  return true;
}

export async function publishSharedPlan(
  planId: string,
  actorId: string,
  updater: (current: DajeongPlan) => DajeongPlan,
  expectedVersion?: number,
): Promise<{ ok: true; record: SharedPlanRecord } | { ok: false; error: string; conflict?: SharedPlanRecord }> {
  const store = await loadStore();
  const record = store.sharedPlans[planId];
  // Deliberately the same message whether the plan doesn't exist or the caller just isn't a
  // participant — distinguishing the two would let a client enumerate valid plan IDs.
  if (!record || (record.ownerId !== actorId && record.companionId !== actorId)) return { ok: false, error: "이 계획을 찾을 수 없어요." };
  if (expectedVersion != null && expectedVersion !== record.version) {
    return { ok: false, error: "다른 사람이 방금 이 계획을 바꿨어요. 최신 내용을 다시 확인해 주세요.", conflict: record };
  }
  const nextPlan = updater(record.plan);
  const nextRecord: SharedPlanRecord = {
    ...record,
    plan: { ...nextPlan, planKind: "shared", ownerId: record.ownerId, ownerName: record.ownerName, companionId: record.companionId, companionName: record.companionName },
    version: record.version + 1,
    updatedAt: new Date().toISOString(),
  };
  store.sharedPlans[planId] = nextRecord;
  await saveStore(store);
  return { ok: true, record: nextRecord };
}
