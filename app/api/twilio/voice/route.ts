import { NextResponse } from "next/server";
import { DEFAULT_SHOP_DISPLAY_NAME } from "@/lib/link-intake-brand";
import {
  buildInboundVoiceTwiml,
  resolveInboundVoiceContext,
} from "@/lib/twilio-inbound-voice";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { twilioBlockIfNotEntitled } from "@/lib/tenant-product-access";
import {
  twimlGatherMainMenu,
  twimlResponse,
  twimlStartCallRecording,
} from "@/lib/twilio-xml";
import { buildTwilioCallbackUrl } from "@/lib/twilio-callback-url";

function twimlXml(body: string) {
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const form = new URLSearchParams(rawBody);
  const to = form.get("To") ?? "";
  const callSid = form.get("CallSid")?.trim() ?? "";
  const from = form.get("From") ?? "";

  const signatureOk = validateTwilioWebhook(request, rawBody);
  if (!signatureOk) {
    // Never return 403 on the first webhook — Twilio drops the call instantly.
    // Log loudly and still play the menu so callers aren't hung up on.
    console.error(
      "[twilio/voice] invalid signature — serving menu anyway. Check TWILIO_WEBHOOK_BASE_URL matches the public URL Twilio POSTs to.",
      request.url,
    );
  }

  const userId = await resolveTenantUserId({ to, callSid });
  const blocked = await twilioBlockIfNotEntitled(userId, "voice");
  if (blocked) return blocked;

  const ctx = await resolveInboundVoiceContext({
    callSid,
    from,
    to,
    userId,
  });

  const twiml = await buildInboundVoiceTwiml(ctx);
  return twimlXml(twiml);
}

export async function GET() {
  const mainMenuUrl = buildTwilioCallbackUrl("/api/twilio/main-menu");
  const recordingUrl = buildTwilioCallbackUrl("/api/twilio/recording");
  const twiml = twimlResponse(
    twimlStartCallRecording(recordingUrl) +
      twimlGatherMainMenu(mainMenuUrl, DEFAULT_SHOP_DISPLAY_NAME),
  );
  return twimlXml(twiml);
}
