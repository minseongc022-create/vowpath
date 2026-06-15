import { NextResponse } from "next/server";
import { isTenantAfterHours } from "@/lib/after-hours";
import {
  DEFAULT_SHOP_DISPLAY_NAME,
  shopDisplayNameForUser,
} from "@/lib/link-intake-brand";
import { getTwilioWebhookBaseUrl } from "@/lib/twilio-config";
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
  const userId = await resolveTenantUserId({ to, callSid });
  if (userId) {
    shopName = await shopDisplayNameForUser(userId);
    afterHours = await isTenantAfterHours(userId);
  }

  const base = getTwilioWebhookBaseUrl();
  const afterQ = afterHours ? "&afterHours=1" : "";
  const channelUrl = `${base}/api/twilio/channel?callSid=${encodeURIComponent(callSid)}${afterQ}`;
  const recordingUrl = `${base}/api/twilio/recording`;

  const twiml = twimlResponse(
    twimlStartCallRecording(recordingUrl) +
      twimlGatherChannelChoice(channelUrl, shopName, afterHours),
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
