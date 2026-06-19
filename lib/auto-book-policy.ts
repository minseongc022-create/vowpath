import type { SchedulingMode } from "./booking-settings";
import type { JobPriority } from "./types";

const HYBRID_AUTO_DEFAULT: JobPriority[] = ["P2", "P3"];

/** Below this min field confidence (0–100), slot is held for owner review. */
export const AUTO_BOOK_CONFIDENCE_MIN = 65;

export type AutoBookDecision = {
  needsOwnerApproval: boolean;
  isUrgentAlert: boolean;
  isAmbiguous: boolean;
  reasons: string[];
};

export function confidenceMinFromFields(confidence: {
  customerName: number;
  address: number;
  serviceLocation: number;
  issueType: number;
}): number {
  return Math.min(
    confidence.customerName,
    confidence.address,
    confidence.serviceLocation,
    confidence.issueType,
  );
}

/**
 * Default (speed): auto-confirm when info is clear.
 * Exceptions: low confidence → owner 1/2 before confirm.
 * P1 still lands on calendar; owner + crew get urgent SMS (not a block).
 */
export function resolveAutoBookDecision(params: {
  mode: SchedulingMode;
  priority: JobPriority;
  confidenceMin?: number;
  hybridAutoPriorities?: JobPriority[];
}): AutoBookDecision {
  const reasons: string[] = [];
  const conf = params.confidenceMin ?? 100;
  const ambiguous = conf < AUTO_BOOK_CONFIDENCE_MIN;
  if (ambiguous) reasons.push("low_confidence");

  if (params.mode === "control") {
    return {
      needsOwnerApproval: true,
      isUrgentAlert: params.priority === "P1",
      isAmbiguous: ambiguous,
      reasons: [...reasons, "manual_mode"],
    };
  }

  if (params.mode === "hybrid") {
    const auto = params.hybridAutoPriorities ?? HYBRID_AUTO_DEFAULT;
    const needsOwnerApproval = !auto.includes(params.priority) || ambiguous;
    if (!auto.includes(params.priority)) reasons.push("hybrid_priority");
    return {
      needsOwnerApproval,
      isUrgentAlert: params.priority === "P1" && !needsOwnerApproval,
      isAmbiguous: ambiguous,
      reasons,
    };
  }

  // speed (default)
  return {
    needsOwnerApproval: ambiguous,
    isUrgentAlert: params.priority === "P1",
    isAmbiguous: ambiguous,
    reasons,
  };
}

export function shouldOwnerApproveAfterCustomerSlotPick(params: {
  mode: SchedulingMode;
  priority: JobPriority;
  hybridAutoPriorities?: JobPriority[];
  confidenceMin?: number;
}): boolean {
  return resolveAutoBookDecision(params).needsOwnerApproval;
}

export function shouldSendOwnerApprovalSms(
  level: "off" | "p1_only" | "all",
  priority: JobPriority,
  mode?: SchedulingMode,
  hybridAutoPriorities?: JobPriority[],
  confidenceMin?: number,
): boolean {
  const decision = resolveAutoBookDecision({
    mode: mode ?? "speed",
    priority,
    hybridAutoPriorities,
    confidenceMin,
  });
  if (decision.needsOwnerApproval) return true;
  if (level === "off") return false;
  if (decision.isUrgentAlert) return true;
  if (level === "all") return true;
  return false;
}
