/**
 * US HVAC SMS copy — short, friendly, single-segment when possible (GSM ~160 chars).
 * One line per message body (no newlines) so URLs are not split mid-string.
 */

import { resolveShopDisplayName } from "./shop-display-name";

const GSM_SINGLE = 160;

function forcesUcs2Encoding(text: string): boolean {
  for (const ch of text) {
    if (ch.charCodeAt(0) > 127) return true;
  }
  return false;
}

/**
 * SMS with a URL — never truncate the link (truncated links open the marketing homepage).
 * Twilio splits long bodies into multiple segments automatically.
 */
export function smsBodyWithUrl(intro: string, url: string, optOut = true): string {
  const tail = optOut ? smsCustomerOptOut().trim() : "";
  const body = tail ? `${intro.trim()} ${url} ${tail}` : `${intro.trim()} ${url}`;
  const limit = forcesUcs2Encoding(body) ? 70 : 160;
  if (body.length <= limit) return body;
  // Drop opt-out before touching the URL; URL must stay intact.
  if (tail && body.length > limit) {
    const withoutOpt = `${intro.trim()} ${url}`;
    if (withoutOpt.length <= limit * 2) return withoutOpt;
  }
  return `${intro.trim()} ${url}`;
}

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
  return smsBodyWithUrl(`${shop}: Hey! 👋 Book your visit here — takes 60 sec!`, url);
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
  const issue = smsTruncate(params.issueType, 26);
  const ref = params.requestNumber;
  const window = params.arrivalWindow?.trim()
    ? smsTruncate(params.arrivalWindow, 20)
    : "";
  const pending = params.pendingShopReview
    ? " We'll confirm your arrival window soon!"
    : " You're on the schedule!";
  const core = `${shop}: Hi ${first}! ✅ ${ref} — ${issue}.${window ? ` Window: ${window}.` : pending}`;
  return smsBodyWithUrl(core, params.portalUrl);
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
  const window = smsTruncate(params.window, 22);
  const urgent = params.priority === "P1" ? " Priority visit!" : "";
  const core = `${shop}: Hi ${first}! 📅 You're set for ${window}.${urgent} We'll text when we're on the way!`;
  if (params.portalUrl) {
    return smsBodyWithUrl(core, params.portalUrl);
  }
  return smsFitSingleSegment([core + smsCustomerOptOut()]);
}

export function smsCustomerIntakeAckBody(shopName: string | undefined, issue: string): string {
  const shop = resolveShopDisplayName(shopName);
  return smsFitSingleSegment([
    `${shop}: Got it — ${smsTruncate(issue, 28)}! 🔧 We'll text your arrival window soon.${smsCustomerOptOut()}`,
  ]);
}

export function smsCustomerNoSlotBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return `${shop}: Request in! 📞 Calendar's tight — we'll call within 2 hrs to lock in your window.${smsCustomerOptOut()}`;
}

export function smsCustomerApprovedBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return `${shop}: You're confirmed! ✅ We'll text your arrival window & when we're on the way.${smsCustomerOptOut()}`;
}

export function smsCustomerRejectedBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return `${shop}: We can't take this one right now — give us a call if you still need help!${smsCustomerOptOut()}`;
}

export function smsRequestReceivedBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return `${shop}: Got your request! 👋 Not confirmed yet — we'll follow up shortly.${smsCustomerOptOut()}`;
}

export function smsAfterHoursCustomerBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return `${shop}: After-hours request received! 🌙 We'll reach out next business day.${smsCustomerOptOut()}`;
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
  return `${shop}: Quick check — is this right (${smsTruncate(params.issueType, 22)})? Reply YES or NO.${smsCustomerOptOut()}`;
}
