import { NextResponse } from "next/server";
import { buildRetellBridgeTwiml } from "@/lib/retell-bridge";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import {
  createLinkIntakeSession,
  sendLinkIntakeSms,
} from "@/lib/call-intake/link-intake-flow";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { twilioBlockIfNotEntitled } from "@/lib/tenant-product-access";
import { twimlResponse, twimlSay } from "@/lib/twilio-xml";
import { voiceLinkSmsFailed, voiceLinkSmsSent } from "@/lib/voice-copy";

function twimlXml(body: string) {
  return new NextResponse(body, { headers: { "Content-Type": "text/xml" } });
}

/**
 * Booking sub-menu handler (after the caller pressed 1 = "book service"):
 *   digit 1 (or default) → Retell conversational AI via SIP bridge
 *   digit 2 → text the caller a self-service booking link and hang up
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);
  const afterHours = url.searchParams.get("afterHours") === "1";
  const form = new URLSearchParams(rawBody);
  const to = form.get("To") ?? "unknown";
  const from = form.get("From") ?? "unknown";
  const digit = form.get("Digits");
  const callSid = form.get("CallSid")?.trim() ?? url.searchParams.get("callSid") ?? "";

  const bridgeParams = {
    afterHours,
    to,
    from,
    callSid,
    ivrPath: "phone_booking" as const,
  };

  if (!validateTwilioWebhook(request, rawBody)) {
    console.error("[twilio/booking-channel] invalid signature:", request.url);
    return twimlXml(await buildRetellBridgeTwiml(bridgeParams));
  }

  // 1 or default → talk to the Retell assistant now.
  if (digit !== "2") {
    return twimlXml(await buildRetellBridgeTwiml(bridgeParams));
  }

  // 2 → text a self-service booking link.
  if (!callSid) {
    console.error("[twilio/booking-channel] missing CallSid; to=", to);
    return twimlXml(
      await buildRetellBridgeTwiml({ ...bridgeParams, intro: voiceLinkSmsFailed }),
    );
  }

  const userId = await resolveTenantUserId({ to, from, callSid });
  if (!userId) {
    console.error("[twilio/booking-channel] no tenant for To=", to, "callSid=", callSid);
    return twimlXml(
      await buildRetellBridgeTwiml({ ...bridgeParams, intro: voiceLinkSmsFailed }),
    );
  }

  const blocked = await twilioBlockIfNotEntitled(userId, "voice", to);
  if (blocked) return blocked;

  const callbackPhone = from.replace(/^whatsapp:/, "").trim();
  if (!callbackPhone || callbackPhone === "unknown") {
    return twimlXml(await buildRetellBridgeTwiml(bridgeParams));
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
      return twimlXml(
        await buildRetellBridgeTwiml({ ...bridgeParams, intro: voiceLinkSmsFailed }),
      );
    }

    return twimlXml(twimlResponse(twimlSay(voiceLinkSmsSent)));
  } catch (e) {
    console.error("[twilio/booking-channel]", e);
    return twimlXml(
      await buildRetellBridgeTwiml({ ...bridgeParams, intro: voiceLinkSmsFailed }),
    );
  }
}
