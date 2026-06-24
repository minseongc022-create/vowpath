import { JOBS_STORAGE_KEY } from "./shop-storage";
import type { JobCard } from "./types";
import type { CallRecord } from "./operations-analytics";

const LAST_USER_KEY = "vowroad:lastUserId";

/** Clear cached jobs so another shop account never sees stale rows on a shared browser. */
export function clearTenantLocalCache(userId?: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(JOBS_STORAGE_KEY);
  if (userId) localStorage.setItem(LAST_USER_KEY, userId);
}

export function ensureTenantLocalCache(userId: string) {
  if (typeof window === "undefined") return;
  const last = localStorage.getItem(LAST_USER_KEY);
  if (last && last !== userId) {
    localStorage.removeItem(JOBS_STORAGE_KEY);
  }
  localStorage.setItem(LAST_USER_KEY, userId);
}

export async function persistJob(job: JobCard): Promise<JobCard | null> {
  try {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { job?: JobCard };
    window.dispatchEvent(new CustomEvent("vowroad:jobs-updated"));
    return data.job ?? job;
  } catch {
    return null;
  }
}

export async function migrateLocalJobsToServer(local: JobCard[]): Promise<void> {
  if (local.length === 0) return;
  await Promise.all(
    local.map((job) =>
      fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      }),
    ),
  );
}

export function notifyCallsUpdated() {
  window.dispatchEvent(new CustomEvent("vowroad:calls-updated"));
}

export function notifyJobsUpdated() {
  window.dispatchEvent(new CustomEvent("vowroad:jobs-updated"));
}

export function notifyJobberUpdated() {
  window.dispatchEvent(new CustomEvent("vowroad:jobber-updated"));
}

export function notifyTenantEventsUpdated() {
  window.dispatchEvent(new CustomEvent("vowroad:tenant-events-updated"));
}

export type { CallRecord };
