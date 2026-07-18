import { NextResponse } from "next/server";
import { buildTwilioCallbackUrl } from "@/lib/twilio-callback-url";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { buildRetellBridgeTwiml } from "@/lib/retell-bridge";
import { isUrgentCallerSpeech } from "@/lib/urgent-speech-bypass";

function twimlXml(body: string) {
  return new NextResponse(body, { headers: { "Content-Type": "text/xml" } });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);
  const afterHours = url.searchParams.get("afterHours") === "1";

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

  if (digit === "2") {
    return twimlXml(
      await buildRetellBridgeTwiml({ ...bridgeParams, ivrPath: "estimate_choice" }),
    );
  }

  // Press 1 (or speech without urgent keywords) → booking with conversational link vs phone.
  const ivrPath =
    digit === "1" && isUrgentCallerSpeech(speech)
      ? "phone_booking"
      : "booking_choice";

  return twimlXml(await buildRetellBridgeTwiml({ ...bridgeParams, ivrPath }));
}

/** Legacy GET for Twilio webhook verification. */
export async function GET() {
  const actionUrl = buildTwilioCallbackUrl("/api/twilio/main-menu");
  return twimlXml(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Main menu active.</Say><Redirect method="POST">${actionUrl}</Redirect></Response>`,
  );
}
