"use client";

import type { DajeongPlan, PlanCategory, PlanRevisionResult } from "./types";

export type PlanRole = "solo" | "owner" | "companion";

export function planRole(plan: DajeongPlan | null | undefined, myId: string): PlanRole {
  if (!plan || plan.planKind !== "shared") return "solo";
  return plan.ownerId === myId ? "owner" : "companion";
}

export type SyncResult = PlanRevisionResult & { version?: number; conflict?: boolean };

/**
 * Solo plans keep talking to the original stateless /plans/revise endpoint exactly as before.
 * Shared plans instead go through /plans/live so the server stays the one canonical copy and
 * every response comes back redacted for whichever person just asked.
 */
export async function reviseAnyPlan(
  plan: DajeongPlan,
  myId: string,
  myName: string,
  instruction: string,
  targetCategory?: PlanCategory,
  targetItemId?: string,
): Promise<SyncResult> {
  if (plan.planKind === "shared") {
    const response = await fetch("/api/dajeong/plans/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, actorId: myId, actorName: myName, instruction, targetCategory, targetItemId, expectedVersion: plan.sharedVersion }),
    });
    const data = await response.json().catch(() => ({})) as { plan?: DajeongPlan; message?: string; changedCategories?: PlanCategory[]; proposal?: PlanRevisionResult["proposal"]; version?: number; error?: string; conflict?: boolean };
    if (!response.ok) {
      if (data.conflict && data.plan) return { plan: { ...data.plan, sharedVersion: data.version }, message: data.error ?? "충돌이 발생했어요.", changedCategories: [], conflict: true, version: data.version };
      throw new Error(data.error || "계획을 조정하지 못했어요.");
    }
    if (!data.plan) throw new Error("계획을 조정하지 못했어요.");
    return { plan: { ...data.plan, sharedVersion: data.version }, message: data.message ?? "", changedCategories: data.changedCategories ?? [], proposal: data.proposal, version: data.version };
  }
  const response = await fetch("/api/dajeong/plans/revise", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, instruction, targetCategory, targetItemId }),
  });
  const data = await response.json().catch(() => ({})) as PlanRevisionResult & { error?: string };
  if (!response.ok || !data.plan) throw new Error((data as { error?: string }).error || "계획을 조정하지 못했어요.");
  return data;
}

/** Pulls the latest canonical copy for a shared plan — used on focus/visibility return and
 * light polling so two people's screens don't silently drift apart between their own edits. */
export async function fetchSharedPlan(planId: string, viewerId: string): Promise<{ plan: DajeongPlan; version: number } | null> {
  try {
    const response = await fetch(`/api/dajeong/plans/shared?planId=${encodeURIComponent(planId)}&viewerId=${encodeURIComponent(viewerId)}`);
    if (!response.ok) return null;
    const data = await response.json().catch(() => ({})) as { plan?: DajeongPlan; version?: number };
    if (!data.plan || data.version == null) return null;
    return { plan: { ...data.plan, sharedVersion: data.version }, version: data.version };
  } catch {
    return null;
  }
}

/**
 * For mutations already fully computed on the client (candidate pick, accepted route
 * proposal, confirmation) — pushes the result to the shared record if this plan is shared,
 * so both people's screens agree. No-ops for solo plans.
 */
export async function syncPlanIfShared(plan: DajeongPlan, myId: string, myName: string, summary: string): Promise<DajeongPlan> {
  if (plan.planKind !== "shared") return plan;
  try {
    const response = await fetch("/api/dajeong/plans/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, actorId: myId, actorName: myName, plan, summary, expectedVersion: plan.sharedVersion }),
    });
    const data = await response.json().catch(() => ({})) as { plan?: DajeongPlan; version?: number };
    if (!response.ok || !data.plan) return plan;
    return { ...data.plan, sharedVersion: data.version };
  } catch {
    return plan;
  }
}
