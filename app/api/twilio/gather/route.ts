import { NextResponse } from "next/server";
import twilio from "twilio";
import { processInboundSpeech } from "@/lib/process-inbound-speech";
import { getTwilioDefaultUserId, getTwilioWebhookBaseUrl } from "@/lib/twilio-config";
import { getTwilioPublicRequestUrl } from "@/lib/twilio-request-url";
import { parsePriorityParam } from "@/lib/twilio-voice-flow";
import { twimlGatherSpeechDetailed, twimlResponse, twimlSay } from "@/lib/twilio-xml";

function validateTwilioRequest(request: Request, body: string): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!token) return true;
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return false;
  const url = getTwilioPublicRequestUrl(request);
  const params = Object.fromEntries(new URLSearchParams(body));
  return twilio.validateRequest(token, signature, url, params);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateTwilioRequest(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const url = new URL(request.url);
  const menuPriority = parsePriorityParam(url.searchParams.get("priority"));
  const attempt = Number(url.searchParams.get("attempt") ?? "1");

  const form = new URLSearchParams(rawBody);
  const speech = (form.get("SpeechResult") ?? "").trim();
  const from = form.get("From") ?? "unknown";
  const to = form.get("To") ?? "unknown";

  const base = getTwilioWebhookBaseUrl();
  const priorityQ = menuPriority ?? "P2";
  const gatherUrl = `${base}/api/twilio/gather?priority=${priorityQ}&attempt=${attempt + 1}`;

  if (!speech || speech.length < 8) {
    if (attempt < 2) {
      const twiml = twimlResponse(
        twimlGatherSpeechDetailed(
          gatherUrl,
          "Sorry, I did not catch that. Please try again, slowly.",
        ),
      );
      return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
      });
    }
    const twiml = twimlResponse(
      twimlSay("We could not record your message. Please call back. Goodbye."),
    );
    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const userId = getTwilioDefaultUserId();
  if (!userId) {
    const twiml = twimlResponse(
      twimlSay(
        "This line is not fully set up yet. Please call back later or contact your office during business hours.",
      ),
    );
    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  }

  let card;
  try {
    const result = await processInboundSpeech(userId, speech, from, to, menuPriority);
    card = result.card;
  } catch (e) {
    console.error("[twilio/gather] job card", e);
    const twiml = twimlResponse(
      twimlSay(
        "Thanks. We saved your message and someone will call you back shortly. Goodbye.",
      ),
    );
    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const twiml = twimlResponse(
    twimlSay(
      `Thank you. Your ${card.symptom} request is logged as priority ${card.priority}. Someone will follow up soon. Goodbye.`,
    ),
  );

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
