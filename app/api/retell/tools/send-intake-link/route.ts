import { NextResponse } from "next/server";
import { validateRetellWebhook } from "@/lib/retell-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { isRetellTenantEntitled } from "@/lib/retell-tenant-access";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import {
  createLinkIntakeSession,
  sendLinkIntakeSms,
} from "@/lib/call-intake/link-intake-flow";
import { voiceLinkSmsFailed } from "@/lib/voice-copy";

type SendLinkArgs = {
  purpose?: "booking" | "estimate" | string;
};

/**
 * Retell tool: text the caller a self-service intake/estimate link when they
 * choose SMS over continuing on the phone.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateRetellWebhook(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ result: "Sorry, something went wrong on our end." }, { status: 400 });
  }

  const call = (body.call ?? {}) as Record<string, unknown>;
  const callId = String(call.call_id ?? body.call_id ?? "");
  const to = String(call.to_number ?? body.to_number ?? "");
  const from = String(call.from_number ?? body.from_number ?? "");
  const args = (body.args ?? body.arguments ?? body.parameters ?? {}) as SendLinkArgs;
  const purpose = (args.purpose ?? "booking").toLowerCase();

  if (!to) {
    return NextResponse.json(
      { result: "Sorry, I wasn't able to look up your account. Please call back." },
      { status: 400 },
    );
  }

  const userId = await resolveTenantUserId({ to, from, callSid: callId });
  if (!userId) {
    return NextResponse.json({
      result: "This line isn't fully set up yet — please call back later.",
    });
  }

  if (!(await isRetellTenantEntitled(userId, { to, from }))) {
    return NextResponse.json({
      result: "This answering service isn't active right now — please contact the business directly.",
    });
  }

  const callbackPhone = from.replace(/^whatsapp:/, "").trim();
  if (!callbackPhone || callbackPhone === "unknown") {
    return NextResponse.json({
      result: "I don't have a mobile number to text — would you like to continue on this call instead?",
    });
  }

  if (!callId) {
    return NextResponse.json({
      result: voiceLinkSmsFailed,
    });
  }

  try {
    const shopName = await shopDisplayNameForUser(userId);
    const session = await createLinkIntakeSession({
      userId,
      callSid: callId,
      from: callbackPhone,
      to,
      shopName,
      menuPriority: purpose === "estimate" ? null : null,
    });

    const sms = await sendLinkIntakeSms({
      userId,
      phone: callbackPhone,
      token: session.token,
    });

    if (!sms.ok) {
      return NextResponse.json({
        result:
          "Hmm, that text didn't go through — no worries at all. Let's take care of everything right here. What's your name, and what's the address?",
      });
    }

    const linkMsg =
      purpose === "estimate"
        ? "Perfect — I just texted you a link for your free estimate. Open it when you get a chance and fill in the details — our team will follow up soon. Thanks for calling!"
        : "Perfect — I just sent a text with a secure link. It only takes a couple of minutes to complete, and our team will be in touch right after. Thanks for calling!";

    return NextResponse.json({ result: linkMsg });
  } catch (e) {
    console.error("[retell/tools/send-intake-link]", e);
    return NextResponse.json({
      result: "I had trouble sending that text — let's finish everything on this call instead.",
    });
  }
}
