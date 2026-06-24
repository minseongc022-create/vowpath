import type { RequestStatus } from "@/lib/booking-policy";
import type { CallRecord } from "@/lib/dashboard-data-client";
import type { JobCard } from "@/lib/types";

const CACHE_KEY = "vowroad:dashboard-snapshot";
const MAX_AGE_MS = 30 * 60 * 1000;

export type DashboardSnapshot = {
  at: number;
  heroCalls: CallRecord[];
  heroJobs: JobCard[];
  requestStatuses: Record<string, RequestStatus>;
};

export function readDashboardSnapshot(): DashboardSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardSnapshot;
    if (!parsed?.at || Date.now() - parsed.at > MAX_AGE_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeDashboardSnapshot(snapshot: Omit<DashboardSnapshot, "at">) {
  if (typeof window === "undefined") return;
  try {
    const payload: DashboardSnapshot = { ...snapshot, at: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or private mode — ignore.
  }
}
