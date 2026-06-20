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
import { offerSlotGridForTenant, offerVisitSlotsForTenant } from "../scheduling/offer-slots";
import { finalizeVerifiedIntake } from "./finalize-intake";
import { validateServiceAddress } from "./address-validation";
import { generateAiSummary } from "./ai-summary";
import { resolveCallbackFromCallerId } from "./caller-id";
import type { FieldConfidence, VerifiedCallPayload } from "./types";
import { MANDATORY_VERIFY_FIELDS } from "./types";
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
  const token = crypto.randomUUID().replace(/-/g, "");
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
}): Promise<{ ok: boolean; error?: string }> {
  const shopName = await shopDisplayNameForUser(params.userId);
  const url = buildLinkIntakeUrl(params.token);
  const body = smsLinkIntakeBody(shopName, url);
  const dedupeId = `link-intake:${params.token}`;

  const allowed = await shouldSendSmsOnce(params.userId, dedupeId);
  if (!allowed) return { ok: true };

  const result = await sendSms(params.phone, body, "link_intake", {
    // Caller pressed 1 during an inbound call — text their Twilio Caller ID (+1 or +82).
    usRecipientsOnly: false,
    context: {
      userId: params.userId,
      operation: "link_intake",
      callSid: params.token,
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
): Promise<SlotOffer | null> {
  if (!slotId?.trim()) return null;
  const priority = linkUrgencyToPriority(urgency);
  const grid = await offerSlotGridForTenant({ userId, priority });
  if (grid) {
    for (const day of grid.days) {
      const match = day.slots.find((s) => s.id === slotId && s.status === "available");
      if (match) {
        return {
          id: match.id,
          label: `${day.weekdayLabel} ${match.label}`,
          startAt: match.startAt,
          endAt: match.endAt,
          source: match.source,
        };
      }
    }
  }
  const slots = await offerVisitSlotsForTenant({ userId, priority });
  return slots.find((s) => s.id === slotId) ?? null;
}

export async function submitLinkIntakeForm(params: {
  token: string;
  customerName: string;
  address: string;
  issueDescription: string;
  urgency: LinkUrgency;
  photoRef?: string;
  slotId?: string | null;
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

  const draft = buildLinkIntakeDraftFromForm(params);
  const selectedSlot = await resolveLinkIntakeSlot(
    session!.userId,
    params.urgency,
    params.slotId,
  );
  if (selectedSlot) {
    draft.arrivalWindow = selectedSlot.label;
  }

  const addressCheck = await validateServiceAddress(draft.address);
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
    params.photoRef ? "Photo: attached" : "",
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
