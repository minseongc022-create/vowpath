import type { JobCard, ShopState } from "./types";

export const SHOP_STORAGE_KEY = "nightcall_shop";
export const JOBS_STORAGE_KEY = "nightcall_jobs";

const defaultShop: ShopState = {
  scheduleWindows: [],
  answerScheduleActive: false,
  jobberConnected: false,
  forwardingDone: false,
  onboardingComplete: false,
};

export function getDefaultShopState(): ShopState {
  return { ...defaultShop, scheduleWindows: [] };
}

export function readShopState(): ShopState {
  if (typeof window === "undefined") return getDefaultShopState();
  try {
    const raw = localStorage.getItem(SHOP_STORAGE_KEY);
    if (!raw) return getDefaultShopState();
    const parsed = { ...getDefaultShopState(), ...JSON.parse(raw) } as ShopState;
    if (
      parsed.scheduleWindows.length > 0 &&
      (parsed as { answerScheduleActive?: boolean }).answerScheduleActive === undefined
    ) {
      parsed.answerScheduleActive = true;
    }
    return parsed;
  } catch {
    return getDefaultShopState();
  }
}

export function writeShopState(state: ShopState) {
  localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify(state));
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
