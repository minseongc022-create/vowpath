import { NextResponse } from "next/server";
import { handleCustomerVerificationReply } from "@/lib/customer-verification/flow";
import { handleOwnerSmsReply } from "@/lib/owner-sms-reply";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { twimlMessage, twimlResponse } from "@/lib/twilio-xml";

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!validateTwilioWebhook(request, rawBody)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const params = new URLSearchParams(rawBody);
  const from = params.get("From") ?? "";
  const body = params.get("Body") ?? "";

  if (/^\s*STOP\s*$/i.test(body.trim())) {
    const twiml = twimlResponse(
      twimlMessage(
        "You are unsubscribed from Vowpath service texts. Reply START to resubscribe.",
      ),
    );
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  try {
    const customer = await handleCustomerVerificationReply({ from, body });
    if (customer.handled) {
      const twiml = twimlResponse(twimlMessage(customer.replyBody));
      return new NextResponse(twiml, {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const result = await handleOwnerSmsReply({ from, body });
    const twiml = twimlResponse(twimlMessage(result.replyBody));
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (e) {
    console.error("[twilio/sms]", e);
    const twiml = twimlResponse(
      twimlMessage("Vowpath: Something went wrong. Please use your dashboard."),
    );
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

export async function GET() {
  return new NextResponse(twimlResponse(twimlMessage("Vowpath SMS webhook is active.")), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
