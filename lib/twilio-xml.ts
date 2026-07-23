import { channelChoiceGatherHint, channelChoiceVoicePrompt } from "./link-intake-copy";
import { buildSpeechHints } from "./twilio-voice-flow";
import type { ShopVertical } from "./shop-vertical";
import { twilioSayVoiceEnUs } from "./twilio-say-voice";
import {
  voiceGatherMissedChoice,
  voiceGatherMissedDtmf,
  voiceGatherMissedSpeech,
  voiceGoAhead,
  voicePhoneIntakePromptForVertical,
  voiceStormSurgeIntro,
} from "./voice-copy";

export { twilioSayVoiceEnUs };

/** Main menu is English-only (no Spanish option). */
export function mainMenuIsEnglishOnly(): boolean {
  return true;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function twimlResponse(inner: string, statusCallbackUrl?: string): string {
  if (statusCallbackUrl?.trim()) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response statusCallback="${escapeXml(statusCallbackUrl)}" statusCallbackMethod="POST" statusCallbackEvent="initiated ringing answered completed">${inner}</Response>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
}

export function twimlMessage(body: string): string {
  return `<Message>${escapeXml(body)}</Message>`;
}

export function twimlSay(
  message: string,
  language: "en-US" | "ko-KR" | "es-US" = "en-US",
): string {
  const voice =
    language === "ko-KR"
      ? "Google.ko-KR-Chirp3-HD-Aoede"
      : language === "es-US"
        ? "Google.es-US-Chirp3-HD-Aoede"
        : twilioSayVoiceEnUs();
  return `<Say voice="${voice}" language="${language}">${escapeXml(message)}</Say>`;
}

export function twimlGatherChannelChoice(
  actionUrl: string,
  shopName: string,
  afterHours = false,
  stormMode = false,
): string {
  const stormLine = stormMode ? `${twimlSay(voiceStormSurgeIntro)}` : "";
  const prompt = channelChoiceVoicePrompt(shopName, afterHours);
  const hint = channelChoiceGatherHint();
  return `${stormLine}${twimlSay(prompt)}<Gather input="dtmf speech" numDigits="1" speechTimeout="auto" speechModel="phone_call" enhanced="true" timeout="18" action="${escapeXml(actionUrl)}" method="POST" hints="text link, link, text, SMS, form, talk, phone, call">${twimlSay(hint)}</Gather>${twimlSay(voiceGatherMissedChoice)}`;
}

export function twimlGatherDtmfMenu(actionUrl: string): string {
  const prompt =
    "Thank you so much for calling our after-hours H V A C line — we're glad to help. " +
    "Press 1 if you have no heat, no cool, a leak, or a safety emergency. " +
    "Press 2 for same-day comfort service, if something's just not working quite right. " +
    "Or press 3 for maintenance or anything non-urgent. ";
  return `${twimlSay(prompt)}<Gather input="dtmf" numDigits="1" timeout="10" enhanced="true" action="${escapeXml(actionUrl)}" method="POST">${twimlSay("Go ahead whenever you're ready.")}</Gather>${twimlSay(voiceGatherMissedDtmf)}`;
}

/** Top-level menu played at the very start of every call. */
export function twimlGatherMainMenu(
  actionUrl: string,
  shopName: string,
  stormMode = false,
  customGreeting = "",
): string {
  const stormLine = stormMode ? twimlSay(voiceStormSurgeIntro) : "";
  // Menu instructions are never customizable — only the opening line is, so the DTMF
  // options callers rely on always play verbatim.
  const opening = customGreeting.trim()
    ? customGreeting.trim()
    : `Thank you for calling ${shopName}.`;
  const prompt = `${opening} To book service or report an emergency, say service or press 1. For a free estimate, say estimate or press 2.`;
  return `${stormLine}${twimlSay(prompt)}<Gather input="dtmf speech" numDigits="1" speechTimeout="auto" speechModel="phone_call" enhanced="true" timeout="18" action="${escapeXml(actionUrl)}" method="POST" hints="service, emergency, book, estimate, quote">${twimlSay("Say service or estimate, or press 1 or 2 — whenever you're ready.")}</Gather>`;
}

/** Booking sub-menu: talk to the AI assistant now, or get a booking link by text. */
export function twimlGatherBookingChannel(actionUrl: string): string {
  const prompt =
    "I'm here with you. To talk with us on this call, press 1. " +
    "Or to get a quick form by text instead, press 2. Message and data rates may apply.";
  return `${twimlSay(prompt)}<Gather input="dtmf" numDigits="1" timeout="12" enhanced="true" action="${escapeXml(actionUrl)}" method="POST">${twimlSay("Whenever you're ready.")}</Gather>${twimlSay(voiceGatherMissedDtmf)}`;
}

/**
 * Spanish intake — simpler than the English tree on purpose: one open question, one
 * speech capture, always reviewed by the owner before dispatch (no auto-confirm path).
 */
export function twimlGatherSpanishIntake(actionUrl: string): string {
  const prompt =
    "Por favor describa su emergencia o el servicio que necesita, incluyendo su nombre y dirección. " +
    "Le responderemos en breve.";
  return `${twimlSay(prompt, "es-US")}<Gather input="speech" language="es-US" speechTimeout="auto" speechModel="phone_call" enhanced="true" timeout="20" action="${escapeXml(actionUrl)}" method="POST"></Gather>${twimlSay("No escuchamos su respuesta. Por favor intente de nuevo.", "es-US")}`;
}

export function twimlSpanishIntakeConfirmation(): string {
  return twimlSay(
    "Gracias. Hemos recibido su solicitud y alguien se comunicará con usted en breve. Adiós.",
    "es-US",
  );
}

/** Estimate sub-menu: text form vs. give details on the call now. */
export function twimlGatherEstimateMenu(actionUrl: string): string {
  const prompt =
    "We'd love to put together a free estimate. " +
    "To tell us about your project on this call, say talk on the phone or press 1. " +
    "Or to get a short form by text, say text link or press 2. Message and data rates may apply.";
  return `${twimlSay(prompt)}<Gather input="dtmf speech" numDigits="1" speechTimeout="auto" speechModel="phone_call" enhanced="true" timeout="18" action="${escapeXml(actionUrl)}" method="POST" hints="text link, link, text, form, talk, phone, estimate">${twimlSay("Say text link or press 2, or say talk on the phone or press 1.")}</Gather>${twimlSay(voiceGatherMissedDtmf)}`;
}

/** Phone-number capture: accepts spoken digits or keypad entry ending in #. Falls back
 * to caller ID in the caller if neither is usable, so this step never blocks the flow. */
export function twimlGatherPhoneNumber(actionUrl: string, prompt: string): string {
  const help = "You can say your number, or type it on your keypad followed by the pound sign.";
  return `${twimlSay(prompt)}<Gather input="dtmf speech" speechTimeout="auto" speechModel="phone_call" enhanced="true" finishOnKey="#" timeout="12" action="${escapeXml(actionUrl)}" method="POST">${twimlSay(help)}</Gather>${twimlSay(voiceGatherMissedSpeech)}`;
}

export function twimlGatherSpeechDetailed(
  actionUrl: string,
  intro: string,
  followUp?: string,
  vertical?: ShopVertical | string,
): string {
  const defaultFollowUp = voicePhoneIntakePromptForVertical(vertical);
  const prompt = followUp ?? defaultFollowUp;
  return `${twimlSay(intro)}<Gather input="speech" speechTimeout="auto" speechModel="phone_call" enhanced="true" timeout="20" hints="${escapeXml(buildSpeechHints(vertical))}" language="en-US" action="${escapeXml(actionUrl)}" method="POST">${twimlSay(prompt)}</Gather>${twimlSay(voiceGatherMissedSpeech)}`;
}

export function twimlGatherSpeechField(
  actionUrl: string,
  prompt: string,
  vertical?: ShopVertical | string,
  /** Extra question-specific words to boost recognition (e.g. damage types on
   *  the "what kind of damage" question, street suffixes on the address one). */
  extraHints?: string,
): string {
  const hints = [buildSpeechHints(vertical), extraHints]
    .filter(Boolean)
    .join(", ");
  return `${twimlSay(prompt)}<Gather input="speech" speechTimeout="auto" speechModel="phone_call" enhanced="true" timeout="20" hints="${escapeXml(hints)}" language="en-US" action="${escapeXml(actionUrl)}" method="POST">${twimlSay(voiceGoAhead)}</Gather>${twimlSay(voiceGatherMissedSpeech)}`;
}

export function twimlGatherDtmfYesNo(actionUrl: string, prompt: string): string {
  const help =
    "Press 1 for yes, or 2 for no.";
  return `${twimlSay(prompt)}<Gather input="dtmf" numDigits="1" timeout="12" enhanced="true" action="${escapeXml(actionUrl)}" method="POST">${twimlSay(help)}</Gather>${twimlSay(voiceGatherMissedDtmf)}`;
}

/** Caller picks visit window: digits 1–5 (numDigits=1, up to 5 options). */
export function twimlGatherDtmfSlots(
  actionUrl: string,
  prompt: string,
  slotCount: number,
): string {
  const max = Math.min(5, Math.max(1, slotCount));
  const help = `Press 1 through ${max} to choose your visit window.`;
  return `${twimlSay(prompt)}<Gather input="dtmf" numDigits="1" timeout="14" enhanced="true" action="${escapeXml(actionUrl)}" method="POST">${twimlSay(help)}</Gather>${twimlSay(voiceGatherMissedDtmf)}`;
}

/** Generic closed-choice question (e.g. damage severity, equipment type) — digits 1–N. */
export function twimlGatherDtmfChoice(
  actionUrl: string,
  prompt: string,
  optionCount: number,
): string {
  const max = Math.min(9, Math.max(1, optionCount));
  const help = `Press the number for your choice, 1 through ${max}.`;
  return `${twimlSay(prompt)}<Gather input="dtmf" numDigits="1" timeout="12" enhanced="true" action="${escapeXml(actionUrl)}" method="POST">${twimlSay(help)}</Gather>${twimlSay(voiceGatherMissedDtmf)}`;
}

export function twimlStartCallRecording(recordingStatusCallback: string): string {
  if (process.env.CALL_RECORDING_ENABLED === "false") return "";
  return `<Start><Recording recordingStatusCallback="${escapeXml(recordingStatusCallback)}" recordingStatusCallbackMethod="POST" /></Start>`;
}

/**
 * Forwards the live call to a Retell AI voice agent's phone number.
 * Explicitly sets callerId to one of OUR owned Twilio numbers — without it,
 * Twilio's <Dial> defaults to passing through the original caller's raw
 * number as the outbound caller ID, which foreign/unverified numbers get
 * rejected for (carrier fails the leg in ~0s with no ring at all).
 */
export function twimlDialForward(
  toNumber: string,
  callerId?: string,
  actionUrl?: string,
): string {
  const callerIdAttr = callerId ? ` callerId="${escapeXml(callerId)}"` : "";
  // When the forwarded leg fails to connect (or ends), Twilio POSTs to
  // actionUrl so we can gracefully fall back to the scripted intake instead
  // of dead-ending the call (which sounds like "answered then hung up").
  const actionAttr = actionUrl
    ? ` action="${escapeXml(actionUrl)}" method="POST"`
    : "";
  return `<Dial${callerIdAttr}${actionAttr}>${escapeXml(toNumber)}</Dial>`;
}

/**
 * Bridge a live Twilio call to Retell via SIP (recommended).
 * Requires a prior POST /v2/register-phone-call that returns call_id.
 */
export function twimlDialRetellSip(callId: string, actionUrl?: string): string {
  const sipUri = `sip:${callId}@sip.retellai.com`;
  const actionAttr = actionUrl
    ? ` action="${escapeXml(actionUrl)}" method="POST"`
    : "";
  return `<Dial${actionAttr}><Sip>${escapeXml(sipUri)}</Sip></Dial>`;
}

/**
 * "Effiroad-number-as-main" live pass-through: ring the shop's own phone, and
 * if nobody there answers within `timeout` seconds (or it's busy/failed), Twilio
 * POSTs to `fallbackUrl` so the AI can still catch the call. The original
 * caller's number passes through as the caller ID by default.
 */
export function twimlDialToShop(
  shopPhone: string,
  fallbackUrl: string,
  timeoutSeconds = 20,
): string {
  return `${twimlSay("One moment while I connect you.")}<Dial timeout="${timeoutSeconds}" action="${escapeXml(fallbackUrl)}" method="POST">${escapeXml(shopPhone)}</Dial>`;
}
