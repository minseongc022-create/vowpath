/** Warm, professional US English voice prompts — restoration emergency tone. */

import type { ShopVertical } from "./shop-vertical.js";
import { getVerticalConfig } from "./vertical-config.js";

export const voiceGatherMissedChoice =
  "I'm sorry, I didn't quite catch that — please feel free to call us back whenever it's convenient. We're always glad to help.";

export const voiceGatherMissedSpeech =
  "I'm sorry, I didn't hear anything that time — no worries at all. Give us another ring whenever you're ready.";

export const voiceGatherMissedDtmf =
  "I'm sorry, I didn't get that — please call us back anytime, we're happy to help.";

export const voiceLinkSmsSent =
  "Perfect — I've just sent a text to your phone. Simply tap the link to let us know what's going on. Thank you so much for calling!";

export const voiceLinkSmsFailed =
  "I'm sorry, that text didn't quite go through — no problem at all, let's take care of it right here on the call. I'm happy to help.";

export const voicePhoneIntakeIntro =
  "Let's get you taken care of right away. I'll walk you through a few quick details — take all the time you need.";

/** @deprecated Generic fallback — prefer voicePhoneIntakePromptForVertical(vertical). */
export const voicePhoneIntakePrompt =
  "Whenever you're ready, tell me your name, the property address, " +
  "and what's going on — like water in the basement, smoke damage, or mold. I'm listening.";

/** Vertical-aware version of the main "tell me what's going on" prompt. */
export function voicePhoneIntakePromptForVertical(vertical?: ShopVertical | string): string {
  if (vertical === "restoration") {
    return "Tell me your name, the property address, and what kind of damage — water, fire, mold, or sewage?";
  }
  if (vertical === "hvac") {
    return "Tell me your name, the service address, and what's going on with your system — like no heat, no cooling, or a noise?";
  }
  if (vertical) {
    const examples = getVerticalConfig(vertical as ShopVertical)
      .issueExamples.slice(0, 3)
      .join(", ");
    return `Tell me your name, the service address, and what's going on — for example, ${examples}.`;
  }
  return voicePhoneIntakePrompt;
}

export const voiceGoAhead = "Go ahead whenever you're ready.";

export const voiceCollectRetry =
  "I'm sorry about that — I didn't get all of it. Could you tell me once more? " +
  "Just your name, the full address, and what's happening — water, fire, mold, or sewage.";

export const voicePhoneIntakeLinkFallbackSent =
  "Phone lines can be tricky sometimes — I've just texted you a link instead. " +
  "Tap it and fill things out whenever you're ready. Thank you so much for your patience.";

export const voicePhoneIntakeLinkFallbackFailed =
  "I'm so sorry, I'm having a little trouble catching everything on this call. " +
  "If you're able to, please hang up and call back, then press 1 — we'll text you a link so you can send your request in writing.";

/** Spoken when clear P1 water auto-dispatch is confirmed (never before). */
export const voiceDispatchConfirmed =
  "Thank you so much — our on-call crew is being notified right now. You'll receive a confirmation text shortly.";

/** Spoken when intake is held for owner review. */
export const voiceDispatchPendingReview =
  "Thank you so much — we've got everything we need, and our team is confirming dispatch now. You'll hear back shortly.";

export const voiceStormSurgeIntro =
  "We're experiencing a high volume of calls right now, but please don't worry — you're in line, and we will absolutely take care of you.";

/** Empathy-first opener for urgent (P1) situations. */
export const voiceEmergencyEmpathy =
  "I'm so sorry to hear that — let's get someone out to you right away.";
