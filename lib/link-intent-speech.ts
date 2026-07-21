/** Caller speech that means "send me the text link now" — no follow-up questions. */
const LINK_INTENT_PHRASES = [
  "text link",
  "text me",
  "send me",
  "send a link",
  "the link",
  "quick link",
  "text form",
  "sms",
  "message me",
  "on my phone",
  "my phone",
  "just text",
  "just send",
  "form by text",
  "link please",
  "text please",
] as const;

export function isLinkIntentSpeech(speech: string | null | undefined): boolean {
  const text = (speech ?? "").trim().toLowerCase();
  if (!text) return false;
  if (LINK_INTENT_PHRASES.some((phrase) => text.includes(phrase))) return true;
  // Short answers right after "press 1 for link" prompt
  if (/^(text|link|one|1)\.?$/.test(text)) return true;
  return false;
}

/** Caller wants to stay on the phone (not the text link). */
export function isPhoneIntentSpeech(speech: string | null | undefined): boolean {
  const text = (speech ?? "").trim().toLowerCase();
  if (!text) return false;
  return (
    text.includes("on the call") ||
    text.includes("this call") ||
    text.includes("talk") ||
    text.includes("phone") ||
    text.includes("speak") ||
    /^(two|2|phone)\.?$/.test(text)
  );
}
