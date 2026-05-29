import { NextResponse } from "next/server";
import { getTwilioWebhookBaseUrl } from "@/lib/twilio-config";
import { menuPriorityFromDigit } from "@/lib/twilio-voice-flow";
import {
  twimlGatherSpeechDetailed,
  twimlGatherDtmfMenu,
  twimlResponse,
  twimlSay,
} from "@/lib/twilio-xml";

export async function POST(request: Request) {
  const rawBody = await request.text();
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

  const gatherUrl = `${base}/api/twilio/gather?priority=${priority}&attempt=1`;
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
