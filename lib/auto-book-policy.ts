import type { JobPriority } from "./types";

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
 * Smart auto-book (single product policy):
 * - P1 emergency → owner approval + urgent alert
 * - Low field confidence → owner approval
 * - Clear P2/P3 → auto-confirm
 */
export function resolveAutoBookDecision(params: {
  priority: JobPriority;
  confidenceMin?: number;
}): AutoBookDecision {
  const reasons: string[] = [];
  const conf = params.confidenceMin ?? 100;
  const ambiguous = conf < AUTO_BOOK_CONFIDENCE_MIN;
  if (ambiguous) reasons.push("low_confidence");

  if (params.priority === "P1") {
    return {
      needsOwnerApproval: true,
      isUrgentAlert: true,
      isAmbiguous: ambiguous,
      reasons: [...reasons, "p1_requires_owner"],
    };
  }

  return {
    needsOwnerApproval: ambiguous,
    isUrgentAlert: false,
    isAmbiguous: ambiguous,
    reasons,
  };
}

export function shouldOwnerApproveAfterCustomerSlotPick(params: {
  priority: JobPriority;
  confidenceMin?: number;
}): boolean {
  return resolveAutoBookDecision(params).needsOwnerApproval;
}

export function shouldSendOwnerApprovalSms(
  level: "off" | "p1_only" | "all",
  priority: JobPriority,
  confidenceMin?: number,
): boolean {
  const decision = resolveAutoBookDecision({ priority, confidenceMin });
  if (decision.needsOwnerApproval) return true;
  if (level === "off") return false;
  if (decision.isUrgentAlert) return true;
  if (level === "all") return true;
  return false;
}
