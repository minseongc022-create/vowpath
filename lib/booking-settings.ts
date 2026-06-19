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

const SLOT_BUFFER_MIN = 0;
const SLOT_BUFFER_MAX = 480;

/** Clamp gap-after-visit minutes to a safe range (0 = back-to-back allowed). */
export function normalizeSlotBufferMinutes(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 30;
  return Math.min(SLOT_BUFFER_MAX, Math.max(SLOT_BUFFER_MIN, n));
}

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
  /** How many visits the shop can run at the same time, e.g. active tech/crew count. */
  maxConcurrentVisits: number;
  slotOfferCount: number;
  businessDayStartHour: number;
  businessDayEndHour: number;
  amWindowStart: number;
  amWindowEnd: number;
  pmWindowStart: number;
  pmWindowEnd: number;
  serviceAreaZips: string[];
  /** Hybrid only: priorities that auto-book (speed). Others need manual approval. */
  hybridAutoPriorities: JobPriority[];
};

export const DEFAULT_SHOP_BOOKING_SETTINGS: ShopBookingSettings = {
  schedulingEnabled: true,
  schedulingMode: "speed",
  ownerApprovalSms: "p1_only",
  undoWindowMinutes: 30,
  shadowModeRemaining: 0,
  jobberSchedulingEnabled: true,
  nativeCalendarEnabled: true,
  defaultDurationMinutes: 120,
  slotBufferMinutes: 30,
  maxConcurrentVisits: 1,
  slotOfferCount: 5,
  businessDayStartHour: 8,
  businessDayEndHour: 17,
  amWindowStart: 8,
  amWindowEnd: 12,
  pmWindowStart: 12,
  pmWindowEnd: 17,
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
    slotBufferMinutes: normalizeSlotBufferMinutes(
      partial?.slotBufferMinutes ?? DEFAULT_SHOP_BOOKING_SETTINGS.slotBufferMinutes,
    ),
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

export {
  AUTO_BOOK_CONFIDENCE_MIN,
  confidenceMinFromFields,
  resolveAutoBookDecision,
  shouldOwnerApproveAfterCustomerSlotPick,
  shouldSendOwnerApprovalSms,
} from "./auto-book-policy";
