import type { JobPriority } from "./types";
import type { ShopVertical } from "./shop-vertical.js";
import { isRestorationVertical } from "./shop-vertical.js";
import {
  inferLossCategoryFromText,
  normalizeLossCategory,
  resolveRestorationDispatchDecision,
  AUTO_BOOK_CONFIDENCE_MIN,
  type LossCategory,
} from "./loss-category.js";
import {
  resolveHomeServicesDispatchDecision,
  type HomeServicesDispatchDecision,
} from "./home-services-issue.js";

export { AUTO_BOOK_CONFIDENCE_MIN } from "./loss-category.js";

export type AutoBookDecision = {
  needsOwnerApproval: boolean;
  isUrgentAlert: boolean;
  isAmbiguous: boolean;
  autoWaterDispatch: boolean;
  lossCategory: LossCategory;
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

export function resolveAutoBookDecision(params: {
  priority: JobPriority;
  confidenceMin?: number;
  lossCategory?: LossCategory | string | null;
  issueType?: string | null;
  symptom?: string | null;
  customerName?: string | null;
  address?: string | null;
  inServiceArea?: boolean;
}): AutoBookDecision {
  const lossCategory =
    params.lossCategory != null
      ? normalizeLossCategory(params.lossCategory)
      : inferLossCategoryFromText(
          params.issueType?.trim() ?? "",
          params.symptom?.trim() ?? "",
        );

  const restoration = resolveRestorationDispatchDecision({
    priority: params.priority,
    lossCategory,
    confidenceMin: params.confidenceMin,
    customerName: params.customerName,
    address: params.address,
    inServiceArea: params.inServiceArea,
  });

  return {
    needsOwnerApproval: restoration.needsOwnerApproval,
    isUrgentAlert: restoration.isUrgentAlert,
    isAmbiguous: restoration.isAmbiguous,
    autoWaterDispatch: restoration.autoWaterDispatch,
    lossCategory,
    reasons: restoration.reasons,
  };
}

export function shouldOwnerApproveAfterCustomerSlotPick(params: {
  priority: JobPriority;
  confidenceMin?: number;
  lossCategory?: LossCategory | string | null;
  issueType?: string | null;
  symptom?: string | null;
  customerName?: string | null;
  address?: string | null;
  inServiceArea?: boolean;
}): boolean {
  return resolveAutoBookDecision(params).needsOwnerApproval;
}

/** Vertical-aware: HVAC P1 no-heat can auto-book; gas/spark always holds. */
export function shouldOwnerApproveAfterCustomerSlotPickForVertical(
  vertical: ShopVertical,
  params: {
    priority: JobPriority;
    confidenceMin?: number;
    lossCategory?: LossCategory | string | null;
    issueType?: string | null;
    symptom?: string | null;
    customerName?: string | null;
    address?: string | null;
    inServiceArea?: boolean;
  },
): boolean {
  return resolveAutoBookDecisionForVertical(vertical, params).needsOwnerApproval;
}

export function shouldSendOwnerApprovalSms(
  level: "off" | "p1_only" | "all",
  priority: JobPriority,
  confidenceMin?: number,
  lossCategory?: LossCategory | string | null,
): boolean {
  const decision = resolveAutoBookDecision({ priority, confidenceMin, lossCategory });
  if (decision.needsOwnerApproval) return true;
  if (level === "off") return false;
  if (decision.isUrgentAlert) return true;
  if (level === "all") return true;
  return false;
}

/**
 * Vertical-aware auto-book decision.
 * Restoration → existing resolveAutoBookDecision (regression-safe).
 * Other verticals → home-services dispatch with vertical-specific policy.
 */
export function resolveAutoBookDecisionForVertical(
  vertical: ShopVertical,
  params: {
    priority: JobPriority;
    confidenceMin?: number;
    lossCategory?: LossCategory | string | null;
    issueType?: string | null;
    symptom?: string | null;
    customerName?: string | null;
    address?: string | null;
    inServiceArea?: boolean;
  },
): AutoBookDecision {
  if (isRestorationVertical(vertical)) {
    return resolveAutoBookDecision(params);
  }
  const hs: HomeServicesDispatchDecision = resolveHomeServicesDispatchDecision({
    vertical,
    priority: params.priority,
    confidenceMin: params.confidenceMin,
    issueType: params.issueType,
    symptom: params.symptom,
    customerName: params.customerName,
    address: params.address,
    inServiceArea: params.inServiceArea,
  });
  const lossCategory =
    params.lossCategory != null
      ? normalizeLossCategory(params.lossCategory)
      : normalizeLossCategory("other");
  return {
    needsOwnerApproval: hs.needsOwnerApproval,
    isUrgentAlert: hs.isUrgentAlert,
    isAmbiguous: hs.isAmbiguous,
    autoWaterDispatch: hs.autoDispatch,
    lossCategory,
    reasons: hs.reasons,
  };
}
