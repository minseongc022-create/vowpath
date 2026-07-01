import type { JobPriority } from "./types";
import type { ShopVertical } from "./shop-vertical.js";
import { isAmbiguousIntakeFields } from "./loss-category.js";
import { getVerticalConfig } from "./vertical-config.js";

export type HomeServicesDispatchDecision = {
  needsOwnerApproval: boolean;
  isUrgentAlert: boolean;
  isAmbiguous: boolean;
  autoDispatch: boolean;
  reasons: string[];
};

export type HomeServicesDispatchInput = {
  vertical: ShopVertical;
  priority: JobPriority;
  confidenceMin?: number;
  issueType?: string | null;
  symptom?: string | null;
  customerName?: string | null;
  address?: string | null;
  inServiceArea?: boolean;
};

/**
 * Non-restoration home service dispatch.
 * - Safety patterns (gas/sparking/etc.) → always owner hold, urgent
 * - P1 + matches autoP1Patterns + verified address + confidence≥65 → auto dispatch
 * - Ambiguous intake → hold
 * - P2/P3 clear → auto confirm
 */
export function resolveHomeServicesDispatchDecision(
  params: HomeServicesDispatchInput,
): HomeServicesDispatchDecision {
  const reasons: string[] = [];
  const conf = params.confidenceMin ?? 100;
  const ambiguous = isAmbiguousIntakeFields({
    confidenceMin: conf,
    customerName: params.customerName,
    address: params.address,
  });
  if (ambiguous) reasons.push("ambiguous_intake");
  if (params.inServiceArea === false) reasons.push("out_of_service_area");

  const cfg = getVerticalConfig(params.vertical);
  const issueText = `${params.issueType ?? ""} ${params.symptom ?? ""}`.trim();

  const isSafetyHold = cfg.dispatchPolicy.holdPatterns.test(issueText);
  if (isSafetyHold) {
    return {
      needsOwnerApproval: true,
      isUrgentAlert: true,
      isAmbiguous: ambiguous,
      autoDispatch: false,
      reasons: [...reasons, `safety_hold_${params.vertical}`],
    };
  }

  if (ambiguous || params.inServiceArea === false) {
    return {
      needsOwnerApproval: true,
      isUrgentAlert: params.priority === "P1",
      isAmbiguous: ambiguous,
      autoDispatch: false,
      reasons,
    };
  }

  const autoPattern = cfg.dispatchPolicy.autoP1Patterns;
  const isAutoP1 =
    params.priority === "P1" &&
    autoPattern !== null &&
    autoPattern.test(issueText);

  if (isAutoP1) {
    return {
      needsOwnerApproval: false,
      isUrgentAlert: true,
      isAmbiguous: false,
      autoDispatch: true,
      reasons: [`p1_${params.vertical}_auto_dispatch`],
    };
  }

  return {
    needsOwnerApproval: false,
    isUrgentAlert: params.priority === "P1",
    isAmbiguous: false,
    autoDispatch: false,
    reasons: params.priority === "P1" ? ["p1_fyi"] : ["auto_confirm"],
  };
}
