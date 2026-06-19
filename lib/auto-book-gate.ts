import type { RequestStatus } from "./booking-policy";
import {
  DEFAULT_HYBRID_AUTO_PRIORITIES,
  type SchedulingMode,
  type ShopBookingSettings,
} from "./booking-settings";
import type { FieldConfidence } from "./call-intake/types";
import type { JobPriority } from "./types";

/** Minimum field confidence (0–100) to auto-confirm without owner review. */
export const AUTO_BOOK_CONFIDENCE_MIN = 70;

export type BookingGate = "auto_confirm" | "needs_review" | "urgent_review";

export function confidenceMin(confidence: FieldConfidence): number {
  return Math.min(
    confidence.customerName,
    confidence.address,
    confidence.serviceLocation,
    confidence.issueType,
  );
}

export function isAmbiguousIntake(params: {
  confidenceMin: number;
  customerName?: string | null;
  address?: string | null;
}): boolean {
  const name = params.customerName?.trim() ?? "";
  const address = params.address?.trim() ?? "";
  if (params.confidenceMin < AUTO_BOOK_CONFIDENCE_MIN) return true;
  if (!name || name === "Unknown" || name.length < 2) return true;
  if (!address || address === "Unknown" || address.length < 8) return true;
  return false;
}

/**
 * Default: auto-confirm to calendar. Exceptions: P1 urgent, ambiguous info, manual mode.
 */
export function resolveBookingGate(params: {
  mode: SchedulingMode;
  priority: JobPriority;
  confidenceMin: number;
  customerName?: string | null;
  address?: string | null;
  hybridAutoPriorities?: JobPriority[];
}): BookingGate {
  if (params.mode === "control") return "needs_review";

  if (params.priority === "P1") return "urgent_review";

  if (
    isAmbiguousIntake({
      confidenceMin: params.confidenceMin,
      customerName: params.customerName,
      address: params.address,
    })
  ) {
    return "needs_review";
  }

  if (params.mode === "speed") return "auto_confirm";

  const auto = params.hybridAutoPriorities ?? DEFAULT_HYBRID_AUTO_PRIORITIES;
  return auto.includes(params.priority) ? "auto_confirm" : "needs_review";
}

export function gateNeedsOwnerApproval(gate: BookingGate): boolean {
  return gate === "needs_review" || gate === "urgent_review";
}

export function statusForGate(gate: BookingGate, hasSlot: boolean): RequestStatus {
  if (gate === "auto_confirm") return hasSlot ? "scheduled" : "approved";
  return "pending_review";
}

export function resolveBookingGateFromSettings(
  settings: Pick<ShopBookingSettings, "schedulingMode" | "hybridAutoPriorities">,
  params: {
    priority: JobPriority;
    confidence: FieldConfidence;
    customerName?: string | null;
    address?: string | null;
  },
): BookingGate {
  return resolveBookingGate({
    mode: settings.schedulingMode,
    priority: params.priority,
    confidenceMin: confidenceMin(params.confidence),
    customerName: params.customerName,
    address: params.address,
    hybridAutoPriorities: settings.hybridAutoPriorities,
  });
}
