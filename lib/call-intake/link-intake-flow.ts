import { getPublicAppUrl } from "../app-url";
import { sendSms } from "../send-sms";
import { findUserById } from "../users-db";
import { markSmsSent, shouldSendSmsOnce } from "../sms-dedupe";
import type { JobPriority } from "../types";
import { resolveShopDisplayName } from "../link-intake-brand";
import { smsLinkIntakeMessage } from "../link-intake-copy";
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
import { offerVisitSlotsForTenant } from "../scheduling/offer-slots";
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
  const base = getPublicAppUrl();
  if (!base) return `/intake/${token}`;
  return `${base.replace(/\/$/, "")}/intake/${token}`;
}

export function smsLinkIntakeBody(shopName: string, url: string): string {
  return smsLinkIntakeMessage(shopName, url);
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
  const session = await getLinkIntakeSession(params.token);
  const user = await findUserById(params.userId);
  const shopName = resolveShopDisplayName(
    session?.shopName ?? user?.shopName,
  );
  const url = buildLinkIntakeUrl(params.token);
  const body = smsLinkIntakeBody(shopName, url);
  const dedupeId = `link-intake:${params.token}`;

  const allowed = await shouldSendSmsOnce(params.userId, dedupeId);
  if (!allowed) return { ok: true };

  const result = await sendSms(params.phone, body, "link_intake", {
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
  const slots = await offerVisitSlotsForTenant({
    userId,
    priority: linkUrgencyToPriority(urgency),
  });
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
    return { ok: false, error: "이 링크는 만료되었거나 이미 사용되었습니다." };
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
      error: "주소를 확인할 수 없습니다. 도로명, 도시, 주를 다시 입력해 주세요.",
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
