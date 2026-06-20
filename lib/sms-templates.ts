/**
 * US HVAC SMS copy — short, friendly, single-segment when possible (GSM ~160 chars).
 * One line per message body (no newlines) so URLs are not split mid-string.
 */

import { resolveShopDisplayName } from "./shop-display-name";

const GSM_SINGLE = 160;

export function smsFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0];
  return first && first.length >= 2 ? first : "there";
}

export function smsTruncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/** Fit text to one SMS segment; drops optional tail first. */
export function smsFitSingleSegment(parts: string[], max = GSM_SINGLE): string {
  let msg = parts.filter(Boolean).join(" ");
  if (msg.length <= max) return msg;
  // Drop middle segments (usually issue detail) before URL
  if (parts.length > 2) {
    msg = smsFitSingleSegment([parts[0], parts[parts.length - 1]], max);
    if (msg.length <= max) return msg;
  }
  return smsTruncate(msg, max);
}

export function smsCustomerOptOut(): string {
  return " Reply STOP to opt out.";
}

/** Link intake — press 1 on call */
export function smsLinkIntakeBody(shopName: string | undefined, url: string): string {
  const shop = resolveShopDisplayName(shopName);
  return smsFitSingleSegment([
    `${shop}: Need HVAC help? Tap here to book! 👉`,
    url,
  ]);
}

/** After booking / request received */
export function smsCustomerBookingConfirmationBody(params: {
  shopName?: string;
  requestNumber: string;
  customerName: string;
  issueType: string;
  arrivalWindow?: string;
  portalUrl: string;
  pendingShopReview?: boolean;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const first = smsFirstName(params.customerName);
  const issue = smsTruncate(params.issueType, 28);
  const ref = params.requestNumber;
  const window = params.arrivalWindow?.trim()
    ? smsTruncate(params.arrivalWindow, 22)
    : "";
  const pending = params.pendingShopReview ? " We'll confirm soon!" : " You're on the schedule!";
  const core = `${shop}: Hi ${first}! ${ref} received — ${issue}.${window ? ` ${window}.` : pending}`;
  return smsFitSingleSegment([core, `Details: ${params.portalUrl}`, smsCustomerOptOut().trim()]);
}

export function smsCustomerScheduledBody(params: {
  shopName?: string;
  customerName: string;
  window: string;
  portalUrl?: string;
  priority?: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const first = smsFirstName(params.customerName);
  const window = smsTruncate(params.window, 24);
  const urgent = params.priority === "P1" ? " Priority visit!" : "";
  const core = `${shop}: Hi ${first}! You're set for ${window}.${urgent} See you soon!`;
  if (params.portalUrl) {
    return smsFitSingleSegment([core, `Manage: ${params.portalUrl}`, smsCustomerOptOut().trim()]);
  }
  return smsFitSingleSegment([core + smsCustomerOptOut()]);
}

export function smsCustomerIntakeAckBody(shopName: string | undefined, issue: string): string {
  const shop = resolveShopDisplayName(shopName);
  return smsFitSingleSegment([
    `${shop}: Got it — ${smsTruncate(issue, 30)}! We'll text your visit time soon.${smsCustomerOptOut()}`,
  ]);
}

export function smsCustomerNoSlotBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return `${shop}: Request received! Our schedule is full — we'll call within 2 hrs to book you.${smsCustomerOptOut()}`;
}

export function smsCustomerApprovedBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return `${shop}: Your visit is confirmed! We'll text arrival details soon.${smsCustomerOptOut()}`;
}

export function smsCustomerRejectedBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return `${shop}: We can't take this request right now. Call us if you still need help.${smsCustomerOptOut()}`;
}

export function smsRequestReceivedBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return `${shop}: Request received! Not confirmed yet — we'll follow up shortly.${smsCustomerOptOut()}`;
}

export function smsAfterHoursCustomerBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return `${shop}: After-hours request received! We'll reach out next business day.${smsCustomerOptOut()}`;
}

export function smsOwnerApprovalNeededBody(params: {
  shopName?: string;
  customerName: string;
  issue: string;
  window: string;
  priority: string;
  ambiguous?: boolean;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const name = smsTruncate(params.customerName, 16);
  const issue = smsTruncate(params.issue, 22);
  const window = smsTruncate(params.window, 18);
  const tag = params.ambiguous ? "REVIEW" : params.priority === "P1" ? "P1!" : "Approve?";
  return `${shop} ${tag}: ${name}, ${issue}. ${window}. Reply 1=Yes 2=No`;
}

export function smsOwnerScheduledFyiBody(params: {
  shopName?: string;
  customerName: string;
  issue: string;
  window: string;
  undoMinutes: number;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return `${shop}: Booked ${smsTruncate(params.window, 18)} — ${smsTruncate(params.customerName, 14)}, ${smsTruncate(params.issue, 18)}. Undo: reply 9 (${params.undoMinutes}m).`;
}

export function smsOwnerUrgentAutoBookedBody(params: {
  shopName?: string;
  customerName: string;
  issue: string;
  window: string;
  undoMinutes: number;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return `${shop} P1 booked! ${smsTruncate(params.window, 16)}: ${smsTruncate(params.customerName, 12)}, ${smsTruncate(params.issue, 16)}. Reply 2=Cancel. Undo 9 (${params.undoMinutes}m).`;
}

export function smsOwnerNoSlotBody(params: {
  shopName?: string;
  customerName: string;
  issue: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return `${shop}: No slot for ${smsTruncate(params.customerName, 14)} (${smsTruncate(params.issue, 20)}). Assign in dashboard.`;
}

export function smsOwnerNewRequestBody(params: {
  shopName?: string;
  ref: string;
  customerName: string;
  issue: string;
  priority: string;
  cityState?: string;
  ambiguous?: boolean;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const name = smsTruncate(params.customerName, 14);
  const issue = smsTruncate(params.issue, 20);
  const place =
    params.cityState?.trim() && params.cityState !== "—"
      ? ` ${smsTruncate(params.cityState, 12)}`
      : "";
  const tag = params.priority === "P1" ? "P1!" : params.priority;
  const reply = params.ambiguous
    ? ` Reply 1 ${params.ref}=Yes 2 ${params.ref}=No.`
    : ` Reply 1 ${params.ref}=Yes 2 ${params.ref}=No.`;
  return `${shop} ${tag}: ${name}, ${issue}${place}.${reply}`;
}

export function smsOwnerIntakeAutoConfirmedBody(params: {
  shopName?: string;
  customerName: string;
  issue: string;
  ref: string;
  urgent?: boolean;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const name = smsTruncate(params.customerName, 14);
  const issue = smsTruncate(params.issue, 18);
  if (params.urgent) {
    return `${shop} P1 confirmed: ${name}, ${issue}. Ref ${params.ref}. Reply 2 ${params.ref}=Cancel.`;
  }
  return `${shop}: Confirmed ${name}, ${issue}. Ref ${params.ref}. Reply 2 ${params.ref}=Cancel.`;
}

export function smsTechDispatchOfferBody(params: {
  shopName?: string;
  customerName: string;
  issue: string;
  window: string;
  ref: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return `${shop}: Job offer — ${smsTruncate(params.customerName, 12)}, ${smsTruncate(params.issue, 16)}, ${smsTruncate(params.window, 14)}. Reply 1=Accept 2=Pass. Ref ${params.ref}`;
}

export function smsCustomerVerificationBody(params: {
  shopName?: string;
  issueType: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return `${shop}: Please confirm your request (${smsTruncate(params.issueType, 24)}). Reply YES or NO.${smsCustomerOptOut()}`;
}
