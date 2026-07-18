import { NextResponse } from "next/server";
import { validateRetellWebhook } from "@/lib/retell-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { isRetellTenantEntitled } from "@/lib/retell-tenant-access";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import {
  createLinkIntakeSession,
  sendLinkIntakeSms,
} from "@/lib/call-intake/link-intake-flow";

/**
 * Retell tool — send the caller a text link for booking or estimate intake.
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
    return NextResponse.json(
      { result: "Sorry, something got mixed up on our end." },
      { status: 400 },
    );
  }

  const call = (body.call ?? {}) as Record<string, unknown>;
  const callId = String(call.call_id ?? body.call_id ?? "");
  const to = String(call.to_number ?? body.to_number ?? "");
  const from = String(call.from_number ?? body.from_number ?? "");
  const args = (body.args ?? body.arguments ?? body.parameters ?? {}) as {
    purpose?: "booking" | "estimate";
  };

  if (!to) {
    return NextResponse.json(
      { result: "Sorry, I wasn't able to look up your account. Please call back." },
      { status: 400 },
    );
  }

  const userId = await resolveTenantUserId({ to, from, callSid: callId });
  if (!userId) {
    return NextResponse.json({
      result: "Hmm, I'm not finding this line in our system — try calling back in a bit.",
    });
  }

  if (!(await isRetellTenantEntitled(userId, { to, from }))) {
    return NextResponse.json({
      result: "Thanks for calling — looks like this answering service isn't turned on right now.",
    });
  }

  const callbackPhone = from.replace(/^whatsapp:/, "").trim();
  if (!callbackPhone || callbackPhone === "unknown") {
    return NextResponse.json({
      result: "I need a callback number to text you — what's the best number to reach you?",
    });
  }

  const purpose = args.purpose === "estimate" ? "estimate" : "booking";
  const menuPriority = purpose === "estimate" ? ("P3" as const) : null;

  try {
    const shopName = await shopDisplayNameForUser(userId);
    const session = await createLinkIntakeSession({
      userId,
      callSid: callId || `retell-link-${Date.now()}`,
      from: callbackPhone,
      to,
      shopName,
      menuPriority,
    });

    const sms = await sendLinkIntakeSms({
      userId,
      phone: callbackPhone,
      token: session.token,
      callSid: callId,
    });

    if (!sms.ok) {
      console.warn("[retell/tools/send-link-intake] SMS failed:", sms.error);
      return NextResponse.json({
        result:
          "That text didn't go through — let's handle everything right here on the call instead. What's your name?",
      });
    }

    const closing =
      purpose === "estimate"
        ? "Perfect — I just texted you a link for your estimate request. Fill in a few details and the team will follow up. Thanks for calling!"
        : "Perfect — I just texted you a link. Tap it, fill in a few details, and our team will take it from there. Thanks for calling!";

    return NextResponse.json({ result: closing });
  } catch (e) {
    console.error("[retell/tools/send-link-intake]", e);
    return NextResponse.json({
      result: "Something glitched on my end — let's finish this on the call. What's your name?",
    });
  }
}
