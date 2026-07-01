import type { JobPriority } from "./types";
import type { ShopVertical } from "./shop-vertical";

const HVAC_SPEECH_HINTS =
  "no heat,no cool,not cooling,leak,gas smell,water leak,emergency,tonight,today,maintenance,tune up";

const RESTORATION_SPEECH_HINTS =
  "water damage,flood,sewage,sewage backup,mold,black mold,fire damage,smoke damage,water in basement,burst pipe,insurance claim,deductible,emergency,tonight,today,address,phone number,callback";

/** Legacy default — kept for callers that haven't switched to buildSpeechHints yet. */
export const SPEECH_HINTS = HVAC_SPEECH_HINTS;

/** Speech recognition hints tuned per trade vertical. Defaults to HVAC hints. */
export function buildSpeechHints(vertical?: ShopVertical | string): string {
  if (vertical === "restoration") return RESTORATION_SPEECH_HINTS;
  return HVAC_SPEECH_HINTS;
}

export function menuPriorityFromDigit(digit: string | null): JobPriority | null {
  if (digit === "1") return "P1";
  if (digit === "2") return "P2";
  if (digit === "3") return "P3";
  return null;
}

export function ivrContextForPriority(priority: JobPriority): string {
  if (priority === "P1") {
    return "Caller selected EMERGENCY (no heat, no cool, leak, or safety issue).";
  }
  if (priority === "P2") {
    return "Caller selected SAME-DAY comfort issue (not life safety).";
  }
  return "Caller selected ROUTINE or maintenance (non-urgent).";
}

export function buildSpeechNotes(speech: string, menuPriority: JobPriority | null): string {
  if (!menuPriority) return speech;
  return `${ivrContextForPriority(menuPriority)}\nCustomer said: ${speech}`;
}

export function parsePriorityParam(value: string | null): JobPriority | null {
  if (value === "P1" || value === "P2" || value === "P3") return value;
  return null;
}
