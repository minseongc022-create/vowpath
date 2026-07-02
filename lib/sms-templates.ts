/**
 * US restoration SMS copy — warm, professional, single-segment when possible (GSM ~160 chars).
 * BRAND RULE:
 *   - Customer-facing messages: use shop name only (resolveShopDisplayName)
 *   - Tech/staff-facing messages: prefix with "Effiroad" so they know the platform
 */

import { resolveShopDisplayName } from "./shop-display-name";

const GSM_SINGLE = 160;

function forcesUcs2Encoding(text: string): boolean {
  for (const ch of text) {
    if (ch.charCodeAt(0) > 127) return true;
  }
  return false;
}

export function smsBodyWithUrl(intro: string, url: string, optOut = true): string {
  const tail = optOut ? smsCustomerOptOut().trim() : "";
  const body = tail ? `${intro.trim()} ${url} ${tail}` : `${intro.trim()} ${url}`;
  const limit = forcesUcs2Encoding(body) ? 70 : 160;
  if (body.length <= limit) return body;
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

export function smsFitSingleSegment(parts: string[], max = GSM_SINGLE): string {
  let msg = parts.filter(Boolean).join(" ");
  if (msg.length <= max) return msg;
  if (parts.length > 2) {
    msg = smsFitSingleSegment([parts[0], parts[parts.length - 1]], max);
    if (msg.length <= max) return msg;
  }
  return smsTruncate(msg, max);
}

export function smsCustomerOptOut(): string {
  return " Reply STOP to opt out.";
}

export const SMS_ETA_MINUTE_OPTIONS = [5, 10, 15, 30, 45, 60] as const;
export type SmsEtaMinutes = (typeof SMS_ETA_MINUTE_OPTIONS)[number];

export function smsEtaMinutesLabel(): string {
  return SMS_ETA_MINUTE_OPTIONS.join(", ");
}

export function smsStaffEtaHint(): string {
  return (
    `Effiroad: When you're heading out, reply to THIS text with your drive time in minutes ` +
    `(${smsEtaMinutesLabel()}). Example: 20 = 20 min away. We'll text the customer — don't contact them directly.`
  );
}

export function smsStaffEtaHintShort(): string {
  return `Effiroad: Leaving? Reply with minutes to arrival (${smsEtaMinutesLabel()}). We text the customer for you.`;
}

export function smsStaffEtaInvalidReply(): string {
  return (
    `Effiroad: To update ETA, reply to THIS text with minutes only (${smsEtaMinutesLabel()}). ` +
    `Example: 20. We'll notify the customer — please don't text them directly.`
  );
}

// ─── Customer-facing messages (shop name, no "Effiroad") ────────────────────

/** Link intake — press 1 on call */
export function smsLinkIntakeBody(shopName: string | undefined, url: string): string {
  const shop = resolveShopDisplayName(shopName);
  return smsBodyWithUrl(
    `${shop}: Thanks for calling! Tap the link to submit your info — takes about 60 seconds:`,
    url,
  );
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
  const window = params.arrivalWindow?.trim() ? smsTruncate(params.arrivalWindow, 22) : "";
  const pending = params.pendingShopReview
    ? " We're reviewing your request and will confirm your window shortly."
    : " You're on our schedule!";
  const core = `${shop}: Hi ${first}! Your request is confirmed (${ref}) — ${issue}.${window ? ` Arrival window: ${window}.` : pending} You can view or update details here:`;
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
  const urgent = params.priority === "P1" ? " Our team is treating this as priority." : "";
  const core = `${shop}: Hi ${first}! You're scheduled for ${window}.${urgent} We'll send a heads-up when we're on our way.`;
  if (params.portalUrl) return smsBodyWithUrl(core, params.portalUrl);
  return smsFitSingleSegment([core + smsCustomerOptOut()]);
}

export function smsCustomerIntakeAckBody(shopName: string | undefined, issue: string): string {
  const shop = resolveShopDisplayName(shopName);
  return smsFitSingleSegment([
    `${shop}: Got it — ${smsTruncate(issue, 30)}. We'll confirm your arrival window shortly.${smsCustomerOptOut()}`,
  ]);
}

export function smsCustomerNoSlotBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return smsFitSingleSegment([
    `${shop}: We've received your request. Our calendar is full right now — someone will call you within 2 hours to lock in a window.${smsCustomerOptOut()}`,
  ]);
}

export function smsCustomerApprovedBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return smsFitSingleSegment([
    `${shop}: You're confirmed! We'll send your arrival window and a heads-up when we're on the way.${smsCustomerOptOut()}`,
  ]);
}

export function smsCustomerRejectedBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return smsFitSingleSegment([
    `${shop}: Unfortunately we're unable to take this job right now. Please give us a call if you still need assistance — we're happy to help.${smsCustomerOptOut()}`,
  ]);
}

export function smsRequestReceivedBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return smsFitSingleSegment([
    `${shop}: We've received your request and our team is reviewing it now. We'll follow up shortly.${smsCustomerOptOut()}`,
  ]);
}

export function smsAfterHoursCustomerBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return smsFitSingleSegment([
    `${shop}: After-hours request received. Our team will reach out first thing in the morning.${smsCustomerOptOut()}`,
  ]);
}

/** Customer — tech en route */
export function smsCustomerOnMyWayBody(params: {
  shopName?: string;
  customerName: string;
  techName: string;
  etaMinutes: number;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const first = smsFirstName(params.customerName);
  const tech = smsTruncate(params.techName, 18);
  return smsFitSingleSegment([
    `${shop}: Hi ${first}! ${tech} is heading your way — estimated arrival in ~${params.etaMinutes} min. Please clear access to the affected area. Thank you!${smsCustomerOptOut()}`,
  ]);
}

export function smsCustomerVerificationBody(params: {
  shopName?: string;
  issueType: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return smsFitSingleSegment([
    `${shop}: Just to confirm — is this correct: "${smsTruncate(params.issueType, 24)}"? Reply YES or NO.${smsCustomerOptOut()}`,
  ]);
}

export function smsMissedCallTextbackBody(params: {
  shopName?: string;
  url: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return `${shop}: We're sorry we missed your call! Submit your request here (takes 1 min): ${params.url}`;
}

// ─── 30-minute appointment reminder ─────────────────────────────────────────

/** To tech: 30 min before window — ask for ETA */
export function smsApptReminderToTech(params: {
  customerName: string;
  window: string;
  bookingId: string;
}): string {
  const name = smsTruncate(params.customerName, 18);
  const win = smsTruncate(params.window, 20);
  return (
    `Effiroad: You have a job in ~30 min — ${name}, window ${win}. ` +
    `How many minutes away are you? Reply with a number (e.g. 20). ` +
    `We'll let the customer know. Ref: ${params.bookingId.slice(-6)}`
  );
}

/** To customer: tech gave ETA */
export function smsApptEtaToCustomer(params: {
  shopName?: string;
  customerName: string;
  etaMinutes: number;
  window: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const first = smsFirstName(params.customerName);
  return smsFitSingleSegment([
    `${shop}: Hi ${first}! Your technician is about ${params.etaMinutes} min away. Please have the area ready. See you soon!${smsCustomerOptOut()}`,
  ]);
}

/** To customer: no ETA from tech — fallback */
export function smsApptFallbackToCustomer(params: {
  shopName?: string;
  customerName: string;
  window: string;
  techName?: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const first = smsFirstName(params.customerName);
  const win = smsTruncate(params.window, 20);
  return smsFitSingleSegment([
    `${shop}: Hi ${first}! A reminder — your technician is scheduled for ${win} and will be on the way shortly. We'll keep you posted!${smsCustomerOptOut()}`,
  ]);
}

// ─── Owner/staff-facing messages (Effiroad prefix) ──────────────────────────

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
  const tag = params.ambiguous ? "REVIEW" : params.priority === "P1" ? "P1!" : "New job";
  return `${shop} ${tag}: ${name} — ${issue}. ${window}. Reply 1=Approve 2=Decline`;
}

export function smsOwnerScheduledFyiBody(params: {
  shopName?: string;
  customerName: string;
  issue: string;
  window: string;
  undoMinutes: number;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return `${shop}: Booked — ${smsTruncate(params.customerName, 14)}, ${smsTruncate(params.issue, 18)}, ${smsTruncate(params.window, 18)}. Reply 9 to undo (${params.undoMinutes}m).`;
}

export function smsOwnerUrgentAutoBookedBody(params: {
  shopName?: string;
  customerName: string;
  issue: string;
  window: string;
  undoMinutes: number;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return `${shop} P1 AUTO-BOOKED: ${smsTruncate(params.customerName, 12)}, ${smsTruncate(params.issue, 16)}, ${smsTruncate(params.window, 16)}. Reply 2=Cancel | 9=Undo (${params.undoMinutes}m).`;
}

export function smsCustomerReviewRequestBody(params: {
  shopName?: string;
  reviewUrl: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return smsBodyWithUrl(
    `Thanks for choosing ${shop}! Mind leaving us a quick review?`,
    params.reviewUrl,
  );
}

export function smsCustomerQuoteFollowUpBody(params: {
  shopName?: string;
  amountCents: number;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const amount = (params.amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return `${shop}: Just checking in on the ${amount} estimate we sent — happy to answer questions or get you booked whenever you're ready. Reply here anytime.`;
}

export function smsOwnerNoSlotBody(params: {
  shopName?: string;
  customerName: string;
  issue: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return `${shop}: No available slot for ${smsTruncate(params.customerName, 14)} (${smsTruncate(params.issue, 22)}). Please assign manually in the dashboard.`;
}

export function smsOwnerNewRequestBody(params: {
  shopName?: string;
  ref: string;
  customerName: string;
  issue: string;
  priority: string;
  cityState?: string;
  ambiguous?: boolean;
  customerPhone?: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const name = smsTruncate(params.customerName, 14);
  const issue = smsTruncate(params.issue, 22);
  const place =
    params.cityState?.trim() && params.cityState !== "—"
      ? ` · ${smsTruncate(params.cityState, 12)}`
      : "";
  const tag = params.priority === "P1" ? "P1 URGENT" : params.priority;
  // P1 only — a phone number on every routine request would just be noise.
  const callLine =
    params.priority === "P1" && params.customerPhone?.trim()
      ? ` Call ${params.customerPhone.trim()}?`
      : "";
  return `${shop} ${tag}: ${name} — ${issue}${place}.${callLine} Reply 1 ${params.ref}=Yes 2 ${params.ref}=No`;
}

export function smsOwnerIntakeAutoConfirmedBody(params: {
  shopName?: string;
  customerName: string;
  issue: string;
  ref: string;
  urgent?: boolean;
  autoWaterDispatch?: boolean;
  undoMinutes: number;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const name = smsTruncate(params.customerName, 14);
  const issue = smsTruncate(params.issue, 20);
  if (params.autoWaterDispatch) {
    return `${shop} CREW DISPATCHED: ${name} — ${issue}. Ref ${params.ref}. Reply 9 ${params.ref}=Undo (${params.undoMinutes}m).`;
  }
  if (params.urgent) {
    return `${shop} P1 CONFIRMED: ${name} — ${issue}. Ref ${params.ref}. Reply 2 ${params.ref}=Cancel.`;
  }
  return `${shop}: Confirmed — ${name}, ${issue}. Ref ${params.ref}. Reply 2 ${params.ref}=Cancel.`;
}

// ─── Tech dispatch offer (Effiroad platform, tech sees our name) ─────────────

export function smsTechDispatchOfferBody(params: {
  shopName?: string;
  customerName: string;
  issue: string;
  window: string;
  ref: string;
}): string {
  return (
    `Effiroad: New job offer — ${smsTruncate(params.customerName, 14)}, ` +
    `${smsTruncate(params.issue, 18)}, ${smsTruncate(params.window, 16)}. ` +
    `Reply 1=Accept 2=Pass. Ref ${params.ref}`
  );
}

export function smsTechOnMyWayAcceptedHint(params: {
  shopName?: string;
  customerName: string;
  ref: string;
}): string {
  const name = smsTruncate(params.customerName, 18);
  return `Effiroad: Accepted — ${name} (${params.ref}). ${smsStaffEtaHintShort()}`;
}
