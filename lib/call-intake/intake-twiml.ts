import { getTwilioWebhookBaseUrl } from "../twilio-config";
import {
  twimlGatherDtmfChoice,
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
import { getVerticalConfig } from "../vertical-config.js";
import { voiceEmergencyEmpathy } from "../voice-copy";
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

  if (state.phase === "returning_customer" && state.returningCustomerMatch) {
    const { customerName, address } = state.returningCustomerMatch;
    const url = intakeUrl(callSid, "returning_customer");
    return twimlResponse(
      twimlGatherDtmfYesNo(
        url,
        `Welcome back! Is this still ${customerName} at ${address}? Press 1 for yes, or press 2 to start fresh.`,
      ),
    );
  }

  if (state.phase === "collect") {
    const url = intakeUrl(callSid, "collect", { priority: priorityQ, attempt: "1" });
    const knownReturningCustomer = Boolean(state.verified.customerName && state.verified.address);
    let intro = "I'm here to help — tell me what's going on.";
    if (knownReturningCustomer) intro = "Welcome back! What's going on this time?";
    else if (menuPriority === "P1") intro = `${voiceEmergencyEmpathy} Tell me what's going on.`;
    else if (menuPriority === "P2") intro = "Let's get you scheduled for same-day service — tell me what's going on so we can get you comfortable again.";
    else if (menuPriority === "P3") intro = "Happy to help with your service request — take all the time you need.";
    return twimlResponse(twimlGatherSpeechDetailed(url, intro, undefined, state.vertical));
  }

  if (state.phase === "address_retry" && state.activeField === "address") {
    const url = intakeUrl(callSid, "repeat", { field: "address" });
    return twimlResponse(
      twimlGatherSpeechField(url, ADDRESS_VERIFY_FAIL_PROMPT, state.vertical),
    );
  }

  if (state.phase === "repeat" && state.activeField) {
    const field = state.activeField;
    const url = intakeUrl(callSid, "repeat", { field });
    return twimlResponse(
      twimlGatherSpeechField(url, fieldRepeatPrompt(field, state.vertical), state.vertical),
    );
  }

  if (state.phase === "verify" && state.activeField) {
    const field = state.activeField;
    const value = state.draft[field];
    const url = intakeUrl(callSid, "verify", { field });
    return twimlResponse(
      twimlGatherDtmfYesNo(url, fieldVerifyPrompt(field, value, state.vertical)),
    );
  }

  if (state.phase === "optional_collect" && state.activeOptionalField) {
    const config = getVerticalConfig(state.vertical).optionalIntakeFields.find(
      (f) => f.key === state.activeOptionalField,
    );
    if (config) {
      const url = intakeUrl(callSid, "optional_collect", { field: config.key });
      const question = config.askPrompt ?? config.label;

      if (config.type === "choice" && config.choices) {
        const prompt =
          `${question} ` +
          config.choices.map((c, i) => `Press ${i + 1} for ${c}.`).join(" ");
        return twimlResponse(twimlGatherDtmfChoice(url, prompt, config.choices.length));
      }
      if (config.type === "checkbox") {
        return twimlResponse(
          twimlGatherDtmfYesNo(url, `${question} Press 1 for yes, press 2 for no.`),
        );
      }
      return twimlResponse(twimlGatherSpeechField(url, question, state.vertical));
    }
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
