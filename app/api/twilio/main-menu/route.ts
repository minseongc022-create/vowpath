import { NextResponse } from "next/server";
import { buildTwilioCallbackUrl } from "@/lib/twilio-callback-url";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import {
  twimlGatherBookingChannel,
  twimlGatherEstimateMenu,
  twimlGatherSpanishIntake,
  twimlResponse,
} from "@/lib/twilio-xml";

function twimlXml(body: string) {
  return new NextResponse(body, { headers: { "Content-Type": "text/xml" } });
}

/** Booking branch: choose to talk to the AI now (1) or get a text link (2). */
function bookingChannelMenu(afterHours: boolean, callSid: string) {
  const url = buildTwilioCallbackUrl("/api/twilio/booking-channel", {
    callSid,
    ...(afterHours ? { afterHours: "1" } : {}),
  });
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

  const afterQ = afterHours ? { afterHours: "1" } : undefined;

  if (digit === "2") {
    const estimateActionUrl = buildTwilioCallbackUrl("/api/twilio/estimate", {
      callSid,
      ...afterQ,
    });
    return twimlXml(twimlResponse(twimlGatherEstimateMenu(estimateActionUrl)));
  }

  if (digit === "3") {
    const esUrl = buildTwilioCallbackUrl("/api/twilio/es-intake", { callSid });
    return twimlXml(twimlResponse(twimlGatherSpanishIntake(esUrl)));
  }

  // 1, no input, or anything else → booking branch → booking sub-menu
  // (talk to the AI assistant now / get a booking link by text).
  return bookingChannelMenu(afterHours, callSid);
}
