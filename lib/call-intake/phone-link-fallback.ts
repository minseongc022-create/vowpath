import {
  createLinkIntakeSession,
  sendLinkIntakeSms,
} from "./link-intake-flow";
import { shopDisplayNameForUser } from "../link-intake-brand";
import { twimlResponse, twimlSay } from "../twilio-xml";
import type { CallIntakeState } from "./types";
import {
  voicePhoneIntakeLinkFallbackFailed,
  voicePhoneIntakeLinkFallbackSent,
} from "../voice-copy";

/** After this many misunderstandings, offer SMS link instead of more phone prompts. */
export const PHONE_INTAKE_STRIKE_LIMIT = 2;

export function bumpPhoneIntakeStrike(state: CallIntakeState): CallIntakeState {
  return {
    ...state,
    phoneIntakeStrikes: (state.phoneIntakeStrikes ?? 0) + 1,
  };
}

export function shouldOfferLinkIntakeFallback(state: CallIntakeState): boolean {
  return (state.phoneIntakeStrikes ?? 0) >= PHONE_INTAKE_STRIKE_LIMIT;
}

export async function buildLinkIntakeFallbackTwiml(params: {
  userId: string;
  callSid: string;
  callbackPhone: string;
  to: string;
}): Promise<string> {
  const phone = params.callbackPhone.replace(/^whatsapp:/, "").trim();
  if (!phone || phone === "unknown") {
    return twimlResponse(twimlSay(voicePhoneIntakeLinkFallbackFailed));
  }

  try {
    const shopName = await shopDisplayNameForUser(params.userId);
    const session = await createLinkIntakeSession({
      userId: params.userId,
      callSid: params.callSid,
      from: phone,
      to: params.to,
      shopName,
      menuPriority: null,
    });

    const sms = await sendLinkIntakeSms({
      userId: params.userId,
      phone,
      token: session.token,
    });

    const message = sms.ok
      ? voicePhoneIntakeLinkFallbackSent
      : voicePhoneIntakeLinkFallbackFailed;
    return twimlResponse(twimlSay(message));
  } catch (e) {
    console.error("[phone-link-fallback]", e);
    return twimlResponse(twimlSay(voicePhoneIntakeLinkFallbackFailed));
  }
}
