import { NextResponse } from "next/server";
import { isTenantAfterHours } from "@/lib/after-hours";
import {
  DEFAULT_SHOP_DISPLAY_NAME,
  shopDisplayNameForUser,
} from "@/lib/link-intake-brand";
import { recordInboundEvent } from "@/lib/inbound-events";
import { getTwilioWebhookBaseUrl } from "@/lib/twilio-config";
import { getShopBookingSettings } from "@/lib/shop-settings-db";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import {
  twimlGatherChannelChoice,
  twimlResponse,
  twimlStartCallRecording,
} from "@/lib/twilio-xml";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const form = new URLSearchParams(rawBody);
  const to = form.get("To") ?? "";
  const callSid = form.get("CallSid")?.trim() ?? "";

  if (process.env.NODE_ENV === "production" && !validateTwilioWebhook(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let shopName = DEFAULT_SHOP_DISPLAY_NAME;
  let afterHours = false;
  let stormMode = false;
  const userId = await resolveTenantUserId({ to, callSid });
  if (userId) {
    shopName = await shopDisplayNameForUser(userId);
    afterHours = await isTenantAfterHours(userId);
    const settings = await getShopBookingSettings(userId);
    stormMode = settings.stormModeEnabled;
    await recordInboundEvent(userId, {
      callSid,
      from: form.get("From") ?? "",
      to,
      status: "voice_started",
      direction: "inbound",
    });
  }

  const base = getTwilioWebhookBaseUrl();
  const statusCallbackUrl = `${base}/api/twilio/call-status`;
  const afterQ = afterHours ? "&afterHours=1" : "";
  const channelUrl = `${base}/api/twilio/channel?callSid=${encodeURIComponent(callSid)}${afterQ}`;
  const recordingUrl = `${base}/api/twilio/recording`;

  const twiml = twimlResponse(
    twimlStartCallRecording(recordingUrl) +
      twimlGatherChannelChoice(channelUrl, shopName, afterHours, stormMode),
    statusCallbackUrl,
  );

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET() {
  const base = getTwilioWebhookBaseUrl();
  const channelUrl = `${base}/api/twilio/channel`;
  const recordingUrl = `${base}/api/twilio/recording`;
  const twiml = twimlResponse(
    twimlStartCallRecording(recordingUrl) +
      twimlGatherChannelChoice(channelUrl, DEFAULT_SHOP_DISPLAY_NAME),
  );
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
