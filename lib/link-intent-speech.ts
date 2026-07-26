/**
 * Caller speech for IVR channel choice: text/SMS link vs stay on the phone.
 * Keep phrases short and telephony-STT friendly (mishearings included).
 */

const LINK_INTENT_PHRASES = [
  "text link",
  "text me",
  "text it",
  "send me",
  "send a link",
  "send the link",
  "send it",
  "the link",
  "quick link",
  "text form",
  "by text",
  "via text",
  "through text",
  "texting",
  "i'll text",
  "ill text",
  "do the text",
  "do it by text",
  "finish by text",
  "sms",
  "message me",
  "on my phone",
  "to my phone",
  "just text",
  "just send",
  "form by text",
  "link please",
  "text please",
  "can you text",
  "shoot me a text",
  "send a text",
  "send the text",
  "the text",
  "the form",
  "fill out",
  "form on my phone",
  "text option",
  "link option",
] as const;

const PHONE_INTENT_PHRASES = [
  "on the call",
  "this call",
  "on the phone",
  "over the phone",
  "by phone",
  "via phone",
  "by the phone",
  "stay on",
  "stay on the line",
  "keep talking",
  "talk to",
  "speak to",
  "talk with",
  "speak with",
  "tell you",
  "walk me through",
  "right here",
  "on this line",
  "this line",
  "talk now",
  "speak now",
  "i'll talk",
  "ill talk",
  "let's talk",
  "lets talk",
  "i want to talk",
  "i wanna talk",
  "talk option",
  "phone option",
  "do it by phone",
  "finish by phone",
  "on the phone please",
  "phone please",
] as const;

export type LinkIntentOptions = {
  /** When true, bare "1" / "one" / "first" count as link (channel submenu only). */
  allowDigitWords?: boolean;
};

export function isLinkIntentSpeech(
  speech: string | null | undefined,
  options: LinkIntentOptions = {},
): boolean {
  const text = (speech ?? "").trim().toLowerCase().replace(/[.!?]+$/g, "");
  if (!text) return false;

  // Prefer phone if they clearly want to talk (avoid "text me on the phone" edge cases below).
  if (
    /\b(talk|speak)\b/.test(text) &&
    /\b(phone|call)\b/.test(text) &&
    !/\b(text|sms|link|form)\b/.test(text)
  ) {
    return false;
  }

  if (LINK_INTENT_PHRASES.some((phrase) => text.includes(phrase))) return true;

  // Standalone / short answers after "say text or phone"
  if (/^(text|link|sms|form|texto)\.?$/.test(text)) return true;
  if (/^(by text|via text|the text|a text|texting)\.?$/.test(text)) return true;

  if (options.allowDigitWords !== false) {
    // Channel menu: "one" / "1" / "first" → text link
    if (/^(one|1|first)\.?$/.test(text)) return true;
  }

  // "message" alone is weak — require message + me/link/text context
  if (/\bmessage\b/.test(text) && /\b(me|link|text|form|sms)\b/.test(text)) return true;

  return false;
}

/** Caller wants to stay on the phone (not the text link). */
export function isPhoneIntentSpeech(speech: string | null | undefined): boolean {
  const text = (speech ?? "").trim().toLowerCase().replace(/[.!?]+$/g, "");
  if (!text) return false;

  // Strong link cues win (checked by callers first usually, but keep safe).
  if (
    /\b(text link|text me|send (me )?a? ?link|by text|via text|sms|the form)\b/.test(text)
  ) {
    return false;
  }

  if (PHONE_INTENT_PHRASES.some((phrase) => text.includes(phrase))) return true;

  if (
    (text.includes("talk") && !text.includes("text")) ||
    (text.includes("speak") && !text.includes("text")) ||
    (text.includes("phone") && !text.includes("text") && !text.includes("sms")) ||
    (text.includes("call") && !text.includes("text") && text.length < 40)
  ) {
    return true;
  }

  return /^(two|2|second|phone|call|talk|speak|telephone)\.?$/.test(text);
}
