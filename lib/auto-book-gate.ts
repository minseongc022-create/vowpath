import type { RequestStatus } from "./booking-policy";
import type { FieldConfidence } from "./call-intake/types";
import type { JobPriority } from "./types";
import {
  inferLossCategoryFromText,
  normalizeLossCategory,
  resolveRestorationDispatchDecision,
  AUTO_BOOK_CONFIDENCE_MIN,
  isAmbiguousIntakeFields,
  type LossCategory,
} from "./loss-category.js";

export { AUTO_BOOK_CONFIDENCE_MIN } from "./loss-category.js";

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
  return isAmbiguousIntakeFields(params);
}

/** Restoration smart dispatch gate. */
export function resolveBookingGate(params: {
  priority: JobPriority;
  confidenceMin: number;
  customerName?: string | null;
  address?: string | null;
  lossCategory?: LossCategory | string | null;
  issueType?: string | null;
  symptom?: string | null;
  inServiceArea?: boolean;
}): BookingGate {
  const lossCategory =
    params.lossCategory != null
      ? normalizeLossCategory(params.lossCategory)
      : inferLossCategoryFromText(
          params.issueType?.trim() ?? "",
          params.symptom?.trim() ?? "",
        );

  const decision = resolveRestorationDispatchDecision({
    priority: params.priority,
    lossCategory,
    confidenceMin: params.confidenceMin,
    customerName: params.customerName,
    address: params.address,
    inServiceArea: params.inServiceArea,
  });

  if (decision.needsOwnerApproval) {
    return decision.isUrgentAlert ? "urgent_review" : "needs_review";
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
    lossCategory?: LossCategory | string | null;
    issueType?: string | null;
    symptom?: string | null;
    inServiceArea?: boolean;
  },
): BookingGate {
  return resolveBookingGate({
    priority: params.priority,
    confidenceMin: confidenceMin(params.confidence),
    customerName: params.customerName,
    address: params.address,
    lossCategory: params.lossCategory,
    issueType: params.issueType,
    symptom: params.symptom,
    inServiceArea: params.inServiceArea,
  });
}
