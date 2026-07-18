/** Keywords that indicate the caller is describing an urgent service need (skip link/phone choice). */
const URGENT_IVR_KEYWORDS = [
  "flood",
  "flooding",
  "water",
  "emergency",
  "backup",
  "sewage",
  "fire",
  "mold",
  "no heat",
  "no cool",
  "no ac",
  "gas smell",
  "gas",
  "leak",
  "urgent",
  "help me",
  "basement",
  "burst",
  "spreading",
] as const;

/** True when caller speech suggests they should go straight to phone intake. */
export function isUrgentCallerSpeech(speech: string | null | undefined): boolean {
  const text = (speech ?? "").trim().toLowerCase();
  if (!text) return false;
  if (URGENT_IVR_KEYWORDS.some((kw) => text.includes(kw))) return true;
  // Long unprompted description — treat as phone intake, not menu navigation.
  return text.split(/\s+/).filter(Boolean).length >= 10;
}
