/**
 * Server-persisted shop booking / scheduling settings.
 * Customer-facing SMS/voice copy is US English; admin UI may be Korean until i18n.
 */

import type { JobPriority } from "./types";

export type SchedulingMode = "speed" | "hybrid" | "control";

export const ALL_JOB_PRIORITIES: JobPriority[] = ["P1", "P2", "P3"];

/** Hybrid default: P2/P3 auto-book; P1 stays manual until owner opts in. */
export const DEFAULT_HYBRID_AUTO_PRIORITIES: JobPriority[] = ["P2", "P3"];

export type OwnerApprovalSms = "off" | "p1_only" | "all";

export type SlotOffer = {
  id: string;
  label: string;
  startAt: string;
  endAt: string;
  source: "jobber" | "native";
};

export type ShopBookingSettings = {
  schedulingEnabled: boolean;
  schedulingMode: SchedulingMode;
  ownerApprovalSms: OwnerApprovalSms;
  undoWindowMinutes: number;
  shadowModeRemaining: number;
  jobberSchedulingEnabled: boolean;
  nativeCalendarEnabled: boolean;
  defaultDurationMinutes: number;
  slotBufferMinutes: number;
  maxVisitsPerDay: number;
  slotOfferCount: number;
  businessDayStartHour: number;
  businessDayEndHour: number;
  amWindowStart: number;
  amWindowEnd: number;
  pmWindowStart: number;
  pmWindowEnd: number;
  maxPerWindow: number;
  serviceAreaZips: string[];
  /** Hybrid only: priorities that auto-book (speed). Others need manual approval. */
  hybridAutoPriorities: JobPriority[];
};

export const DEFAULT_SHOP_BOOKING_SETTINGS: ShopBookingSettings = {
  schedulingEnabled: true,
  schedulingMode: "hybrid",
  ownerApprovalSms: "p1_only",
  undoWindowMinutes: 30,
  shadowModeRemaining: 0,
  jobberSchedulingEnabled: true,
  nativeCalendarEnabled: true,
  defaultDurationMinutes: 120,
  slotBufferMinutes: 30,
  maxVisitsPerDay: 4,
  slotOfferCount: 5,
  businessDayStartHour: 8,
  businessDayEndHour: 17,
  amWindowStart: 8,
  amWindowEnd: 12,
  pmWindowStart: 12,
  pmWindowEnd: 17,
  maxPerWindow: 1,
  serviceAreaZips: [],
  hybridAutoPriorities: DEFAULT_HYBRID_AUTO_PRIORITIES,
};

function sanitizeHybridAutoPriorities(list: JobPriority[] | undefined): JobPriority[] {
  if (!list?.length) return [];
  return ALL_JOB_PRIORITIES.filter((p) => list.includes(p));
}

function resolvedHybridAutoPriorities(
  mode: SchedulingMode,
  priorities: JobPriority[] | undefined,
): JobPriority[] {
  if (mode === "speed") return [...ALL_JOB_PRIORITIES];
  const sanitized = sanitizeHybridAutoPriorities(priorities);
  if (mode === "hybrid") {
    return sanitized.length > 0 ? sanitized : [...DEFAULT_HYBRID_AUTO_PRIORITIES];
  }
  return sanitized;
}

export function mergeShopBookingSettings(
  partial?: Partial<ShopBookingSettings> | null,
): ShopBookingSettings {
  const mode = partial?.schedulingMode ?? DEFAULT_SHOP_BOOKING_SETTINGS.schedulingMode;
  const hybridAutoPriorities = resolvedHybridAutoPriorities(
    mode,
    partial?.hybridAutoPriorities ?? DEFAULT_SHOP_BOOKING_SETTINGS.hybridAutoPriorities,
  );
  return {
    ...DEFAULT_SHOP_BOOKING_SETTINGS,
    ...partial,
    schedulingMode: mode,
    hybridAutoPriorities,
    jobberSchedulingEnabled: true,
  };
}

/** Apply mode + hybrid priority rules before persisting. */
export function coalesceSchedulingSettingsPatch(
  current: ShopBookingSettings,
  patch: Partial<ShopBookingSettings>,
): Partial<ShopBookingSettings> {
  const result = { ...patch };
  let mode = patch.schedulingMode ?? current.schedulingMode;
  let priorities =
    patch.hybridAutoPriorities !== undefined
      ? sanitizeHybridAutoPriorities(patch.hybridAutoPriorities)
      : current.hybridAutoPriorities;

  if (patch.schedulingMode === "speed") {
    mode = "speed";
    priorities = [...ALL_JOB_PRIORITIES];
  } else if (patch.schedulingMode === "control") {
    mode = "control";
  } else if (patch.schedulingMode === "hybrid") {
    mode = "hybrid";
    if (patch.hybridAutoPriorities === undefined && priorities.length === ALL_JOB_PRIORITIES.length) {
      priorities = [...DEFAULT_HYBRID_AUTO_PRIORITIES];
    }
  }

  if (patch.hybridAutoPriorities !== undefined) {
    priorities = sanitizeHybridAutoPriorities(patch.hybridAutoPriorities);
    if (priorities.length === ALL_JOB_PRIORITIES.length) {
      mode = "speed";
      priorities = [...ALL_JOB_PRIORITIES];
    } else {
      mode = "hybrid";
    }
  }

  return {
    ...result,
    schedulingMode: mode,
    hybridAutoPriorities: mode === "speed" ? [...ALL_JOB_PRIORITIES] : priorities,
  };
}

export function formatHybridAutoPriorities(
  priorities: JobPriority[],
  locale: "ko" | "en" = "ko",
): string {
  if (priorities.length === ALL_JOB_PRIORITIES.length) {
    return locale === "ko" ? "P1·P2·P3 (빠른 예약과 동일)" : "P1, P2, P3 (same as Auto Book)";
  }
  if (priorities.length === 0) {
    return locale === "ko" ? "없음 (전부 수동 승인)" : "None (all manual)";
  }
  return priorities.join(", ");
}

/** Legacy localStorage bookingMode → scheduling mode */
export function legacyBookingModeToScheduling(
  mode?: string | null,
): SchedulingMode {
  if (mode === "auto_booking") return "speed";
  if (mode === "request_only") return "control";
  return "hybrid";
}

export function shouldOwnerApproveAfterCustomerSlotPick(params: {
  mode: SchedulingMode;
  priority: JobPriority;
  hybridAutoPriorities?: JobPriority[];
  /** @deprecated Hybrid no longer uses confidence — kept for callers. */
  confidenceMin?: number;
  confidenceThreshold?: number;
}): boolean {
  if (params.mode === "control") return true;
  if (params.mode === "speed") return false;
  const auto =
    params.hybridAutoPriorities ?? DEFAULT_HYBRID_AUTO_PRIORITIES;
  return !auto.includes(params.priority);
}

export function shouldSendOwnerApprovalSms(
  level: OwnerApprovalSms,
  priority: JobPriority,
  mode?: SchedulingMode,
  hybridAutoPriorities?: JobPriority[],
): boolean {
  if (level === "off") return false;
  if (mode === "control") return true;
  if (mode === "speed") return false;
  if (mode === "hybrid") {
    const auto = hybridAutoPriorities ?? DEFAULT_HYBRID_AUTO_PRIORITIES;
    if (auto.includes(priority)) return false;
    return true;
  }
  if (level === "all") return true;
  return priority === "P1";
}
