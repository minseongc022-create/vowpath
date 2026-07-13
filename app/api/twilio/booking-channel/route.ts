import { NextResponse } from "next/server";
import { intakeUrlForMenu } from "@/lib/call-intake/intake-twiml";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import {
  createLinkIntakeSession,
  sendLinkIntakeSms,
} from "@/lib/call-intake/link-intake-flow";
import { buildTwilioCallbackUrl } from "@/lib/twilio-callback-url";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { twilioBlockIfNotEntitled } from "@/lib/tenant-product-access";
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
function phoneIntakeTwiml(afterHours: boolean, to: string, intro?: string) {
  const retell = process.env.RETELL_FORWARD_NUMBER?.trim();
  if (retell) {
    // Explicit callerId (our own number) — without it <Dial> defaults to the
    // original caller's raw number, which foreign/unverified numbers get
    // rejected for at the carrier level (fails in ~0s, no ring). The action
    // URL hands the caller to the scripted intake if the forward never bridges.
    const fallbackUrl = buildTwilioCallbackUrl("/api/twilio/dial-fallback", {
      ...(afterHours ? { afterHours: "1" } : {}),
    });
    return twimlResponse(
      twimlDialForward(retell, to !== "unknown" ? to : undefined, fallbackUrl),
    );
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
  const form = new URLSearchParams(rawBody);
  const to = form.get("To") ?? "unknown";

  if (!validateTwilioWebhook(request, rawBody)) {
    console.error("[twilio/booking-channel] invalid signature:", request.url);
    return twimlXml(phoneIntakeTwiml(afterHours, to));
  }

  const digit = form.get("Digits");
  const callSid = form.get("CallSid")?.trim() ?? url.searchParams.get("callSid") ?? "";
  const from = form.get("From") ?? "unknown";

  // 1 or default → talk to the assistant now (Retell if configured).
  if (digit !== "2") {
    return twimlXml(phoneIntakeTwiml(afterHours, to));
  }

  // 2 → text a self-service booking link.
  if (!callSid) {
    console.error("[twilio/booking-channel] missing CallSid; to=", to);
    return twimlXml(phoneIntakeTwiml(afterHours, to, voiceLinkSmsFailed));
  }

  const userId = await resolveTenantUserId({ to, callSid });
  if (!userId) {
    console.error("[twilio/booking-channel] no tenant for To=", to, "callSid=", callSid);
    return twimlXml(phoneIntakeTwiml(afterHours, to, voiceLinkSmsFailed));
  }

  const blocked = await twilioBlockIfNotEntitled(userId, "voice");
  if (blocked) return blocked;

  const callbackPhone = from.replace(/^whatsapp:/, "").trim();
  if (!callbackPhone || callbackPhone === "unknown") {
    return twimlXml(phoneIntakeTwiml(afterHours, to));
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
      return twimlXml(phoneIntakeTwiml(afterHours, to, voiceLinkSmsFailed));
    }

    return twimlXml(twimlResponse(twimlSay(voiceLinkSmsSent)));
  } catch (e) {
    console.error("[twilio/booking-channel]", e);
    return twimlXml(phoneIntakeTwiml(afterHours, to, voiceLinkSmsFailed));
  }
}
