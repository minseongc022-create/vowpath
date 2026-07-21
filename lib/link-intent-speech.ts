/** Caller speech that means "send me the text link now" — no follow-up questions. */
const LINK_INTENT_PHRASES = [
  "text link",
  "text me",
  "text it",
  "send me",
  "send a link",
  "send it",
  "the link",
  "quick link",
  "text form",
  "sms",
  "message me",
  "message",
  "on my phone",
  "my phone",
  "to my phone",
  "just text",
  "just send",
  "form by text",
  "link please",
  "text please",
  "can you text",
  "shoot me a text",
  "send a text",
  "the text",
  "the form",
  "fill out",
  "form on my phone",
] as const;

export function isLinkIntentSpeech(speech: string | null | undefined): boolean {
  const text = (speech ?? "").trim().toLowerCase();
  if (!text) return false;
  if (LINK_INTENT_PHRASES.some((phrase) => text.includes(phrase))) return true;
  // Short answers right after "say text link or press 1"
  if (/^(text|link|sms|form|one|1|first)\.?$/.test(text)) return true;
  return false;
}

/** Caller wants to stay on the phone (not the text link). */
export function isPhoneIntentSpeech(speech: string | null | undefined): boolean {
  const text = (speech ?? "").trim().toLowerCase();
  if (!text) return false;
  if (
    text.includes("on the call") ||
    text.includes("this call") ||
    text.includes("on the phone") ||
    text.includes("stay on") ||
    text.includes("talk to") ||
    text.includes("speak to") ||
    text.includes("tell you") ||
    text.includes("walk me through") ||
    text.includes("right now") ||
    text.includes("with you") ||
    (text.includes("talk") && !text.includes("text")) ||
    (text.includes("phone") && !text.includes("text"))
  ) {
    return true;
  }
  return /^(two|2|second|phone|call|talk)\.?$/.test(text);
}
