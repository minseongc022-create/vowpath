import { NextResponse } from "next/server";
import { buildRetellBridgeTwiml } from "@/lib/retell-bridge";
import { isRetellConfigured } from "@/lib/retell-config";
import { sendVoiceLinkIntakeSms } from "@/lib/call-intake/voice-link-sms";
import { resolveBookingChannelChoice } from "@/lib/ivr-channel-choice";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { twilioBlockIfNotEntitled } from "@/lib/tenant-product-access";
import { shopDisplayNameForUser, DEFAULT_SHOP_DISPLAY_NAME } from "@/lib/link-intake-brand";
import { getShopBookingSettings } from "@/lib/shop-settings-db";
import { buildTwilioCallbackUrl } from "@/lib/twilio-callback-url";
import { twimlGatherChannelChoice, twimlResponse, twimlSay } from "@/lib/twilio-xml";
import { voiceLinkSmsFailed, voiceLinkSmsSent } from "@/lib/voice-copy";

function twimlXml(body: string) {
  return new NextResponse(body, { headers: { "Content-Type": "text/xml" } });
}

/**
 * Legacy booking sub-menu (same rules as /api/twilio/channel):
 *   press/say 1 or "text" → SMS link
 *   press/say 2 or "phone" → Retell on this call
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);
  const afterHours = url.searchParams.get("afterHours") === "1";
  const form = new URLSearchParams(rawBody);
  const to = form.get("To") ?? "unknown";
  const from = form.get("From") ?? "unknown";
  const digit = form.get("Digits");
  const speech = (form.get("SpeechResult") ?? "").trim();
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

  const choice = resolveBookingChannelChoice(digit, speech);

  if (choice === "unclear") {
    const userId = await resolveTenantUserId({ to, from, callSid });
    let shopName = DEFAULT_SHOP_DISPLAY_NAME;
    let stormMode = false;
    if (userId) {
      shopName = await shopDisplayNameForUser(userId);
      const settings = await getShopBookingSettings(userId);
      stormMode = settings.stormModeEnabled;
    }
    const channelUrl = buildTwilioCallbackUrl("/api/twilio/booking-channel", {
      callSid,
      ...(afterHours ? { afterHours: "1" } : {}),
    });
    return twimlXml(
      twimlResponse(
        twimlGatherChannelChoice(channelUrl, shopName, afterHours, stormMode, {
          retry: true,
        }),
      ),
    );
  }

  if (choice === "phone") {
    return twimlXml(await buildRetellBridgeTwiml(bridgeParams));
  }

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

  const sent = await sendVoiceLinkIntakeSms({ userId, callSid, from, to });
  if (!sent.ok) {
    console.warn("[twilio/booking-channel] link intake SMS failed:", sent.error, "to=", from);
    if (isRetellConfigured()) {
      return twimlXml(
        await buildRetellBridgeTwiml({ ...bridgeParams, intro: voiceLinkSmsFailed }),
      );
    }
    return twimlXml(twimlResponse(twimlSay(voiceLinkSmsFailed)));
  }

  return twimlXml(twimlResponse(twimlSay(voiceLinkSmsSent)));
}
