import { NextResponse } from "next/server";
import { validateRetellWebhook } from "@/lib/retell-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { isRetellTenantEntitled } from "@/lib/retell-tenant-access";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import {
  createLinkIntakeSession,
  sendLinkIntakeSms,
} from "@/lib/call-intake/link-intake-flow";
import { voiceLinkSmsSent, voiceLinkSmsFailed } from "@/lib/voice-copy";

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
          "The text didn't go through — no worries, I can take everything right here on the call. What's your name and the property address?",
      });
    }

    const estimateNote =
      purpose === "estimate"
        ? " It's a quick form for your free estimate request."
        : "";
    return NextResponse.json({
      result: `${voiceLinkSmsSent}${estimateNote} Is there anything else before we hang up?`,
    });
  } catch (e) {
    console.error("[retell/tools/send-intake-link]", e);
    return NextResponse.json({
      result: "I had trouble sending that text — let's finish everything on this call instead.",
    });
  }
}
