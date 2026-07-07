import { NextResponse } from "next/server";
import { intakeUrlForMenu } from "@/lib/call-intake/intake-twiml";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import {
  createLinkIntakeSession,
  sendLinkIntakeSms,
} from "@/lib/call-intake/link-intake-flow";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import {
  twimlDialForward,
  twimlGatherSpeechDetailed,
  twimlResponse,
  twimlSay,
} from "@/lib/twilio-xml";
import {
  voiceLinkSmsFailed,
  voiceLinkSmsSent,
  voicePhoneIntakeIntro,
  voicePhoneIntakePrompt,
} from "@/lib/voice-copy";

function twimlXml(body: string) {
  return new NextResponse(body, { headers: { "Content-Type": "text/xml" } });
}

/**
 * Booking sub-menu handler (after the caller pressed 1 = "book service"):
 *   digit 1 (or default) → talk to the AI assistant now. If a Retell agent
 *     number is configured we forward the live call to it; otherwise we fall
 *     back to the built-in scripted speech intake so booking still works.
 *   digit 2 → text the caller a self-service booking link and hang up.
 */
function phoneIntakeTwiml(afterHours: boolean, intro?: string) {
  const retell = process.env.RETELL_FORWARD_NUMBER?.trim();
  if (retell) {
    return twimlResponse(twimlDialForward(retell));
  }
  const gatherUrl = intakeUrlForMenu("P2", afterHours);
  return twimlResponse(
    twimlGatherSpeechDetailed(
      gatherUrl,
      intro ?? voicePhoneIntakeIntro,
      voicePhoneIntakePrompt,
    ),
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);
  const afterHours = url.searchParams.get("afterHours") === "1";

  if (!validateTwilioWebhook(request, rawBody)) {
    console.error("[twilio/booking-channel] invalid signature:", request.url);
    return twimlXml(phoneIntakeTwiml(afterHours));
  }

  const form = new URLSearchParams(rawBody);
  const digit = form.get("Digits");
  const callSid = form.get("CallSid")?.trim() ?? url.searchParams.get("callSid") ?? "";
  const from = form.get("From") ?? "unknown";
  const to = form.get("To") ?? "unknown";

  // 1 or default → talk to the assistant now (Retell if configured).
  if (digit !== "2") {
    return twimlXml(phoneIntakeTwiml(afterHours));
  }

  // 2 → text a self-service booking link.
  if (!callSid) {
    console.error("[twilio/booking-channel] missing CallSid; to=", to);
    return twimlXml(phoneIntakeTwiml(afterHours, voiceLinkSmsFailed));
  }

  const userId = await resolveTenantUserId({ to, callSid });
  if (!userId) {
    console.error("[twilio/booking-channel] no tenant for To=", to, "callSid=", callSid);
    return twimlXml(phoneIntakeTwiml(afterHours, voiceLinkSmsFailed));
  }

  const callbackPhone = from.replace(/^whatsapp:/, "").trim();
  if (!callbackPhone || callbackPhone === "unknown") {
    return twimlXml(phoneIntakeTwiml(afterHours));
  }

  try {
    const shopName = await shopDisplayNameForUser(userId);
    const session = await createLinkIntakeSession({
      userId,
      callSid,
      from: callbackPhone,
      to,
      shopName,
      menuPriority: null,
    });

    const sms = await sendLinkIntakeSms({
      userId,
      phone: callbackPhone,
      token: session.token,
    });

    if (!sms.ok) {
      console.warn(
        "[twilio/booking-channel] link intake SMS failed:",
        sms.error,
        "to=",
        callbackPhone,
        "callSid=",
        callSid,
      );
      return twimlXml(phoneIntakeTwiml(afterHours, voiceLinkSmsFailed));
    }

    return twimlXml(twimlResponse(twimlSay(voiceLinkSmsSent)));
  } catch (e) {
    console.error("[twilio/booking-channel]", e);
    return twimlXml(phoneIntakeTwiml(afterHours, voiceLinkSmsFailed));
  }
}
