import "server-only";

import { kv } from "@vercel/kv";
import { attachShare, projectPlanForViewer, type PlanActor } from "./collaboration";
import type { DajeongPlan } from "./types";

export type SharedPlanRecord = {
  token: string;
  ownerToken: string;
  ownerId: string;
  access: "viewer" | "editor";
  revision: number;
  plan: DajeongPlan;
  createdAt: string;
  updatedAt: string;
};

const memory = globalThis as typeof globalThis & { __haruonShares?: Map<string, SharedPlanRecord> };
memory.__haruonShares ??= new Map<string, SharedPlanRecord>();

function key(token: string): string { return `haruon:share:${token}`; }
function hasKv(): boolean { return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN); }

async function save(record: SharedPlanRecord): Promise<void> {
  if (hasKv()) await kv.set(key(record.token), record);
  else memory.__haruonShares!.set(record.token, record);
}

export async function getSharedPlan(token: string): Promise<SharedPlanRecord | null> {
  if (hasKv()) return await kv.get<SharedPlanRecord>(key(token));
  return memory.__haruonShares!.get(token) ?? null;
}

function randomToken(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export async function createSharedPlan(plan: DajeongPlan, owner: PlanActor, access: "viewer" | "editor", companionName?: string): Promise<SharedPlanRecord> {
  const token = randomToken("share");
  const ownerToken = randomToken("owner");
  const timestamp = new Date().toISOString();
  const shared = attachShare(plan, owner, { token, ownerToken, access, companionName });
  const record: SharedPlanRecord = { token, ownerToken, ownerId: owner.id, access, revision: 1, plan: { ...shared, collaboration: { ...shared.collaboration!, revision: 1, updatedAt: timestamp } }, createdAt: timestamp, updatedAt: timestamp };
  await save(record);
  return record;
}

export async function syncOwnerPlan(token: string, ownerToken: string, plan: DajeongPlan, baseRevision: number): Promise<{ ok: true; record: SharedPlanRecord } | { ok: false; record: SharedPlanRecord; reason: "conflict" | "forbidden" }> {
  const record = await getSharedPlan(token);
  if (!record) throw new Error("SHARE_NOT_FOUND");
  if (record.ownerToken !== ownerToken) return { ok: false, record, reason: "forbidden" };
  if (baseRevision !== record.revision) return { ok: false, record, reason: "conflict" };
  const updatedAt = new Date().toISOString();
  const revision = record.revision + 1;
  const next: SharedPlanRecord = {
    ...record,
    revision,
    updatedAt,
    plan: { ...plan, updatedAt, collaboration: { ...plan.collaboration!, revision, updatedAt, share: { ...plan.collaboration!.share!, token, ownerToken, access: record.access } } },
  };
  await save(next);
  return { ok: true, record: next };
}

export async function updateSharedPlan(record: SharedPlanRecord, plan: DajeongPlan): Promise<SharedPlanRecord> {
  const updatedAt = new Date().toISOString();
  const revision = record.revision + 1;
  const next = { ...record, revision, updatedAt, plan: { ...plan, updatedAt, collaboration: { ...plan.collaboration!, revision, updatedAt } } };
  await save(next);
  return next;
}

export function viewerPayload(record: SharedPlanRecord, actorId: string, ownerToken?: string) {
  const ownerVerified = Boolean(ownerToken && ownerToken === record.ownerToken);
  const safeActorId = !ownerVerified && actorId === record.ownerId ? "shared_guest" : actorId;
  return { plan: ownerVerified ? record.plan : projectPlanForViewer(record.plan, safeActorId), revision: record.revision, access: record.access, updatedAt: record.updatedAt };
}
