import { DEFAULT_BOOKING_MODE } from "./booking-policy";
import { normalizeShopVertical } from "./shop-vertical.js";
import type { AnswerWindow, JobCard, ShopState } from "./types";
import { isValidIanaTimezone } from "./us-timezone";

export const SHOP_STORAGE_KEY = "nightcall_shop";
export const JOBS_STORAGE_KEY = "nightcall_jobs";

const defaultShop: ShopState = {
  scheduleWindows: [],
  answerScheduleActive: false,
  jobberConnected: false,
  forwardingDone: false,
  onboardingComplete: false,
  bookingMode: DEFAULT_BOOKING_MODE,
};

export function getDefaultShopState(): ShopState {
  return { ...defaultShop, scheduleWindows: [] };
}

/** Drop null/invalid rows so schedule parsing never reads `.value` on garbage. */
export function sanitizeScheduleWindows(windows: unknown): AnswerWindow[] {
  if (!Array.isArray(windows)) return [];
  const out: AnswerWindow[] = [];
  for (let i = 0; i < windows.length; i++) {
    const row = windows[i];
    if (!row || typeof row !== "object") continue;
    const value = (row as AnswerWindow).value;
    const label = (row as AnswerWindow).label;
    if (typeof value !== "string" || typeof label !== "string") continue;
    const id = (row as AnswerWindow).id;
    out.push({
      id: typeof id === "string" && id.trim() ? id : `w-${i + 1}`,
      label,
      value,
    });
  }
  return out;
}

/** Coerce corrupt/null scheduleWindows so dashboard analytics never crash on `.length`. */
export function normalizeShopState(
  state?: Partial<ShopState> | null,
): ShopState {
  const base = getDefaultShopState();
  if (!state) return base;
  const merged: ShopState = {
    ...base,
    ...state,
    scheduleWindows: sanitizeScheduleWindows(state.scheduleWindows),
    vertical: state.vertical != null ? normalizeShopVertical(state.vertical) : undefined,
  };
  if (
    merged.scheduleWindows.length > 0 &&
    state.answerScheduleActive === undefined &&
    merged.answerScheduleActive === false
  ) {
    merged.answerScheduleActive = true;
  }
  if (state.shopTimezone !== undefined) {
    const tz = String(state.shopTimezone).trim();
    merged.shopTimezone =
      tz && isValidIanaTimezone(tz) ? tz : undefined;
  }
  return merged;
}

export function readShopState(): ShopState {
  if (typeof window === "undefined") return getDefaultShopState();
  try {
    const raw = localStorage.getItem(SHOP_STORAGE_KEY);
    if (!raw) return getDefaultShopState();
    const normalized = normalizeShopState(JSON.parse(raw) as Partial<ShopState>);
    const repaired = JSON.stringify(normalized);
    if (repaired !== raw) {
      localStorage.setItem(SHOP_STORAGE_KEY, repaired);
    }
    return normalized;
  } catch {
    return getDefaultShopState();
  }
}

export function writeShopState(state: ShopState) {
  localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify(normalizeShopState(state)));
}

export function readJobs(): JobCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(JOBS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as JobCard[];
  } catch {
    return [];
  }
}

export function writeJobs(jobs: JobCard[]) {
  localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
}

export function addJob(job: Omit<JobCard, "id" | "createdAt">): JobCard {
  const entry: JobCard = {
    ...job,
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `job-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  writeJobs([entry, ...readJobs()]);
  return entry;
}
