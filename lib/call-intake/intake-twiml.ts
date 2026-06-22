import { getTwilioWebhookBaseUrl } from "../twilio-config";
import {
  twimlGatherDtmfSlots,
  twimlGatherDtmfYesNo,
  twimlGatherSpeechDetailed,
  twimlGatherSpeechField,
  twimlResponse,
  twimlSay,
} from "../twilio-xml";
import { afterHoursPhoneGoodbye } from "../after-hours-intake";
import {
  CUSTOMER_REQUEST_RECEIVED_MESSAGE,
  CUSTOMER_SLOT_CONFIRMED_MESSAGE,
} from "../booking-policy";
import { slotPickPrompt } from "./slot-pick-flow";
import type { CallIntakeState, MandatoryVerifyField } from "./types";
import {
  fieldRepeatPrompt,
  fieldVerifyPrompt,
  finalConfirmPrompt,
} from "./verification-flow";
import { ADDRESS_VERIFY_FAIL_PROMPT } from "./address-validation";

function intakeUrl(
  callSid: string,
  phase: string,
  extra?: Record<string, string>,
): string {
  const base = getTwilioWebhookBaseUrl();
  const q = new URLSearchParams({ phase, callSid, ...extra });
  return `${base}/api/twilio/intake?${q.toString()}`;
}

export function twimlForIntakeState(state: CallIntakeState): string {
  const { callSid, menuPriority } = state;
  const priorityQ = menuPriority ?? "P2";

  if (state.phase === "collect") {
    const url = intakeUrl(callSid, "collect", { priority: priorityQ, attempt: "1" });
    let intro = "Tell me what's going on — I'm here to help.";
    if (menuPriority === "P1") intro = "I'm here for you — sounds like this might be urgent, so let's get you taken care of.";
    else if (menuPriority === "P2") intro = "Same-day service — let's figure out what's going on and get you comfortable again.";
    else if (menuPriority === "P3") intro = "Happy to help with your service request — take your time.";
    return twimlResponse(twimlGatherSpeechDetailed(url, intro));
  }

  if (state.phase === "address_retry" && state.activeField === "address") {
    const url = intakeUrl(callSid, "repeat", { field: "address" });
    return twimlResponse(
      twimlGatherSpeechField(url, ADDRESS_VERIFY_FAIL_PROMPT),
    );
  }

  if (state.phase === "repeat" && state.activeField) {
    const field = state.activeField;
    const url = intakeUrl(callSid, "repeat", { field });
    return twimlResponse(twimlGatherSpeechField(url, fieldRepeatPrompt(field)));
  }

  if (state.phase === "verify" && state.activeField) {
    const field = state.activeField;
    const value = state.draft[field];
    const url = intakeUrl(callSid, "verify", { field });
    return twimlResponse(twimlGatherDtmfYesNo(url, fieldVerifyPrompt(field, value)));
  }

  if (state.phase === "slot_pick" && state.offeredSlots?.length) {
    const url = intakeUrl(callSid, "slot_pick");
    return twimlResponse(
      twimlGatherDtmfSlots(
        url,
        slotPickPrompt(state.offeredSlots),
        state.offeredSlots.length,
      ),
    );
  }

  if (state.phase === "final") {
    const url = intakeUrl(callSid, "final");
    return twimlResponse(twimlGatherDtmfYesNo(url, finalConfirmPrompt(state)));
  }

  return twimlResponse(twimlSay(CUSTOMER_REQUEST_RECEIVED_MESSAGE));
}

export function twimlGoodbyeAfterCommit(
  hasSlot?: boolean,
  afterHours?: boolean,
): string {
  if (afterHours && !hasSlot) {
    return twimlResponse(twimlSay(afterHoursPhoneGoodbye()));
  }
  const msg = hasSlot
    ? CUSTOMER_SLOT_CONFIRMED_MESSAGE
    : CUSTOMER_REQUEST_RECEIVED_MESSAGE;
  return twimlResponse(twimlSay(msg));
}

export function twimlErrorGoodbye(message: string): string {
  return twimlResponse(twimlSay(message));
}

export function parseDtmfYesNo(digit: string | null): "yes" | "no" | null {
  if (digit === "1") return "yes";
  if (digit === "2") return "no";
  return null;
}

export function intakeUrlForMenu(priority: string, afterHours = false): string {
  const base = getTwilioWebhookBaseUrl();
  const q = new URLSearchParams({
    phase: "collect",
    priority,
    attempt: "1",
  });
  if (afterHours) q.set("afterHours", "1");
  return `${base}/api/twilio/intake?${q.toString()}`;
}
