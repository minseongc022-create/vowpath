/**
 * Server-persisted shop booking / scheduling settings.
 * Customer-facing SMS/voice copy is US English; admin UI may be Korean until i18n.
 */

export type SchedulingMode = "speed" | "hybrid" | "control";

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
};

export function mergeShopBookingSettings(
  partial?: Partial<ShopBookingSettings> | null,
): ShopBookingSettings {
  return {
    ...DEFAULT_SHOP_BOOKING_SETTINGS,
    ...partial,
    jobberSchedulingEnabled: true,
  };
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
  priority: "P1" | "P2" | "P3";
  confidenceMin: number;
  confidenceThreshold?: number;
}): boolean {
  const threshold = params.confidenceThreshold ?? 85;
  if (params.mode === "control") return true;
  if (params.mode === "speed") return false;
  if (params.priority === "P1") return true;
  return params.confidenceMin < threshold;
}

export function shouldSendOwnerApprovalSms(
  level: OwnerApprovalSms,
  priority: "P1" | "P2" | "P3",
  mode?: SchedulingMode,
): boolean {
  if (level === "off") return false;
  /** Manual approval: every picked slot waits on owner — notify unless SMS is off. */
  if (mode === "control") return true;
  if (level === "all") return true;
  return priority === "P1";
}
