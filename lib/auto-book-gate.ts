import type { RequestStatus } from "./booking-policy";
import type { FieldConfidence } from "./call-intake/types";
import type { JobPriority } from "./types";

/** Minimum field confidence (0–100) to auto-confirm without owner review. */
export const AUTO_BOOK_CONFIDENCE_MIN = 65;

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

/** Smart auto-book: P1 → urgent review; fuzzy intake → review; else auto-confirm. */
export function resolveBookingGate(params: {
  priority: JobPriority;
  confidenceMin: number;
  customerName?: string | null;
  address?: string | null;
}): BookingGate {
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

  return "auto_confirm";
}

export function gateNeedsOwnerApproval(gate: BookingGate): boolean {
  return gate === "needs_review" || gate === "urgent_review";
}

export function statusForGate(gate: BookingGate, hasSlot: boolean): RequestStatus {
  if (gate === "auto_confirm") return hasSlot ? "scheduled" : "approved";
  return "pending_review";
}

export function resolveBookingGateFromSettings(
  _settings: unknown,
  params: {
    priority: JobPriority;
    confidence: FieldConfidence;
    customerName?: string | null;
    address?: string | null;
  },
): BookingGate {
  return resolveBookingGate({
    priority: params.priority,
    confidenceMin: confidenceMin(params.confidence),
    customerName: params.customerName,
    address: params.address,
  });
}
