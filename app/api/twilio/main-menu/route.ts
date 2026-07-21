import { NextResponse } from "next/server";
import { buildTwilioCallbackUrl } from "@/lib/twilio-callback-url";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { buildRetellBridgeTwiml } from "@/lib/retell-bridge";
import { isUrgentCallerSpeech } from "@/lib/urgent-speech-bypass";
import { isLinkIntentSpeech } from "@/lib/link-intent-speech";
import { resolveMainMenuChoice } from "@/lib/ivr-channel-choice";
import { sendVoiceLinkIntakeSms } from "@/lib/call-intake/voice-link-sms";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { twilioBlockIfNotEntitled } from "@/lib/tenant-product-access";
import { shopDisplayNameForUser, DEFAULT_SHOP_DISPLAY_NAME } from "@/lib/link-intake-brand";
import { getShopBookingSettings } from "@/lib/shop-settings-db";
import {
  twimlGatherChannelChoice,
  twimlGatherEstimateMenu,
  twimlResponse,
  twimlSay,
} from "@/lib/twilio-xml";
import { voiceLinkSmsFailed, voiceLinkSmsSent } from "@/lib/voice-copy";

function twimlXml(body: string) {
  return new NextResponse(body, { headers: { "Content-Type": "text/xml" } });
}

async function resolveSubMenuContext(to: string, from: string, callSid: string) {
  const userId = await resolveTenantUserId({ to, from, callSid });
  if (!userId) {
    return { userId: null as string | null, shopName: DEFAULT_SHOP_DISPLAY_NAME, stormMode: false };
  }
  const [shopName, settings] = await Promise.all([
    shopDisplayNameForUser(userId),
    getShopBookingSettings(userId),
  ]);
  return { userId, shopName, stormMode: settings.stormModeEnabled };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);
  const afterHours = url.searchParams.get("afterHours") === "1";
  const afterQ = afterHours ? { afterHours: "1" as const } : {};

  const form = new URLSearchParams(rawBody);
  const digit = form.get("Digits");
  const speech = (form.get("SpeechResult") ?? "").trim();
  const callSid = form.get("CallSid")?.trim() ?? url.searchParams.get("callSid") ?? "";
  const to = form.get("To") ?? "unknown";
  const from = form.get("From") ?? "unknown";

  const bridgeParams = {
    afterHours,
    to,
    from,
    callSid,
  };

  if (!validateTwilioWebhook(request, rawBody)) {
    console.error("[twilio/main-menu] invalid signature:", request.url);
    return twimlXml(await buildRetellBridgeTwiml({ ...bridgeParams, ivrPath: "" }));
  }

  // No input / timeout → connect to Retell (never hang up on emergencies).
  if (!digit && !speech) {
    return twimlXml(await buildRetellBridgeTwiml({ ...bridgeParams, ivrPath: "" }));
  }

  // Caller spoke without pressing — urgent description → straight to phone intake.
  if (!digit && isUrgentCallerSpeech(speech)) {
    return twimlXml(
      await buildRetellBridgeTwiml({ ...bridgeParams, ivrPath: "phone_booking" }),
    );
  }

  const ctx = await resolveSubMenuContext(to, from, callSid);

  // "Text me the link" at main menu → send immediately, no sub-menu.
  if (isLinkIntentSpeech(speech) && ctx.userId && callSid) {
    const blocked = await twilioBlockIfNotEntitled(ctx.userId, "voice", to);
    if (blocked) return blocked;
    const sent = await sendVoiceLinkIntakeSms({
      userId: ctx.userId,
      callSid,
      from,
      to,
      menuPriority: digit === "2" ? "P3" : null,
    });
    if (sent.ok) {
      return twimlXml(twimlResponse(twimlSay(voiceLinkSmsSent)));
    }
    console.warn("[twilio/main-menu] link SMS failed:", sent.error);
    return twimlXml(
      await buildRetellBridgeTwiml({ ...bridgeParams, intro: voiceLinkSmsFailed }),
    );
  }

  if (digit === "2" || resolveMainMenuChoice(digit, speech) === "estimate") {
    const { markCallPathEstimate } = await import("@/lib/call-path-meter");
    await markCallPathEstimate(callSid);
    const estimateUrl = buildTwilioCallbackUrl("/api/twilio/estimate", {
      callSid,
      ...afterQ,
    });
    return twimlXml(twimlResponse(twimlGatherEstimateMenu(estimateUrl)));
  }

  if (digit === "1" && isUrgentCallerSpeech(speech)) {
    return twimlXml(
      await buildRetellBridgeTwiml({ ...bridgeParams, ivrPath: "phone_booking" }),
    );
  }

  // Service/emergency (press 1 or say service/book/emergency) → link vs phone sub-menu.
  if (digit === "1" || resolveMainMenuChoice(digit, speech) === "booking") {
    const channelUrl = buildTwilioCallbackUrl("/api/twilio/channel", {
      callSid,
      ...afterQ,
    });
    return twimlXml(
      twimlResponse(
        twimlGatherChannelChoice(channelUrl, ctx.shopName, afterHours, ctx.stormMode),
      ),
    );
  }

  return twimlXml(await buildRetellBridgeTwiml({ ...bridgeParams, ivrPath: "" }));
}

/** Legacy GET for Twilio webhook verification. */
export async function GET() {
  const actionUrl = buildTwilioCallbackUrl("/api/twilio/main-menu");
  return twimlXml(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Main menu active.</Say><Redirect method="POST">${actionUrl}</Redirect></Response>`,
  );
}
