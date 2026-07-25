import type { JobPriority } from "./types";
import { legacyToServicePriority } from "./service-priority";
import { inferLossCategoryFromText, normalizeLossCategory } from "./loss-category";
import type { ShopVertical } from "./shop-vertical";
import { isRestorationVertical } from "./shop-vertical";

export type LinkUrgency = "today" | "this_week" | "estimate";

type LinkUrgencyOption = { id: LinkUrgency; label: string };

const RESTORATION_URGENCY_EN: LinkUrgencyOption[] = [
  { id: "today", label: "Emergency — active water, fire, mold, or sewage" },
  { id: "this_week", label: "This week — contained loss or assessment needed" },
  { id: "estimate", label: "Inspection / estimate / follow-up" },
];

const HVAC_URGENCY_EN: LinkUrgencyOption[] = [
  { id: "today", label: "Emergency — no heat, no cooling, or active leak" },
  { id: "this_week", label: "This week — comfort issue or system not working right" },
  { id: "estimate", label: "Maintenance / tune-up / estimate" },
];

const GENERAL_URGENCY_EN: LinkUrgencyOption[] = [
  { id: "today", label: "Emergency — needs service today" },
  { id: "this_week", label: "This week — not urgent but needs attention" },
  { id: "estimate", label: "Estimate / consultation / follow-up" },
];

const RESTORATION_URGENCY_KO: LinkUrgencyOption[] = [
  { id: "today", label: "가능한 빨리 방문이 필요합니다." },
  { id: "this_week", label: "이번 주 안에 방문이 필요합니다." },
  { id: "estimate", label: "견적 또는 상담 문의입니다." },
];

const HVAC_URGENCY_KO: LinkUrgencyOption[] = [
  { id: "today", label: "긴급 — 난방/냉방 불가 또는 누수" },
  { id: "this_week", label: "이번 주 — 불편하지만 당장은 긴급하지 않음" },
  { id: "estimate", label: "정기 점검 / 견적 문의" },
];

const GENERAL_URGENCY_KO: LinkUrgencyOption[] = RESTORATION_URGENCY_KO;

function urgencyOptionsForVertical(vertical: ShopVertical, english: boolean): LinkUrgencyOption[] {
  if (english) {
    switch (vertical) {
      case "hvac":
        return HVAC_URGENCY_EN;
      case "restoration":
        return RESTORATION_URGENCY_EN;
      default:
        return GENERAL_URGENCY_EN;
    }
  }
  switch (vertical) {
    case "hvac":
      return HVAC_URGENCY_KO;
    case "restoration":
      return RESTORATION_URGENCY_KO;
    default:
      return GENERAL_URGENCY_KO;
  }
}

/** US customer-facing urgency choices — always English (Spanish chrome is separate). */
export function getLinkUrgencyOptions(vertical: ShopVertical = "restoration"): LinkUrgencyOption[] {
  return urgencyOptionsForVertical(vertical, true);
}

/** @deprecated Prefer getLinkUrgencyOptions(vertical) — defaults to restoration labels. */
export const LINK_URGENCY_OPTIONS = getLinkUrgencyOptions("restoration");

export function parseLinkUrgency(value: unknown): LinkUrgency | null {
  if (value === "today" || value === "this_week" || value === "estimate") {
    return value;
  }
  return null;
}

export function linkUrgencyToPriority(urgency: LinkUrgency): JobPriority {
  switch (urgency) {
    case "today":
      return "P1";
    case "this_week":
      return "P2";
    case "estimate":
      return "P3";
  }
}

export function arrivalWindowForLinkUrgency(urgency: LinkUrgency): string {
  switch (urgency) {
    case "today":
      return "Customer requested visit today (link intake)";
    case "this_week":
      return "Customer requested visit this week (link intake)";
    case "estimate":
      return "Quote / estimate request (link intake)";
  }
}

export function buildLinkIntakeDraftFromForm(params: {
  customerName: string;
  address: string;
  issueDescription: string;
  urgency: LinkUrgency;
  insuranceCarrier?: string;
  insuranceClaimNumber?: string;
  waterSource?: string;
  activeLoss?: boolean;
  vertical?: ShopVertical;
}) {
  const vertical = params.vertical ?? "restoration";
  const urgencyOptions = getLinkUrgencyOptions(vertical);
  const priority = linkUrgencyToPriority(params.urgency);
  const issue = params.issueDescription.trim();
  const insuranceCarrier = params.insuranceCarrier?.trim() ?? "";
  const insuranceClaimNumber = params.insuranceClaimNumber?.trim() ?? "";
  const waterSource = params.waterSource?.trim() ?? "";
  const insuranceLines = [
    insuranceCarrier ? `Insurance: ${insuranceCarrier}` : "",
    insuranceClaimNumber ? `Claim #: ${insuranceClaimNumber}` : "",
    waterSource ? `Water source: ${waterSource}` : "",
    params.activeLoss ? "Active loss: yes (still spreading)" : "",
  ].filter(Boolean);

  return {
    customerName: params.customerName.trim(),
    address: params.address.trim(),
    serviceLocation: params.address.trim(),
    issueType: issue,
    symptom: issue,
    priority,
    servicePriority: legacyToServicePriority(priority),
    priorityReasons: [`Link intake: ${params.urgency}`],
    prioritySource: "ai" as const,
    arrivalWindow: arrivalWindowForLinkUrgency(params.urgency),
    dispatchNotes: insuranceLines.length ? insuranceLines.join("\n") : "",
    jobberPasteBlock: [
      "=== SMS link intake (customer entered) ===",
      `Name: ${params.customerName.trim()}`,
      `Address: ${params.address.trim()}`,
      `Issue: ${issue}`,
      `Urgency: ${urgencyOptions.find((o) => o.id === params.urgency)?.label ?? params.urgency}`,
      ...insuranceLines,
    ].join("\n"),
    lossCategory: isRestorationVertical(vertical)
      ? inferLossCategoryFromText(issue, issue)
      : normalizeLossCategory("other"),
    insuranceCarrier: insuranceCarrier || undefined,
    insuranceClaimNumber: insuranceClaimNumber || undefined,
    waterSource: waterSource || undefined,
    activeLoss: params.activeLoss === true,
  };
}

/** Public-facing reference e.g. #VP-000123 */
export function formatLinkRequestNumber(callLogId: string): string {
  const hex = callLogId.replace(/-/g, "");
  const n = parseInt(hex.slice(0, 8), 16);
  const seq = Number.isFinite(n) ? n % 1_000_000 : 0;
  return `#VP-${String(seq).padStart(6, "0")}`;
}
