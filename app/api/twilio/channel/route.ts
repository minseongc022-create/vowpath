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
import {
  twimlGatherChannelChoice,
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
import { intakeUrlForMenu } from "@/lib/call-intake/intake-twiml";

function twimlXml(body: string) {
  return new NextResponse(body, {
    headers: { "Content-Type": "text/xml" },
  });
}

function legacyPhoneIntakeTwiml(afterHours: boolean, intro?: string) {
  const gatherUrl = intakeUrlForMenu("P2", afterHours);
  return twimlResponse(
    twimlGatherSpeechDetailed(
      gatherUrl,
      intro ?? voicePhoneIntakeIntro,
      voicePhoneIntakePrompt,
    ),
  );
}

async function replayChannelMenuTwiml(
  afterHours: boolean,
  callSid: string,
  to: string,
  from: string,
) {
  const userId = await resolveTenantUserId({ to, from, callSid });
  let shopName = DEFAULT_SHOP_DISPLAY_NAME;
  let stormMode = false;
  if (userId) {
    shopName = await shopDisplayNameForUser(userId);
    const settings = await getShopBookingSettings(userId);
    stormMode = settings.stormModeEnabled;
  }
  const channelUrl = buildTwilioCallbackUrl("/api/twilio/channel", {
    callSid,
    ...(afterHours ? { afterHours: "1" } : {}),
  });
  return twimlResponse(
    twimlGatherChannelChoice(channelUrl, shopName, afterHours, stormMode, {
      retry: true,
    }),
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);
  const afterHours = url.searchParams.get("afterHours") === "1";

  if (!validateTwilioWebhook(request, rawBody)) {
    console.error("[twilio/channel] invalid signature:", request.url);
    if (isRetellConfigured()) {
      return twimlXml(
        await buildRetellBridgeTwiml({
          afterHours,
          to: "unknown",
          from: "unknown",
          intro: voiceLinkSmsFailed,
          ivrPath: "phone_booking",
        }),
      );
    }
    return twimlXml(legacyPhoneIntakeTwiml(afterHours, voiceLinkSmsFailed));
  }

  const form = new URLSearchParams(rawBody);
  const digit = form.get("Digits");
  const speech = (form.get("SpeechResult") ?? "").trim();
  const callSid = form.get("CallSid")?.trim() ?? url.searchParams.get("callSid") ?? "";
  const from = form.get("From") ?? "unknown";
  const to = form.get("To") ?? "unknown";

  const bridgeParams = {
    afterHours,
    to,
    from,
    callSid,
    ivrPath: "phone_booking" as const,
  };

  const choice = resolveBookingChannelChoice(digit, speech);

  if (choice === "unclear") {
    return twimlXml(await replayChannelMenuTwiml(afterHours, callSid, to, from));
  }

  if (choice === "phone") {
    if (isRetellConfigured()) {
      return twimlXml(await buildRetellBridgeTwiml(bridgeParams));
    }
    return twimlXml(legacyPhoneIntakeTwiml(afterHours));
  }

  if (!callSid) {
    console.error("[twilio/channel] missing CallSid; to=", to);
    if (isRetellConfigured()) {
      return twimlXml(
        await buildRetellBridgeTwiml({ ...bridgeParams, intro: voiceLinkSmsFailed }),
      );
    }
    return twimlXml(legacyPhoneIntakeTwiml(afterHours, voiceLinkSmsFailed));
  }

  const userId = await resolveTenantUserId({ to, callSid });
  if (!userId) {
    console.error("[twilio/channel] no tenant for To=", to, "callSid=", callSid);
    if (isRetellConfigured()) {
      return twimlXml(
        await buildRetellBridgeTwiml({ ...bridgeParams, intro: voiceLinkSmsFailed }),
      );
    }
    return twimlXml(legacyPhoneIntakeTwiml(afterHours, voiceLinkSmsFailed));
  }

  const blocked = await twilioBlockIfNotEntitled(userId, "voice", to);
  if (blocked) return blocked;

  const sent = await sendVoiceLinkIntakeSms({ userId, callSid, from, to });
  if (!sent.ok) {
    console.warn("[twilio/channel] link intake SMS failed:", sent.error, "to=", from);
    if (isRetellConfigured()) {
      return twimlXml(
        await buildRetellBridgeTwiml({ ...bridgeParams, intro: voiceLinkSmsFailed }),
      );
    }
    return twimlXml(legacyPhoneIntakeTwiml(afterHours, voiceLinkSmsFailed));
  }

  return twimlXml(twimlResponse(twimlSay(voiceLinkSmsSent)));
}
