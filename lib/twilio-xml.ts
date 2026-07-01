import { channelChoiceGatherHint, channelChoiceVoicePrompt } from "./link-intake-copy";
import { buildSpeechHints } from "./twilio-voice-flow";
import type { ShopVertical } from "./shop-vertical";
import {
  voiceGatherMissedChoice,
  voiceGatherMissedDtmf,
  voiceGatherMissedSpeech,
  voiceGoAhead,
  voicePhoneIntakePromptForVertical,
  voiceStormSurgeIntro,
} from "./voice-copy";

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

export function twimlSay(message: string, language: "en-US" | "ko-KR" = "en-US"): string {
  const voice = language === "ko-KR" ? "Polly.Seoyeon-Neural" : "Polly.Joanna-Neural";
  return `<Say voice="${voice}" language="${language}" rate="95%">${escapeXml(message)}</Say>`;
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
  return `${stormLine}${twimlSay(prompt)}<Gather input="dtmf speech" numDigits="1" speechTimeout="auto" enhanced="true" timeout="15" action="${escapeXml(actionUrl)}" method="POST">${twimlSay(hint)}</Gather>${twimlSay(voiceGatherMissedChoice)}`;
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
): string {
  const stormLine = stormMode ? twimlSay(voiceStormSurgeIntro) : "";
  const prompt = `Thank you for calling ${shopName}! Press 1 for emergency service, or press 2 to request a free estimate.`;
  return `${stormLine}${twimlSay(prompt)}<Gather input="dtmf" numDigits="1" timeout="15" enhanced="true" action="${escapeXml(actionUrl)}" method="POST">${twimlSay("Go ahead whenever you're ready.")}</Gather>${twimlSay(voiceGatherMissedDtmf)}`;
}

/** Estimate sub-menu: text form vs. give details on the call now. */
export function twimlGatherEstimateMenu(actionUrl: string): string {
  const prompt =
    "Wonderful — we'd love to put together a free estimate for you. " +
    "Press 1 to receive a quick estimate form by text, or press 2 to tell us the details right now.";
  return `${twimlSay(prompt)}<Gather input="dtmf" numDigits="1" timeout="12" enhanced="true" action="${escapeXml(actionUrl)}" method="POST">${twimlSay("Go ahead whenever you're ready.")}</Gather>${twimlSay(voiceGatherMissedDtmf)}`;
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
  return `${twimlSay(intro)}<Gather input="speech" speechTimeout="auto" speechModel="phone_call" enhanced="true" hints="${escapeXml(buildSpeechHints(vertical))}" language="en-US" action="${escapeXml(actionUrl)}" method="POST">${twimlSay(prompt)}</Gather>${twimlSay(voiceGatherMissedSpeech)}`;
}

export function twimlGatherSpeechField(
  actionUrl: string,
  prompt: string,
  vertical?: ShopVertical | string,
): string {
  return `${twimlSay(prompt)}<Gather input="speech" speechTimeout="auto" speechModel="phone_call" enhanced="true" hints="${escapeXml(buildSpeechHints(vertical))}" language="en-US" action="${escapeXml(actionUrl)}" method="POST">${twimlSay(voiceGoAhead)}</Gather>${twimlSay(voiceGatherMissedSpeech)}`;
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
