/** Warm, professional US English voice prompts — restoration emergency tone. */

import type { ShopVertical } from "./shop-vertical.js";
import { getVerticalConfig } from "./vertical-config.js";

export const voiceGatherMissedChoice =
  "I didn't quite catch that — no worries at all. Please feel free to call us back any time, and we'll be right here.";

export const voiceGatherMissedSpeech =
  "I didn't hear anything that time — that's okay. Give us a ring whenever you're ready, and we'll take great care of you.";

export const voiceGatherMissedDtmf =
  "I didn't get that — not a problem. Call us back any time, day or night, and we'll be happy to help.";

export const voiceLinkSmsSent =
  "Perfect! I just sent a text to your phone. Tap the link, fill out a few quick details, and our team will take it from there. Thank you so much for calling!";

export const voiceLinkSmsFailed =
  "I'm sorry — that text didn't go through. Not to worry, let's handle everything right here on this call. I'm ready whenever you are.";

export const voicePhoneIntakeIntro =
  "I'll get our team on this right away. Let me grab a few quick details — take your time, there's no rush.";

/** @deprecated Generic fallback — prefer voicePhoneIntakePromptForVertical(vertical). */
export const voicePhoneIntakePrompt =
  "Whenever you're ready, go ahead and tell me your name, the property address, " +
  "and what's happening — for example, water in the basement, smoke damage, or mold. I'm listening.";

/** Vertical-aware version of the main intake prompt. */
export function voicePhoneIntakePromptForVertical(vertical?: ShopVertical | string): string {
  if (vertical === "restoration") {
    return (
      "Go ahead whenever you're ready — just tell me your name, the property address, " +
      "and what kind of damage you're dealing with: water, fire, mold, or sewage."
    );
  }
  if (vertical === "hvac") {
    return (
      "Go ahead whenever you're ready — tell me your name, the service address, " +
      "and what's going on with your system, like no heat, no cooling, or an unusual noise."
    );
  }
  if (vertical) {
    const examples = getVerticalConfig(vertical as ShopVertical)
      .issueExamples.slice(0, 3)
      .join(", ");
    return `Go ahead whenever you're ready — tell me your name, the service address, and what's going on. For example: ${examples}.`;
  }
  return voicePhoneIntakePrompt;
}

export const voiceGoAhead = "Go ahead whenever you're ready — I'm listening.";

export const voiceCollectRetry =
  "I'm sorry, I didn't catch all of that. Could you say it one more time? " +
  "Just your name, the full address, and what's going on — water, fire, mold, or sewage. Take your time.";

export const voicePhoneIntakeLinkFallbackSent =
  "It sounds like the line isn't cooperating — no problem at all. I've sent you a text with a link. " +
  "Just tap it when you're ready and fill in the details. Our team will be right on it. Thank you for your patience!";

export const voicePhoneIntakeLinkFallbackFailed =
  "I'm so sorry — I'm having a little trouble on this call. " +
  "If you can, please hang up and call back, then press 1 and we'll text you a link to send your request in writing. We really appreciate your patience.";

/** Spoken when clear P1 water auto-dispatch is confirmed. */
export const voiceDispatchConfirmed =
  "Thank you so much — our on-call crew is being notified right now, and you'll receive a confirmation text in just a moment. Help is on the way!";

/** Spoken when intake is held for owner review. */
export const voiceDispatchPendingReview =
  "Thank you — we have everything we need. Our team is reviewing your request right now and you'll hear back very shortly. We've got you covered.";

export const voiceStormSurgeIntro =
  "We're receiving a high volume of calls right now, but please don't worry — you are in our queue and we will take care of you. Thank you so much for your patience.";

/** Empathy-first opener for urgent (P1) situations. */
export const voiceEmergencyEmpathy =
  "I'm so sorry you're dealing with this — let's get someone out to you right away. I just need a couple of quick details.";
