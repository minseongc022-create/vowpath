import { NextResponse } from "next/server";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import {
  createLinkIntakeSession,
  sendLinkIntakeSms,
} from "@/lib/call-intake/link-intake-flow";
import { getTwilioWebhookBaseUrl } from "@/lib/twilio-config";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import {
  twimlGatherDtmfMenu,
  twimlResponse,
  twimlSay,
} from "@/lib/twilio-xml";

function menuUrl(base: string, afterHours: boolean): string {
  return afterHours ? `${base}/api/twilio/menu?afterHours=1` : `${base}/api/twilio/menu`;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateTwilioWebhook(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const url = new URL(request.url);
  const afterHours = url.searchParams.get("afterHours") === "1";

  const form = new URLSearchParams(rawBody);
  const digit = form.get("Digits");
  const speech = (form.get("SpeechResult") ?? "").trim();
  const callSid = form.get("CallSid")?.trim() ?? url.searchParams.get("callSid") ?? "";
  const from = form.get("From") ?? "unknown";
  const to = form.get("To") ?? "unknown";

  const base = getTwilioWebhookBaseUrl();
  const menu = menuUrl(base, afterHours);

  const continueByPhone =
    digit !== "1" && (Boolean(speech) || digit === "2" || digit === "3" || !digit);

  if (continueByPhone) {
    return new NextResponse(twimlResponse(twimlGatherDtmfMenu(menu)), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const userId = await resolveTenantUserId({ to, callSid });
  if (!userId) {
    return new NextResponse(
      twimlResponse(
        twimlSay("This line is not fully set up yet. Please try again shortly."),
      ),
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  const callbackPhone = from.replace(/^whatsapp:/, "").trim();
  if (!callbackPhone || callbackPhone === "unknown") {
    return new NextResponse(
      twimlResponse(
        twimlSay("We can't text this number. Let's continue by phone.") +
          twimlGatherDtmfMenu(menu),
      ),
      { headers: { "Content-Type": "text/xml" } },
    );
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
      console.warn("[twilio/channel] link intake SMS skipped:", sms.error);
      return new NextResponse(
        twimlResponse(
          twimlSay("We couldn't send a text. Let's continue by phone.") +
            twimlGatherDtmfMenu(menu),
        ),
        { headers: { "Content-Type": "text/xml" } },
      );
    }

    const twiml = twimlResponse(
      twimlSay(
        "We texted you a link to submit your request. " +
          "Open it on your phone to complete the form. Thank you for calling.",
      ),
    );
    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (e) {
    console.error("[twilio/channel]", e);
    return new NextResponse(twimlResponse(twimlGatherDtmfMenu(menu)), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
