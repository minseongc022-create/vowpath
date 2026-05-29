import { NextResponse } from "next/server";
import { getTwilioWebhookBaseUrl } from "@/lib/twilio-config";
import { twimlGatherDtmfMenu, twimlResponse } from "@/lib/twilio-xml";

export async function POST() {
  const base = getTwilioWebhookBaseUrl();
  const menuUrl = `${base}/api/twilio/menu`;

  const twiml = twimlResponse(twimlGatherDtmfMenu(menuUrl));

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET() {
  return POST();
}
