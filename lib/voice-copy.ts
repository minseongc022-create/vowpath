/** Warm, soft US English voice prompts — gentle restoration emergency tone. */

import type { ShopVertical } from "./shop-vertical.js";
import { getVerticalConfig } from "./vertical-config.js";

export const voiceGatherMissedChoice =
  "I didn't quite catch that — no worries. Call us back any time; we're here for you.";

export const voiceGatherMissedSpeech =
  "I didn't hear you that time — that's okay. Call whenever you're ready.";

export const voiceGatherMissedDtmf =
  "I didn't get that — no problem. Call us back any time, day or night.";

export const voiceLinkSmsSent =
  "Perfect — I just sent a text to your phone. Tap the link, fill in a few details, and our team will take it from there. Thank you for calling.";

export const voiceLinkSmsFailed =
  "I'm sorry — that text didn't go through. Let's handle everything right here on this call. I'm with you.";

export const voicePhoneIntakeIntro =
  "I'm going to grab a few quick details — take your time, there's no rush.";

/** @deprecated Generic fallback — prefer voicePhoneIntakePromptForVertical(vertical). */
export const voicePhoneIntakePrompt =
  "Whenever you're ready — your name, the property address, and what's going on. I'm listening.";

/** Vertical-aware version of the main intake prompt. */
export function voicePhoneIntakePromptForVertical(vertical?: ShopVertical | string): string {
  if (vertical === "restoration") {
    return (
      "Whenever you're ready — your name, the address, and what's happening: water, fire, mold, or sewage."
    );
  }
  if (vertical === "hvac") {
    return (
      "Whenever you're ready — your name, the service address, and what's wrong: no heat, no cool, or a strange noise."
    );
  }
  if (vertical) {
    const examples = getVerticalConfig(vertical as ShopVertical)
      .issueExamples.slice(0, 3)
      .join(", ");
    return `Whenever you're ready — your name, the address, and what's going on. For example: ${examples}.`;
  }
  return voicePhoneIntakePrompt;
}

export const voiceGoAhead = "Take your time — I'm listening.";

export const voiceCollectRetry =
  "I'm sorry — I didn't catch all of that. Could you say it once more? Name, address, and what's going on.";

export const voicePhoneIntakeLinkFallbackSent =
  "The line's a little rough — no worries. I sent you a text with a link. Tap it when you can and our team will jump on it.";

export const voicePhoneIntakeLinkFallbackFailed =
  "I'm sorry — I'm having trouble on this call. If you can, hang up and call back, then say text link at the menu for a form by SMS. We appreciate your patience.";

/** Spoken when clear P1 water auto-dispatch is confirmed. */
export const voiceDispatchConfirmed =
  "Thank you — our on-call crew is being notified now. You'll get a confirmation text in just a moment. Help is on the way.";

/** Spoken when intake is held for owner review. */
export const voiceDispatchPendingReview =
  "Thank you — we have everything. Our team is reviewing your request and you'll hear back very soon.";

export const voiceStormSurgeIntro =
  "We're getting a lot of calls right now — please don't worry. You're in our queue and we'll take care of you.";

/** Empathy-first opener for urgent (P1) situations. */
export const voiceEmergencyEmpathy =
  "I'm so sorry you're dealing with this — let's get someone out to you. Just a couple quick details.";
