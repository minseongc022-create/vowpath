import { DEFAULT_JOB_PRIORITY, normalizeJobPriority } from "./priority-display";
import type { JobPriority } from "./types";

/** Shop-facing priority tier (stored on every request). */
export type ServicePriority = "emergency" | "normal" | "maintenance";

export type PrioritySource = "ai" | "manual";

export const SERVICE_PRIORITY_LABELS: Record<ServicePriority, string> = {
  emergency: "긴급",
  normal: "일반",
  maintenance: "정기",
};

export const SERVICE_PRIORITY_BADGE_CLASS: Record<ServicePriority, string> = {
  emergency: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80",
  normal: "bg-brand-50 text-brand-700 ring-1 ring-brand-200/80",
  maintenance: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80",
};

const LEGACY_RANK: Record<JobPriority, number> = { P1: 3, P2: 2, P3: 1 };

export function servicePriorityToLegacy(p: ServicePriority): JobPriority {
  if (p === "emergency") return "P1";
  if (p === "maintenance") return "P3";
  return "P2";
}

export function legacyToServicePriority(p: JobPriority | undefined | null): ServicePriority {
  if (p === "P1") return "emergency";
  if (p === "P3") return "maintenance";
  return "normal";
}

/** Caller DTMF / menu sets minimum urgency without replacing AI reasons. */
export function mergeMenuServicePriority(
  current: ServicePriority,
  menuPriority: JobPriority | null,
): ServicePriority {
  if (!menuPriority) return current;
  const floor = legacyToServicePriority(menuPriority);
  return LEGACY_RANK[servicePriorityToLegacy(current)] >= LEGACY_RANK[servicePriorityToLegacy(floor)]
    ? current
    : floor;
}

export function normalizeServicePriority(value: unknown): ServicePriority {
  if (value === "emergency" || value === "normal" || value === "maintenance") return value;
  return "normal";
}

export function isEmergencyServicePriority(
  p: ServicePriority | undefined | null,
  legacy?: JobPriority,
): boolean {
  if (p === "emergency") return true;
  return legacy === "P1";
}

export type PriorityFields = {
  servicePriority: ServicePriority;
  priority: JobPriority;
  priorityReasons: string[];
  prioritySource: PrioritySource;
  priorityOverriddenAt?: string;
};

export function resolvePriorityFields(input: {
  servicePriority?: ServicePriority | null;
  priority?: JobPriority | null;
  priorityReasons?: string[] | null;
  prioritySource?: PrioritySource | null;
  priorityOverriddenAt?: string | null;
}): PriorityFields {
  const priority = normalizeJobPriority(
    input.priority ??
      (input.servicePriority != null
        ? servicePriorityToLegacy(normalizeServicePriority(input.servicePriority))
        : DEFAULT_JOB_PRIORITY),
  );
  const servicePriority = legacyToServicePriority(priority);
  const reasons = Array.isArray(input.priorityReasons)
    ? input.priorityReasons.filter((r) => typeof r === "string" && r.trim()).map((r) => r.trim())
    : [];
  return {
    servicePriority,
    priority,
    priorityReasons: reasons,
    prioritySource: input.prioritySource === "manual" ? "manual" : "ai",
    priorityOverriddenAt: input.priorityOverriddenAt ?? undefined,
  };
}
