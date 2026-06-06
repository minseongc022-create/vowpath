import type { JobPriority } from "./types";

/** UI label mapped from stored P1 / P2 / P3. */
export type PriorityDisplayLabel = "긴급" | "일반" | "정기";

export const PRIORITY_DISPLAY_LABEL: Record<JobPriority, PriorityDisplayLabel> = {
  P1: "긴급",
  P2: "일반",
  P3: "정기",
};

export const PRIORITY_BADGE_CLASS: Record<JobPriority, string> = {
  P1: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  P2: "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/30",
  P3: "bg-white/10 text-slate-400 ring-1 ring-white/10",
};

export const PRIORITY_BADGE_CLASS_LIGHT: Record<JobPriority, string> = {
  P1: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80",
  P2: "bg-brand-50 text-brand-700 ring-1 ring-brand-200/80",
  P3: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80",
};

export const DEFAULT_JOB_PRIORITY: JobPriority = "P2";

/** Normalize DB / API values; missing or invalid → P2 (Normal). */
export function normalizeJobPriority(value: unknown): JobPriority {
  if (value === "P1" || value === "P2" || value === "P3") return value;
  return DEFAULT_JOB_PRIORITY;
}

export function priorityDisplayLabel(priority: JobPriority | undefined | null): PriorityDisplayLabel {
  return PRIORITY_DISPLAY_LABEL[normalizeJobPriority(priority)];
}

export function priorityBadgeClass(
  priority: JobPriority | undefined | null,
  theme: "light" | "dark" = "dark",
): string {
  const p = normalizeJobPriority(priority);
  return theme === "light" ? PRIORITY_BADGE_CLASS_LIGHT[p] : PRIORITY_BADGE_CLASS[p];
}

export function formatPriorityWithCode(priority: JobPriority | undefined | null): string {
  const p = normalizeJobPriority(priority);
  return `${p} · ${PRIORITY_DISPLAY_LABEL[p]}`;
}
