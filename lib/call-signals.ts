import type { CallRecord } from "./operations-analytics";

const CALLBACK_PATTERN =
  /\b(call\s*back|callback|call me back|return my call|please call)\b/i;
const VOICEMAIL_PATTERN =
  /\b(voicemail|voice mail|left a message|after the (?:beep|tone))\b/i;

export function isCallbackRequest(call: Pick<CallRecord, "transcript" | "symptom" | "arrivalWindow">): boolean {
  const text = `${call.transcript ?? ""} ${call.symptom ?? ""} ${call.arrivalWindow ?? ""}`;
  return CALLBACK_PATTERN.test(text);
}

export function isVoicemail(
  call: Pick<CallRecord, "transcript" | "symptom" | "recordingUrl">,
): boolean {
  if (call.recordingUrl && (call.transcript?.trim().length ?? 0) < 20) return true;
  const text = `${call.transcript ?? ""} ${call.symptom ?? ""}`;
  return VOICEMAIL_PATTERN.test(text);
}

export function isEmergencyCall(priority?: string): boolean {
  return priority === "P1";
}
