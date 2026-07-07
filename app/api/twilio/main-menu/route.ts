import { NextResponse } from "next/server";
import { getTwilioWebhookBaseUrl } from "@/lib/twilio-config";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import {
  twimlGatherBookingChannel,
  twimlGatherEstimateMenu,
  twimlResponse,
} from "@/lib/twilio-xml";

function twimlXml(body: string) {
  return new NextResponse(body, { headers: { "Content-Type": "text/xml" } });
}

/** Booking branch: choose to talk to the AI now (1) or get a text link (2). */
function bookingChannelMenu(afterHours: boolean, callSid: string) {
  const base = getTwilioWebhookBaseUrl();
  const url = `${base}/api/twilio/booking-channel?callSid=${encodeURIComponent(callSid)}${afterHours ? "&afterHours=1" : ""}`;
  return twimlXml(twimlResponse(twimlGatherBookingChannel(url)));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);
  const afterHours = url.searchParams.get("afterHours") === "1";

  const form = new URLSearchParams(rawBody);
  const digit = form.get("Digits");
  const callSid = form.get("CallSid")?.trim() ?? url.searchParams.get("callSid") ?? "";

  if (!validateTwilioWebhook(request, rawBody)) {
    console.error("[twilio/main-menu] invalid signature:", request.url);
    return bookingChannelMenu(afterHours, callSid);
  }

  const base = getTwilioWebhookBaseUrl();
  if (!base) {
    console.error(
      "[twilio/main-menu] empty webhook base URL — set TWILIO_WEBHOOK_BASE_URL or NEXT_PUBLIC_APP_URL; generated TwiML callback URLs will be invalid",
    );
  }
  const afterQ = afterHours ? "&afterHours=1" : "";

  // 2 = free estimate branch → estimate sub-menu (phone details / text form).
  if (digit === "2") {
    const estimateActionUrl = `${base}/api/twilio/estimate?callSid=${encodeURIComponent(callSid)}${afterQ}`;
    return twimlXml(twimlResponse(twimlGatherEstimateMenu(estimateActionUrl)));
  }

  // 1, no input, or anything else → booking branch → booking sub-menu
  // (talk to the AI assistant now / get a booking link by text).
  return bookingChannelMenu(afterHours, callSid);
}
