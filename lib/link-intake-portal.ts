import { listCallLogs, patchCallLog, type StoredCallLog } from "./call-logs";
import { markAddressConfirmed } from "./address/confirmation";
import { normalizeSmsPhone } from "./phone";
import { listJobs, upsertJobRecord } from "./jobs-db";
import { formatLinkRequestNumber } from "./link-intake-urgency";
import {
  arrivalWindowForLinkUrgency,
  buildLinkIntakeDraftFromForm,
  parseLinkUrgency,
  type LinkUrgency,
} from "./link-intake-urgency";
import { validateServiceAddress } from "./call-intake/address-validation";
import { generateAiSummary } from "./call-intake/ai-summary";
import { parseUsAddress } from "./parse-contact";
import { formatCityState } from "./recent-bookings";
import type { LinkIntakeSession } from "./call-intake/link-intake-store";
import { notifyOwnerLinkIntakeUpdated } from "./link-intake-owner-notify";
import { getShopVertical } from "./vertical-context.js";
import { recordLinkIntakeCustomerUpdated } from "./record-tenant-events";

export type LinkIntakeBookingView = {
  bookingId: string;
  callId: string;
  requestNumber: string;
  customerName: string;
  phone: string;
  address: string;
  issueType: string;
  urgency: LinkUrgency;
  createdAt: string;
};

function urgencyFromCall(call: StoredCallLog): LinkUrgency {
  const window = call.arrivalWindow?.toLowerCase() ?? "";
  if (window.includes("today")) return "today";
  if (window.includes("week")) return "this_week";
  if (window.includes("quote") || window.includes("estimate")) return "estimate";
  if (call.priority === "P1") return "today";
  if (call.priority === "P2") return "this_week";
  return "estimate";
}

export function callToLinkIntakeBookingView(call: StoredCallLog): LinkIntakeBookingView {
  return {
    bookingId: `call-${call.id}`,
    callId: call.id,
    requestNumber: formatLinkRequestNumber(call.id),
    customerName: call.customerName?.trim() || "Customer",
    phone: call.callbackPhone?.trim() || call.from?.trim() || "",
    address: call.address?.trim() || "",
    issueType: call.issueType?.trim() || call.symptom?.trim() || "",
    urgency: urgencyFromCall(call),
    createdAt: call.createdAt,
  };
}

function namesMatch(input: string, stored: string): boolean {
  const a = input.trim().toLowerCase();
  const b = stored.trim().toLowerCase();
  if (!a || !b || a.length < 2) return false;
  return a === b;
}

export function phoneLast4Matches(phoneRaw: string, last4: string): boolean {
  const digits = phoneRaw.replace(/\D/g, "");
  const probe = last4.replace(/\D/g, "");
  if (probe.length !== 4) return false;
  return digits.endsWith(probe);
}

function phoneMatchesCall(call: StoredCallLog, phone: string): boolean {
  const normalized = normalizeSmsPhone(phone);
  if (!normalized) return false;
  const candidates = [call.callbackPhone, call.from].filter(Boolean) as string[];
  return candidates.some((p) => normalizeSmsPhone(p) === normalized);
}

function isCallFromLinkSession(
  call: StoredCallLog,
  session: LinkIntakeSession,
): boolean {
  if (session.callId && call.id === session.callId) return true;
  if (session.callSid && call.callSid === session.callSid) return true;
  return false;
}

export async function lookupLinkIntakeBooking(params: {
  session: LinkIntakeSession;
  customerName: string;
  phone: string;
}): Promise<
  | { ok: true; booking: LinkIntakeBookingView }
  | { ok: false; error: string }
> {
  const name = params.customerName.trim();
  const phone = params.phone.trim();
  if (name.length < 2 || phone.length < 8) {
    return { ok: false, error: "Enter your name and phone number." };
  }

  const calls = await listCallLogs(params.session.userId);
  const linkCalls = calls.filter((c) => isCallFromLinkSession(c, params.session));

  const matches = linkCalls
    .filter(
      (c) =>
        phoneMatchesCall(c, phone) && namesMatch(name, c.customerName ?? ""),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const call = matches[0];
  if (!call) {
    return {
      ok: false,
      error: "No booking matched that name and phone number.",
    };
  }

  return { ok: true, booking: callToLinkIntakeBookingView(call) };
}

/** Load the submission tied to this SMS link token (internal). */
export async function getLinkIntakeBookingForSession(
  session: LinkIntakeSession,
): Promise<LinkIntakeBookingView | null> {
  if (!session.callId) return null;
  const calls = await listCallLogs(session.userId);
  const call = calls.find((c) => c.id === session.callId);
  if (!call) return null;
  return callToLinkIntakeBookingView(call);
}

export async function updateLinkIntakeBooking(params: {
  session: LinkIntakeSession;
  bookingId: string;
  callId: string;
  customerName: string;
  phone: string;
  address: string;
  issueDescription: string;
  urgency: LinkUrgency;
}): Promise<
  | { ok: true; booking: LinkIntakeBookingView }
  | { ok: false; error: string }
> {
  const name = params.customerName.trim();
  let phone = params.phone.trim();
  if (name.length < 2) {
    return { ok: false, error: "Enter your name." };
  }

  const calls = await listCallLogs(params.session.userId);
  const call = calls.find((c) => c.id === params.callId);
  if (
    !call ||
    !isCallFromLinkSession(call, params.session)
  ) {
    return { ok: false, error: "Booking not found." };
  }

  if (!phone) {
    phone = call.callbackPhone?.trim() || call.from?.trim() || "";
  }
  if (phone.length < 8) {
    return { ok: false, error: "Enter your phone number." };
  }
  if (!phoneMatchesCall(call, phone)) {
    return {
      ok: false,
      error: "This link does not match that phone number. Open the link from your confirmation text.",
    };
  }
  if (params.issueDescription.trim().length < 4) {
    return { ok: false, error: "Describe the issue (at least a few words)." };
  }

  const addressCheck = await validateServiceAddress(params.address.trim(), {
    fallbackToHeuristic: true,
  });
  if (!addressCheck.valid) {
    return {
      ok: false,
      error: "We could not verify that address. Enter street, city, and state.",
    };
  }

  const address = addressCheck.formattedAddress ?? params.address.trim();
  const urgency = parseLinkUrgency(params.urgency) ?? "this_week";
  const vertical = await getShopVertical(params.session.userId);
  const draft = buildLinkIntakeDraftFromForm({
    customerName: name,
    address,
    issueDescription: params.issueDescription,
    urgency,
    vertical,
  });

  const parsed = parseUsAddress(address);
  const cityHint =
    parsed.city && parsed.province ? `${parsed.city}, ${parsed.province}` : undefined;

  const updateNote = `Customer updated via SMS link at ${new Date().toISOString()}.`;
  const transcript = [
    call.transcript?.trim() ?? "",
    updateNote,
    `Name: ${draft.customerName}`,
    `Address: ${address}`,
    `Issue: ${draft.issueType}`,
    `Urgency: ${arrivalWindowForLinkUrgency(urgency)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const aiSummary = generateAiSummary(
    {
      ...draft,
      address,
      dispatchNotes: draft.dispatchNotes,
      jobberPasteBlock: draft.jobberPasteBlock,
    },
    draft.priority,
    cityHint,
  );

  const callbackPhone = phone || call.callbackPhone || call.from;

  const patched = await patchCallLog(params.session.userId, params.callId, {
    customerName: draft.customerName,
    address,
    issueType: draft.issueType,
    symptom: draft.symptom,
    priority: draft.priority,
    servicePriority: draft.servicePriority,
    priorityReasons: draft.priorityReasons,
    prioritySource: draft.prioritySource,
    arrivalWindow: draft.arrivalWindow,
    aiSummary,
    transcript,
    callbackPhone,
    addressConfirmation: markAddressConfirmed({
      previous: call.addressConfirmation,
      confirmedAddress: address,
    }),
  });
  if (!patched) {
    return { ok: false, error: "Could not save your update. Try again." };
  }

  const jobs = await listJobs(params.session.userId);
  const job = jobs.find((j) => j.sourceCallId === params.callId);
  if (job) {
    await upsertJobRecord(params.session.userId, {
      ...job,
      customerName: draft.customerName,
      address,
      symptom: draft.symptom,
      priority: draft.priority,
      servicePriority: draft.servicePriority,
      priorityReasons: draft.priorityReasons,
      prioritySource: draft.prioritySource,
    });
  }

  const bookingId = params.bookingId;

  try {
    await recordLinkIntakeCustomerUpdated({
      userId: params.session.userId,
      bookingId,
      callId: params.callId,
      customerName: draft.customerName,
      issueType: draft.issueType,
      cityState: formatCityState(address),
    });
    await notifyOwnerLinkIntakeUpdated({
      userId: params.session.userId,
      bookingId,
      customerName: draft.customerName,
      issueType: draft.issueType,
      address,
      cityState: formatCityState(address),
      priority: draft.priority,
    });
  } catch (e) {
    console.warn("[link-intake-portal] notify", e);
  }

  return { ok: true, booking: callToLinkIntakeBookingView(patched) };
}
