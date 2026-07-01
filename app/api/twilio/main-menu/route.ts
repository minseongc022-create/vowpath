import { NextResponse } from "next/server";
import { DEFAULT_SHOP_DISPLAY_NAME, shopDisplayNameForUser } from "@/lib/link-intake-brand";
import { getTwilioWebhookBaseUrl } from "@/lib/twilio-config";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import {
  twimlGatherChannelChoice,
  twimlGatherEstimateMenu,
  twimlResponse,
} from "@/lib/twilio-xml";

function twimlXml(body: string) {
  return new NextResponse(body, { headers: { "Content-Type": "text/xml" } });
}

function emergencyFallback(afterHours: boolean, shopName = DEFAULT_SHOP_DISPLAY_NAME) {
  const base = getTwilioWebhookBaseUrl();
  const channelUrl = `${base}/api/twilio/channel${afterHours ? "?afterHours=1" : ""}`;
  return twimlXml(twimlResponse(twimlGatherChannelChoice(channelUrl, shopName, afterHours)));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);
  const afterHours = url.searchParams.get("afterHours") === "1";

  if (!validateTwilioWebhook(request, rawBody)) {
    console.error("[twilio/main-menu] invalid signature:", request.url);
    return emergencyFallback(afterHours);
  }

  const form = new URLSearchParams(rawBody);
  const digit = form.get("Digits");
  const callSid = form.get("CallSid")?.trim() ?? url.searchParams.get("callSid") ?? "";
  const to = form.get("To") ?? "";

  let shopName = DEFAULT_SHOP_DISPLAY_NAME;
  try {
    const userId = await resolveTenantUserId({ to, callSid });
    if (userId) {
      shopName = await shopDisplayNameForUser(userId);
    }
  } catch (e) {
    console.error("[twilio/main-menu] tenant lookup failed:", e);
  }

  const base = getTwilioWebhookBaseUrl();
  if (!base) {
    console.error(
      "[twilio/main-menu] empty webhook base URL — set TWILIO_WEBHOOK_BASE_URL or NEXT_PUBLIC_APP_URL; generated TwiML callback URLs will be invalid",
    );
  }
  const afterQ = afterHours ? "&afterHours=1" : "";

  if (digit === "2") {
    const estimateActionUrl = `${base}/api/twilio/estimate?callSid=${encodeURIComponent(callSid)}${afterQ}`;
    return twimlXml(twimlResponse(twimlGatherEstimateMenu(estimateActionUrl)));
  }

  // Digit 1, no input, or anything unrecognized defaults to the emergency path.
  const channelUrl = `${base}/api/twilio/channel?callSid=${encodeURIComponent(callSid)}${afterQ}`;
  return twimlXml(twimlResponse(twimlGatherChannelChoice(channelUrl, shopName, afterHours, false)));
}
