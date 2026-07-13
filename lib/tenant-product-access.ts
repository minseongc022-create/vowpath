import { NextResponse } from "next/server";
import { isEntitled } from "./billing";
import {
  ensurePilotTrial,
  ensurePilotTrialForMappedPhone,
} from "./pilot-trial";
import { findUserById } from "./users-db";
import { resolveTenantUserId } from "./tenant-routing";
import { twimlMessage, twimlResponse, twimlSay } from "./twilio-xml";

const SMS_SUSPENDED =
  "This service line is not active. Please contact the business directly.";

const VOICE_SUSPENDED =
  "Thank you for calling. This answering service is not active. Please try again later or contact the business directly.";

/** True when tenant may use phone, SMS, intake, and dispatch features. */
export async function isTenantProductEntitled(userId: string): Promise<boolean> {
  const user = await findUserById(userId);
  return isEntitled(user);
}

export async function guardTenantProductEntitled(
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string; code: string }> {
  if (await isTenantProductEntitled(userId)) {
    return { ok: true };
  }
  return {
    ok: false,
    status: 403,
    error: "Subscription required to use this feature.",
    code: "SUBSCRIPTION_REQUIRED",
  };
}

/** Block inbound Twilio voice when subscription inactive. */
export function twilioVoiceSuspendedResponse(): NextResponse {
  const twiml = twimlResponse(twimlSay(VOICE_SUSPENDED));
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

/** Block inbound Twilio SMS when subscription inactive. */
export function twilioSmsSuspendedResponse(): NextResponse {
  const twiml = twimlResponse(twimlMessage(SMS_SUSPENDED));
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function twilioBlockIfNotEntitled(
  userId: string | null | undefined,
  channel: "voice" | "sms",
  inboundTo?: string,
): Promise<NextResponse | null> {
  if (!userId) return null;
  if (await isTenantProductEntitled(userId)) return null;

  if (inboundTo) {
    await ensurePilotTrialForMappedPhone(userId, inboundTo);
    if (await isTenantProductEntitled(userId)) return null;

    const mapped = await resolveTenantUserId({ to: inboundTo });
    if (mapped === userId) {
      console.warn(
        "[tenant-product-access] allowing mapped inbound line during pilot:",
        userId,
        inboundTo,
      );
      return null;
    }
  } else {
    await ensurePilotTrial(userId);
    if (await isTenantProductEntitled(userId)) return null;
  }

  return channel === "voice"
    ? twilioVoiceSuspendedResponse()
    : twilioSmsSuspendedResponse();
}
