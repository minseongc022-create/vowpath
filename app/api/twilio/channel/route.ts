import { NextResponse } from "next/server";
import { intakeUrlForMenu } from "@/lib/call-intake/intake-twiml";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import {
  createLinkIntakeSession,
  sendLinkIntakeSms,
} from "@/lib/call-intake/link-intake-flow";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { twilioBlockIfNotEntitled } from "@/lib/tenant-product-access";
import {
  twimlGatherSpeechDetailed,
  twimlResponse,
  twimlSay,
} from "@/lib/twilio-xml";
import {
  voiceLinkSmsFailed,
  voiceLinkSmsSent,
  voicePhoneIntakeIntro,
  voicePhoneIntakePrompt,
} from "@/lib/voice-copy";

function twimlXml(body: string) {
  return new NextResponse(body, {
    headers: { "Content-Type": "text/xml" },
  });
}

function phoneIntakeTwiml(afterHours: boolean, intro?: string) {
  const gatherUrl = intakeUrlForMenu("P2", afterHours);
  return twimlResponse(
    twimlGatherSpeechDetailed(
      gatherUrl,
      intro ?? voicePhoneIntakeIntro,
      voicePhoneIntakePrompt,
    ),
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);
  const afterHours = url.searchParams.get("afterHours") === "1";

  if (!validateTwilioWebhook(request, rawBody)) {
    console.error("[twilio/channel] invalid signature:", request.url);
    return twimlXml(phoneIntakeTwiml(afterHours, voiceLinkSmsFailed));
  }

  const form = new URLSearchParams(rawBody);
  const digit = form.get("Digits");
  const callSid = form.get("CallSid")?.trim() ?? url.searchParams.get("callSid") ?? "";
  const from = form.get("From") ?? "unknown";
  const to = form.get("To") ?? "unknown";

  if (digit !== "1") {
    return twimlXml(phoneIntakeTwiml(afterHours));
  }

  if (!callSid) {
    console.error("[twilio/channel] missing CallSid; to=", to);
    return twimlXml(phoneIntakeTwiml(afterHours, voiceLinkSmsFailed));
  }

  const userId = await resolveTenantUserId({ to, callSid });
  if (!userId) {
    console.error("[twilio/channel] no tenant for To=", to, "callSid=", callSid);
    return twimlXml(phoneIntakeTwiml(afterHours, voiceLinkSmsFailed));
  }

  const blocked = await twilioBlockIfNotEntitled(userId, "voice");
  if (blocked) return blocked;

  const callbackPhone = from.replace(/^whatsapp:/, "").trim();
  if (!callbackPhone || callbackPhone === "unknown") {
    return twimlXml(phoneIntakeTwiml(afterHours));
  }

  try {
    const shopName = await shopDisplayNameForUser(userId);
    const session = await createLinkIntakeSession({
      userId,
      callSid,
      from: callbackPhone,
      to,
      shopName,
      menuPriority: null,
    });

    const sms = await sendLinkIntakeSms({
      userId,
      phone: callbackPhone,
      token: session.token,
    });

    if (!sms.ok) {
      console.warn(
        "[twilio/channel] link intake SMS failed:",
        sms.error,
        "to=",
        callbackPhone,
        "callSid=",
        callSid,
      );
      return twimlXml(phoneIntakeTwiml(afterHours, voiceLinkSmsFailed));
    }

    return twimlXml(twimlResponse(twimlSay(voiceLinkSmsSent)));
  } catch (e) {
    console.error("[twilio/channel]", e);
    return twimlXml(phoneIntakeTwiml(afterHours, voiceLinkSmsFailed));
  }
}
