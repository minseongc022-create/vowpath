import { channelChoiceGatherHint, channelChoiceVoicePrompt } from "./link-intake-copy";
import { SPEECH_HINTS } from "./twilio-voice-flow";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function twimlResponse(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
}

export function twimlMessage(body: string): string {
  return `<Message>${escapeXml(body)}</Message>`;
}

export function twimlSay(message: string, language: "en-US" | "ko-KR" = "en-US"): string {
  const voice = language === "ko-KR" ? "Polly.Seoyeon" : "Polly.Joanna";
  return `<Say voice="${voice}" language="${language}">${escapeXml(message)}</Say>`;
}

export function twimlGatherChannelChoice(
  actionUrl: string,
  shopName: string,
  afterHours = false,
): string {
  const prompt = channelChoiceVoicePrompt(shopName, afterHours);
  const hint = channelChoiceGatherHint();
  return `${twimlSay(prompt)}<Gather input="dtmf speech" numDigits="1" speechTimeout="auto" timeout="12" action="${escapeXml(actionUrl)}" method="POST">${twimlSay(hint)}</Gather>${twimlSay("We did not receive your selection. Goodbye.")}`;
}

export function twimlGatherDtmfMenu(actionUrl: string): string {
  const prompt =
    "Thank you for calling the after-hours H V A C line. " +
    "Press 1 if you have no heat, no cool, a leak, or a safety emergency. " +
    "Press 2 for same-day comfort, not working well. " +
    "Press 3 for maintenance or non-urgent. ";
  return `${twimlSay(prompt)}<Gather input="dtmf" numDigits="1" timeout="8" action="${escapeXml(actionUrl)}" method="POST">${twimlSay("Enter your choice now.")}</Gather>${twimlSay("We did not receive a selection. Goodbye.")}`;
}

export function twimlGatherSpeechDetailed(
  actionUrl: string,
  intro: string,
  followUp?: string,
): string {
  const defaultFollowUp =
    "Please speak slowly. " +
    "Say your first and last name, your full service street address with city, " +
    "whether you have heat or cool right now, " +
    "and describe the problem — for example no heat, no cool, or a tune-up. " +
    "We will call you back at the number you are calling from.";
  const prompt = followUp ?? defaultFollowUp;
  return `${twimlSay(intro)}<Gather input="speech" speechTimeout="3" speechModel="phone_call" hints="${escapeXml(SPEECH_HINTS)}" language="en-US" action="${escapeXml(actionUrl)}" method="POST">${twimlSay(prompt)}</Gather>${twimlSay("We did not hear a message. Goodbye.")}`;
}

export function twimlGatherSpeechField(actionUrl: string, prompt: string): string {
  return `${twimlSay(prompt)}<Gather input="speech" speechTimeout="3" speechModel="phone_call" hints="${escapeXml(SPEECH_HINTS)}" language="en-US" action="${escapeXml(actionUrl)}" method="POST">${twimlSay("Go ahead.")}</Gather>${twimlSay("We did not hear you. Goodbye.")}`;
}

export function twimlGatherDtmfYesNo(actionUrl: string, prompt: string): string {
  const help =
    "Press 1 for yes, or 2 for no.";
  return `${twimlSay(prompt)}<Gather input="dtmf" numDigits="1" timeout="10" action="${escapeXml(actionUrl)}" method="POST">${twimlSay(help)}</Gather>${twimlSay("We did not receive a response. Goodbye.")}`;
}

/** Caller picks visit window: digits 1–5 (numDigits=1, up to 5 options). */
export function twimlGatherDtmfSlots(
  actionUrl: string,
  prompt: string,
  slotCount: number,
): string {
  const max = Math.min(5, Math.max(1, slotCount));
  const help = `Press 1 through ${max} to choose your visit window.`;
  return `${twimlSay(prompt)}<Gather input="dtmf" numDigits="1" timeout="12" action="${escapeXml(actionUrl)}" method="POST">${twimlSay(help)}</Gather>${twimlSay("We did not receive a selection. Goodbye.")}`;
}

export function twimlStartCallRecording(recordingStatusCallback: string): string {
  if (process.env.CALL_RECORDING_ENABLED === "false") return "";
  return `<Start><Recording recordingStatusCallback="${escapeXml(recordingStatusCallback)}" recordingStatusCallbackMethod="POST" /></Start>`;
}
