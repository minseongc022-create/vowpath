import { isLinkIntentSpeech, isPhoneIntentSpeech } from "./link-intent-speech";
import { isUrgentCallerSpeech } from "./urgent-speech-bypass";

export type ChannelChoice = "link" | "phone" | "unclear";

/** Booking channel menu: press/say 1 = text link · 2 = phone. */
export function resolveBookingChannelChoice(
  digit: string | null | undefined,
  speech: string | null | undefined,
): ChannelChoice {
  if (digit === "1") return "link";
  if (digit === "2") return "phone";

  const said = (speech ?? "").trim();
  if (isLinkIntentSpeech(said)) return "link";
  if (isPhoneIntentSpeech(said)) return "phone";
  if (isUrgentCallerSpeech(said)) return "phone";

  return "unclear";
}

/** Estimate menu: press/say 1 = phone · 2 = text link. */
export function resolveEstimateChannelChoice(
  digit: string | null | undefined,
  speech: string | null | undefined,
): ChannelChoice {
  if (digit === "2") return "link";
  if (digit === "1") return "phone";

  const said = (speech ?? "").trim();
  if (isLinkIntentSpeech(said)) return "link";
  if (isPhoneIntentSpeech(said)) return "phone";

  return "unclear";
}

/** Main menu: press/say 1 = service · 2 = estimate. */
export function resolveMainMenuChoice(
  digit: string | null | undefined,
  speech: string | null | undefined,
): "booking" | "estimate" | "unclear" {
  if (digit === "1") return "booking";
  if (digit === "2") return "estimate";

  const text = (speech ?? "").trim().toLowerCase();
  if (!text) return "unclear";
  if (
    text.includes("estimate") ||
    text.includes("quote") ||
    text.includes("bid") ||
    text.includes("project")
  ) {
    return "estimate";
  }
  if (
    isUrgentCallerSpeech(text) ||
    text.includes("service") ||
    text.includes("book") ||
    text.includes("emergency") ||
    text.includes("repair")
  ) {
    return "booking";
  }
  return "unclear";
}
