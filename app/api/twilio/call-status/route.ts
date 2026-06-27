import { NextResponse } from "next/server";
import { recordInboundEvent } from "@/lib/inbound-events";
import { maybeSendMissedCallTextback } from "@/lib/missed-call-textback";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (process.env.NODE_ENV === "production" && !validateTwilioWebhook(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const form = new URLSearchParams(rawBody);
  const callSid = form.get("CallSid")?.trim() ?? "";
  const from = form.get("From") ?? "";
  const to = form.get("To") ?? "";
  const status = form.get("CallStatus") ?? form.get("DialCallStatus") ?? "unknown";
  const durationRaw = form.get("CallDuration") ?? form.get("Duration");
  const durationSec = durationRaw ? Number.parseInt(durationRaw, 10) : undefined;

  if (!callSid) {
    return new NextResponse("OK", { status: 200 });
  }

  const userId = await resolveTenantUserId({ to, callSid });
  if (userId) {
    await recordInboundEvent(userId, {
      callSid,
      from,
      to,
      status,
      direction: form.get("Direction") ?? "inbound",
      durationSec: Number.isFinite(durationSec) ? durationSec : undefined,
    });

    if (status === "no-answer" || status === "busy" || status === "failed" || status === "canceled") {
      try {
        await maybeSendMissedCallTextback({
          userId,
          callSid,
          from,
          to,
          status,
          durationSec: Number.isFinite(durationSec) ? durationSec : undefined,
        });
      } catch (e) {
        console.warn("[call-status] missed call textback", e);
      }
    }
  }

  return new NextResponse("OK", { status: 200 });
}
