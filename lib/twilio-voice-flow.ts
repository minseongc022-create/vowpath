import type { JobPriority } from "./types";

export const SPEECH_HINTS =
  "no heat,no cool,not cooling,leak,gas smell,water leak,emergency,tonight,today,maintenance,tune up";

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
