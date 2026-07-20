import { generateLinkIntakeToken } from "../link-intake-token";
import { buildLinkIntakeUrl as portalBuildLinkIntakeUrl } from "../portal-url";
import { smsLinkIntakeBody as tplLinkIntakeSms } from "../sms-templates";
import { sendSms } from "../send-sms";
import { findUserById } from "../users-db";
import { markSmsSent, shouldSendSmsOnce } from "../sms-dedupe";
import type { JobPriority } from "../types";
import { shopDisplayNameForUser, resolveShopDisplayName } from "../link-intake-brand";
import {
  buildLinkIntakeDraftFromForm,
  formatLinkRequestNumber,
  linkUrgencyToPriority,
  type LinkUrgency,
} from "../link-intake-urgency";
import {
  getLinkIntakeSession,
  canSubmitLinkIntakeForm,
  completeLinkIntakeSession,
  saveLinkIntakeSession,
  type LinkIntakeSession,
} from "./link-intake-store";
import { getLinkIntakeBookingForSession } from "../link-intake-portal";
import type { SlotOffer } from "../booking-settings";
import { resolveSlotById } from "../scheduling/validate-slot";
import { finalizeVerifiedIntake } from "./finalize-intake";
import { validateServiceAddress } from "./address-validation";
import { generateAiSummary } from "./ai-summary";
import { resolveCallbackFromCallerId } from "./caller-id";
import { getShopVertical } from "../vertical-context.js";
import type { FieldConfidence, VerifiedCallPayload } from "./types";
import { MANDATORY_VERIFY_FIELDS } from "./types";
import { inferLossCategoryFromText } from "../loss-category";
import { parseUsAddress } from "../parse-contact";

const LINK_CONFIDENCE: FieldConfidence = {
  customerName: 100,
  address: 100,
  serviceLocation: 100,
  issueType: 100,
};

export function buildLinkIntakeUrl(token: string): string {
  return portalBuildLinkIntakeUrl(token);
}

export function smsLinkIntakeBody(shopName: string, url: string): string {
  return tplLinkIntakeSms(shopName, url);
}

export async function createLinkIntakeSession(params: {
  userId: string;
  callSid: string;
  from: string;
  to: string;
  shopName: string;
  menuPriority?: JobPriority | null;
}): Promise<LinkIntakeSession> {
  const token = generateLinkIntakeToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 86_400_000).toISOString();
  const session: LinkIntakeSession = {
    token,
    userId: params.userId,
    callSid: params.callSid,
    from: params.from,
    to: params.to,
    menuPriority: params.menuPriority ?? null,
    shopName: resolveShopDisplayName(params.shopName),
    createdAt: now.toISOString(),
    expiresAt,
  };
  await saveLinkIntakeSession(session);
  return session;
}

export async function sendLinkIntakeSms(params: {
  userId: string;
  phone: string;
  token: string;
  callSid?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const shopName = await shopDisplayNameForUser(params.userId);
  const url = buildLinkIntakeUrl(params.token);
  const body = smsLinkIntakeBody(shopName, url);
  const dedupeId = `link-intake:${params.token}`;

  const allowed = await shouldSendSmsOnce(params.userId, dedupeId);
  if (!allowed) return { ok: true };

  const session = await getLinkIntakeSession(params.token);
  const callSid = params.callSid ?? session?.callSid;

  const result = await sendSms(params.phone, body, "link_intake", {
    usRecipientsOnly: false,
    context: {
      userId: params.userId,
      operation: "link_intake",
      callSid,
    },
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  await markSmsSent(params.userId, dedupeId);
  return { ok: true };
}

export async function resolveLinkIntakeSlot(
  userId: string,
  urgency: LinkUrgency,
  slotId?: string | null,
  options?: { excludeBookingId?: string },
): Promise<SlotOffer | null> {
  if (!slotId?.trim()) return null;
  const priority = linkUrgencyToPriority(urgency);
  return resolveSlotById({
    userId,
    slotId: slotId.trim(),
    priority,
    excludeBookingId: options?.excludeBookingId,
  });
}

export async function submitLinkIntakeForm(params: {
  token: string;
  customerName: string;
  address: string;
  issueDescription: string;
  urgency: LinkUrgency;
  photoRef?: string;
  slotId?: string | null;
  insuranceCarrier?: string;
  insuranceClaimNumber?: string;
  waterSource?: string;
  activeLoss?: boolean;
  customerSmsConsent?: import("../legal-consent").CustomerSmsConsentRecord;
}): Promise<
  | {
      ok: true;
      bookingId: string;
      requestNumber: string;
      booking: import("../link-intake-portal").LinkIntakeBookingView;
    }
  | { ok: false; error: string }
> {
  const session = await getLinkIntakeSession(params.token);
  if (!canSubmitLinkIntakeForm(session)) {
    return { ok: false, error: "This link has expired or was already used." };
  }

  const { isTenantProductEntitled } = await import("../tenant-product-access");
  if (!(await isTenantProductEntitled(session!.userId))) {
    return {
      ok: false,
      error: "This service line is not active. Please contact the business directly.",
    };
  }

  const draft = buildLinkIntakeDraftFromForm({
    ...params,
    vertical: await getShopVertical(session!.userId),
  });
  const selectedSlot = await resolveLinkIntakeSlot(
    session!.userId,
    params.urgency,
    params.slotId,
  );
  if (selectedSlot) {
    draft.arrivalWindow = selectedSlot.label;
  }

  const addressCheck = await validateServiceAddress(draft.address, {
    fallbackToHeuristic: true,
  });
  if (!addressCheck.valid) {
    return {
      ok: false,
      error: "We could not verify that address. Enter street, city, and state.",
    };
  }

  const address = addressCheck.formattedAddress ?? draft.address;
  const parsed = parseUsAddress(address);
  const cityHint =
    parsed.city && parsed.province ? `${parsed.city}, ${parsed.province}` : undefined;

  let dispatchNotes = draft.dispatchNotes;
  let jobberPasteBlock = draft.jobberPasteBlock;
  if (params.photoRef) {
    const note = "Customer attached a photo via SMS link intake.";
    dispatchNotes = dispatchNotes ? `${dispatchNotes}\n${note}` : note;
    jobberPasteBlock = `${jobberPasteBlock}\nPhoto: ${params.photoRef}`;
  }

  const transcript = [
    "Intake channel: SMS link (customer self-service).",
    `Name: ${draft.customerName}`,
    `Address: ${address}`,
    `Issue: ${draft.issueType}`,
    `Urgency: ${params.urgency}`,
    draft.insuranceCarrier ? `Insurance: ${draft.insuranceCarrier}` : "",
    draft.insuranceClaimNumber ? `Claim #: ${draft.insuranceClaimNumber}` : "",
    draft.waterSource ? `Water source: ${draft.waterSource}` : "",
    draft.activeLoss ? "Active loss: yes" : "",
    params.photoRef ? "Photo: attached" : "",
    params.customerSmsConsent
      ? `Customer SMS consent: service (${params.customerSmsConsent.smsServiceAt})${
          params.customerSmsConsent.smsMarketingAt
            ? `, marketing (${params.customerSmsConsent.smsMarketingAt})`
            : ""
        }`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const payload: VerifiedCallPayload = {
    transcript,
    customerName: draft.customerName,
    address,
    serviceLocation: address,
    issueType: draft.issueType,
    symptom: draft.symptom,
    priority: draft.priority,
    servicePriority: draft.servicePriority,
    priorityReasons: draft.priorityReasons,
    prioritySource: draft.prioritySource,
    arrivalWindow: draft.arrivalWindow,
    dispatchNotes,
    jobberPasteBlock,
    callbackPhone: resolveCallbackFromCallerId(session!.from),
    aiSummary: generateAiSummary(
      { ...draft, address, dispatchNotes, jobberPasteBlock },
      draft.priority,
      cityHint,
    ),
    callSid: session!.callSid,
    to: session!.to,
    confidence: LINK_CONFIDENCE,
    verificationComplete: true,
    intakePhotoRef: params.photoRef,
    addressValidation: {
      valid: true,
      formattedAddress: address,
      provider: addressCheck.provider,
    },
    verifiedFields: Object.fromEntries(
      MANDATORY_VERIFY_FIELDS.map((f) => [f, true]),
    ) as VerifiedCallPayload["verifiedFields"],
    lossCategory: inferLossCategoryFromText(draft.issueType, draft.symptom),
    insuranceCarrier: draft.insuranceCarrier,
    insuranceClaimNumber: draft.insuranceClaimNumber,
    waterSource: draft.waterSource,
    activeLoss: draft.activeLoss,
    customerSmsConsent: params.customerSmsConsent,
  };

  const result = await finalizeVerifiedIntake(session!.userId, payload, {
    intakeChannel: "sms_link",
    sendCustomerVerificationSms: false,
    selectedSlot: selectedSlot ?? null,
  });

  const bookingId = `call-${result.callLogId}`;
  const customerPhone =
    resolveCallbackFromCallerId(session!.from) || session!.from;

  await completeLinkIntakeSession(params.token, {
    bookingId,
    callId: result.callLogId,
    customerPhone,
    customerName: draft.customerName,
  });

  const refreshed = await getLinkIntakeSession(params.token);
  const booking =
    (refreshed && (await getLinkIntakeBookingForSession(refreshed))) ?? {
      bookingId,
      callId: result.callLogId,
      requestNumber: formatLinkRequestNumber(result.callLogId),
      customerName: draft.customerName,
      phone: customerPhone,
      address,
      issueType: draft.issueType,
      urgency: params.urgency,
      createdAt: new Date().toISOString(),
    };

  return {
    ok: true,
    bookingId,
    requestNumber: booking.requestNumber,
    booking,
  };
}
