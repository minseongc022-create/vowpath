import type { StoredCallLog } from "./call-logs";
import { normalizeLossCategory, type LossCategory } from "./loss-category";
import { LOSS_CATEGORY_LABELS } from "./loss-category-labels";

export type DispatchPacket = {
  bookingId: string;
  generatedAt: string;
  shopName: string;
  customerName: string;
  phone: string;
  address: string;
  lossCategory: LossCategory;
  priority: string;
  issueType: string;
  symptom: string;
  insuranceCarrier?: string;
  insuranceClaimNumber?: string;
  waterSource?: string;
  activeLoss?: boolean;
  dispatchNotes: string;
  aiSummary: string;
  jobberPasteBlock: string;
  plainText: string;
};

export function buildDispatchPacket(params: {
  bookingId: string;
  shopName: string;
  call: StoredCallLog;
}): DispatchPacket {
  const c = params.call;
  const lossCategory = normalizeLossCategory(c.lossCategory);
  const lines = [
    `DISPATCH PACKET — ${params.shopName}`,
    `Ref: ${params.bookingId}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    `Customer: ${c.customerName ?? "Unknown"}`,
    `Phone: ${c.callbackPhone ?? c.from ?? "Unknown"}`,
    `Property: ${c.address ?? "Unknown"}`,
    `Loss: ${LOSS_CATEGORY_LABELS[lossCategory]} — ${c.issueType ?? c.symptom ?? ""}`,
    `Priority: ${c.priority ?? "P2"}`,
    c.insuranceCarrier ? `Insurance: ${c.insuranceCarrier}` : null,
    c.insuranceClaimNumber ? `Claim #: ${c.insuranceClaimNumber}` : null,
    c.waterSource ? `Water source: ${c.waterSource}` : null,
    c.activeLoss ? "Active loss: YES (spreading)" : null,
    c.severity ? `Severity: ${c.severity}` : null,
    c.urgency ? `Urgency: ${c.urgency}` : null,
    "",
    "Dispatch notes:",
    c.aiSummary ?? c.dispatchNotes ?? "(none)",
    "",
    "CRM paste block:",
    c.jobberPasteBlock ?? "(none)",
  ].filter(Boolean);

  return {
    bookingId: params.bookingId,
    generatedAt: new Date().toISOString(),
    shopName: params.shopName,
    customerName: c.customerName ?? "Unknown",
    phone: c.callbackPhone ?? c.from ?? "",
    address: c.address ?? "",
    lossCategory,
    priority: c.priority ?? "P2",
    issueType: c.issueType ?? "",
    symptom: c.symptom ?? "",
    insuranceCarrier: c.insuranceCarrier,
    insuranceClaimNumber: c.insuranceClaimNumber,
    waterSource: c.waterSource,
    activeLoss: c.activeLoss,
    dispatchNotes: c.dispatchNotes ?? "",
    aiSummary: c.aiSummary ?? "",
    jobberPasteBlock: c.jobberPasteBlock ?? "",
    plainText: lines.join("\n"),
  };
}
