import { NextResponse } from "next/server";
import { handleCustomerVerificationReply } from "@/lib/customer-verification/flow";
import { handleOwnerSmsReply } from "@/lib/owner-sms-reply";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { handleTechDispatchReply } from "@/lib/tech-dispatch/assign";
import { handleOnMyWaySmsReply } from "@/lib/tech-dispatch/on-my-way";
import { findTechByPhone } from "@/lib/tech-dispatch/store";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { twimlMessage, twimlResponse } from "@/lib/twilio-xml";
import {
  customerSmsErrorReply,
  customerSmsStartReply,
  customerSmsStopReply,
} from "@/lib/customer-brand";

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (process.env.NODE_ENV === "production" && !validateTwilioWebhook(request, rawBody)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const params = new URLSearchParams(rawBody);
  const from = params.get("From") ?? "";
  const to = params.get("To") ?? "";
  const body = params.get("Body") ?? "";

  if (/^\s*STOP\s*$/i.test(body.trim())) {
    const twiml = twimlResponse(twimlMessage(customerSmsStopReply));
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  if (/^\s*START\s*$/i.test(body.trim())) {
    const twiml = twimlResponse(twimlMessage(customerSmsStartReply));
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  try {
    const userId = to ? await resolveTenantUserId({ to }) : null;

    if (userId) {
      const otwResult = await handleOnMyWaySmsReply({ userId, fromPhone: from, body });
      if (otwResult.handled) {
        const twiml = twimlResponse(twimlMessage(otwResult.replyBody));
        return new NextResponse(twiml, {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      }

      const tech = await findTechByPhone(userId, from);
      if (tech) {
        const techResult = await handleTechDispatchReply({ userId, fromPhone: from, body });
        if (techResult.handled) {
          const twiml = twimlResponse(twimlMessage(techResult.replyBody));
          return new NextResponse(twiml, {
            status: 200,
            headers: { "Content-Type": "text/xml" },
          });
        }
      }
    }

    const customer = await handleCustomerVerificationReply({ from, body, userId });
    if (customer.handled) {
      const twiml = twimlResponse(twimlMessage(customer.replyBody));
      return new NextResponse(twiml, {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const result = await handleOwnerSmsReply({ from, body });
    if (result.handled) {
      const twiml = twimlResponse(twimlMessage(result.replyBody));
      return new NextResponse(twiml, {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    return new NextResponse(twimlResponse(""), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (e) {
    console.error("[twilio/sms]", e);
    const twiml = twimlResponse(twimlMessage(customerSmsErrorReply));
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

export async function GET() {
  return new NextResponse(twimlResponse(twimlMessage("SMS webhook active.")), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
