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

export function twimlSay(message: string): string {
  return `<Say voice="Polly.Joanna" language="en-US">${escapeXml(message)}</Say>`;
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
): string {
  const followUp =
    "Please speak slowly. " +
    "Say your name, street address and city, phone number, " +
    "and what is wrong. For example: no cool, indoor eighty-six degrees, two kids at home.";
  return `${twimlSay(intro)}<Gather input="speech" speechTimeout="3" speechModel="phone_call" hints="${escapeXml(SPEECH_HINTS)}" language="en-US" action="${escapeXml(actionUrl)}" method="POST">${twimlSay(followUp)}</Gather>${twimlSay("We did not hear a message. Goodbye.")}`;
}
