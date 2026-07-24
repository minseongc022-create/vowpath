import type { JobPriority } from "./types";

/** Below this min field confidence (0–100), slot is held for owner review. */
export const AUTO_BOOK_CONFIDENCE_MIN = 65;

/** Restoration loss type — drives dispatch hold vs auto-dispatch. */
export type LossCategory =
  | "water"
  | "fire"
  | "mold"
  | "sewage_cat3"
  | "commercial"
  | "inspection"
  | "other";

export const OWNER_HOLD_CATEGORIES: LossCategory[] = [
  "fire",
  "sewage_cat3",
  "commercial",
];

export function normalizeLossCategory(value: unknown): LossCategory {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (
    v === "water" ||
    v === "fire" ||
    v === "mold" ||
    v === "sewage_cat3" ||
    v === "commercial" ||
    v === "inspection" ||
    v === "other"
  ) {
    return v;
  }
  if (v.includes("sewage") || v.includes("cat-3") || v.includes("cat3")) return "sewage_cat3";
  if (v.includes("fire") || v.includes("smoke")) return "fire";
  if (v.includes("mold")) return "mold";
  if (v.includes("water") || v.includes("flood") || v.includes("leak")) return "water";
  if (v.includes("commercial") || v.includes("multi-unit")) return "commercial";
  if (v.includes("inspect") || v.includes("estimate")) return "inspection";
  return "other";
}

/** Keyword fallback when AI omits lossCategory. */
export function inferLossCategoryFromText(issueType: string, symptom: string): LossCategory {
  const text = `${issueType} ${symptom}`.toLowerCase();
  if (/sewage|cat-?3|backup|contaminat/.test(text)) return "sewage_cat3";
  if (/commercial|multi-?unit|office building|warehouse/.test(text)) return "commercial";
  if (/fire|smoke|soot/.test(text)) return "fire";
  if (/mold|mildew/.test(text)) return "mold";
  if (/inspect|estimate|assessment|follow-?up|monitor/.test(text)) return "inspection";
  if (/water|flood|leak|pipe|burst|basement|ceiling/.test(text)) return "water";
  return "other";
}

export function isAmbiguousIntakeFields(params: {
  confidenceMin: number;
  customerName?: string | null;
  address?: string | null;
}): boolean {
  if (params.confidenceMin < AUTO_BOOK_CONFIDENCE_MIN) return true;
  if (params.customerName !== undefined && params.customerName !== null) {
    const name = params.customerName.trim();
    if (!name || name === "Unknown" || name.length < 2) return true;
  }
  if (params.address !== undefined && params.address !== null) {
    const address = params.address.trim();
    if (!address || address === "Unknown" || address.length < 8) return true;
    if (/^pending/i.test(address)) return true;
  }
  return false;
}

export type RestorationDispatchInput = {
  priority: JobPriority;
  lossCategory: LossCategory;
  confidenceMin?: number;
  customerName?: string | null;
  address?: string | null;
  inServiceArea?: boolean;
};

export type RestorationDispatchDecision = {
  needsOwnerApproval: boolean;
  isUrgentAlert: boolean;
  isAmbiguous: boolean;
  autoWaterDispatch: boolean;
  reasons: string[];
};

/**
 * Restoration dispatch policy:
 * - Clear P1 water → auto crew dispatch + owner FYI (not 1/2 block)
 * - Fire / Cat-3 / commercial → owner 1/2
 * - P1 mold → owner 1/2
 * - Ambiguous intake → owner 1/2
 * - Clear P2/P3 → auto-confirm
 */
export function resolveRestorationDispatchDecision(
  params: RestorationDispatchInput,
): RestorationDispatchDecision {
  const reasons: string[] = [];
  const conf = params.confidenceMin ?? 100;
  const ambiguous = isAmbiguousIntakeFields({
    confidenceMin: conf,
    customerName: params.customerName,
    address: params.address,
  });
  if (ambiguous) reasons.push("ambiguous_intake");
  if (params.inServiceArea === false) reasons.push("out_of_service_area");

  const holdCategory = OWNER_HOLD_CATEGORIES.includes(params.lossCategory);
  if (holdCategory) reasons.push(`hold_${params.lossCategory}`);

  if (params.priority === "P1" && params.lossCategory === "mold") {
    reasons.push("p1_mold_hold");
  }

  const clearP1Water =
    params.priority === "P1" &&
    params.lossCategory === "water" &&
    !ambiguous &&
    params.inServiceArea !== false;

  if (clearP1Water) {
    return {
      needsOwnerApproval: false,
      isUrgentAlert: true,
      isAmbiguous: false,
      autoWaterDispatch: true,
      reasons: ["clear_p1_water_auto_dispatch"],
    };
  }

  if (holdCategory || (params.priority === "P1" && params.lossCategory === "mold")) {
    return {
      needsOwnerApproval: true,
      isUrgentAlert: params.priority === "P1",
      isAmbiguous: ambiguous,
      autoWaterDispatch: false,
      reasons,
    };
  }

  if (ambiguous || params.inServiceArea === false) {
    return {
      needsOwnerApproval: true,
      isUrgentAlert: params.priority === "P1",
      isAmbiguous: ambiguous,
      autoWaterDispatch: false,
      reasons,
    };
  }

  return {
    needsOwnerApproval: false,
    isUrgentAlert: params.priority === "P1",
    isAmbiguous: false,
    autoWaterDispatch: false,
    reasons: params.priority === "P1" ? ["p1_fyi"] : ["auto_confirm"],
  };
}
