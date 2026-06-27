import type { JobPriority } from "./types";
import {
  inferLossCategoryFromText,
  normalizeLossCategory,
  resolveRestorationDispatchDecision,
  AUTO_BOOK_CONFIDENCE_MIN,
  type LossCategory,
} from "./loss-category.js";

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
