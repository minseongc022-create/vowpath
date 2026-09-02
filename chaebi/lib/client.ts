"use client";

import type { BriefOverrides } from "./parse";
import type { PlanSummary } from "./types";
import type { PlanView } from "./view";

/**
 * 클라이언트 → 서버 호출을 한 곳에 모은다.
 *
 * 화면마다 fetch를 흩뿌리면 에러 문구가 제각각이 된다. 이 앱에서 에러는
 * 사용자가 "AI가 다 해준다"는 약속을 의심하는 순간이라, 문구가 항상 같은
 * 톤으로 나와야 한다 — 무슨 일이 있었고, 지금 무엇을 하면 되는지.
 */

export class ChaebiApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly itemIds: string[];

  constructor(status: number, code: string, message: string, itemIds: string[] = []) {
    super(message);
    this.name = "ChaebiApiError";
    this.status = status;
    this.code = code;
    this.itemIds = itemIds;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new ChaebiApiError(0, "OFFLINE", "연결이 끊겼습니다. 잠시 후 다시 시도해 주세요.");
  }

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string; message?: string; itemIds?: string[] })
    | null;

  if (!response.ok) {
    throw new ChaebiApiError(
      response.status,
      payload?.error ?? "UNKNOWN",
      payload?.message ?? "잠시 문제가 생겼습니다. 다시 시도해 주세요.",
      payload?.itemIds ?? [],
    );
  }
  if (!payload) {
    throw new ChaebiApiError(response.status, "EMPTY", "응답이 비어 있습니다. 다시 시도해 주세요.");
  }
  return payload;
}

export function createPlan(text: string, overrides?: BriefOverrides) {
  return request<{ plan: PlanView }>("/chaebi/api/plan", {
    method: "POST",
    body: JSON.stringify({ text, overrides }),
  });
}

export function fetchPlan(id: string) {
  return request<{ plan: PlanView }>(`/chaebi/api/plan/${id}`);
}

export function updateConditions(id: string, overrides: BriefOverrides) {
  return request<{ plan: PlanView }>(`/chaebi/api/plan/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ overrides }),
  });
}

export function updateItem(id: string, itemId: string, patch: { catalogId?: string; skipped?: boolean }) {
  return request<{ plan: PlanView }>(`/chaebi/api/plan/${id}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function confirmPlanRequest(id: string) {
  return request<{ plan: PlanView }>(`/chaebi/api/plan/${id}/confirm`, { method: "POST" });
}

export function cancelPlanRequest(id: string) {
  return request<{ plan: PlanView }>(`/chaebi/api/plan/${id}`, { method: "DELETE" });
}

export function fetchPlans() {
  return request<{ plans: PlanSummary[] }>("/chaebi/api/plans");
}
