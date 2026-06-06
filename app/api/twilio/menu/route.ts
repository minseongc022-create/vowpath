import { NextResponse } from "next/server";
import { intakeUrlForMenu } from "@/lib/call-intake/intake-twiml";
import { getTwilioWebhookBaseUrl } from "@/lib/twilio-config";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { menuPriorityFromDigit } from "@/lib/twilio-voice-flow";
import {
  twimlGatherSpeechDetailed,
  twimlGatherDtmfMenu,
  twimlResponse,
  twimlSay,
} from "@/lib/twilio-xml";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateTwilioWebhook(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }
  const form = new URLSearchParams(rawBody);
  const digit = form.get("Digits");

  const base = getTwilioWebhookBaseUrl();
  const menuUrl = `${base}/api/twilio/menu`;
  const priority = menuPriorityFromDigit(digit);

  if (!priority) {
    const twiml = twimlResponse(
      twimlSay("Invalid selection.") + twimlGatherDtmfMenu(menuUrl),
    );
    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const gatherUrl = intakeUrlForMenu(priority);
  let intro = "Please describe your issue.";
  if (priority === "P1") {
    intro = "Emergency line selected.";
  } else if (priority === "P2") {
    intro = "Same-day service selected.";
  } else {
    intro = "Routine service selected.";
  }

  const twiml = twimlResponse(twimlGatherSpeechDetailed(gatherUrl, intro));
  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
