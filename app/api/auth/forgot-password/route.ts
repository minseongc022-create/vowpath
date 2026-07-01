import { NextResponse } from "next/server";
import { createAndSendResetCode, normalizePhone } from "@/lib/password-reset";
import { isEmailDeliveryConfigured } from "@/lib/send-reset-code";
import { isTwilioConfigured } from "@/lib/twilio-config";
import { findUserByEmail, findUserByPhone } from "@/lib/users-db";
import { recordSecurityAudit } from "@/lib/security/audit";
import { apiErrorsEn } from "@/lib/api-errors-en";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitKey,
} from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  // Rate limit: 5 reset attempts per IP per 15 minutes
  const ip = clientIpFromRequest(request);
  const ipLimit = await checkRateLimit({
    key: rateLimitKey("reset:ip", ip),
    limit: 5,
    windowSeconds: 15 * 60,
  });
  if (!ipLimit.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const channel = body?.channel === "sms" ? "sms" : "email";

    let user;

    if (channel === "sms") {
      const phoneRaw = String(body?.phone ?? "").trim();
      const phone = normalizePhone(phoneRaw);

      if (!phone) {
        return NextResponse.json(
          { error: apiErrorsEn.invalidUsPhone },
          { status: 400 },
        );
      }

      user = await findUserByPhone(phone);
    } else {
      const email = String(body?.email ?? "").trim().toLowerCase();

      if (!email || !email.includes("@")) {
        return NextResponse.json(
          { error: apiErrorsEn.invalidEmail },
          { status: 400 },
        );
      }

      user = await findUserByEmail(email);
    }

    if (!user) {
      return NextResponse.json({
        ok: true,
        message: apiErrorsEn.codeSent,
        requestId: crypto.randomUUID(),
      });
    }

    await recordSecurityAudit({
      userId: user.id,
      event: "password_reset_requested",
      detail: channel,
    });

    const result = await createAndSendResetCode(user, channel);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: apiErrorsEn.codeSent,
      requestId: result.requestId,
      devHint:
        process.env.NODE_ENV !== "production" &&
        channel === "email" &&
        !isEmailDeliveryConfigured()
          ? apiErrorsEn.devEmailHint
          : process.env.NODE_ENV !== "production" &&
              channel === "sms" &&
              !isTwilioConfigured()
            ? apiErrorsEn.devSmsHint
            : undefined,
    });
  } catch (e) {
    console.error("[forgot-password]", e);
    return NextResponse.json(
      { error: apiErrorsEn.requestFailed },
      { status: 500 },
    );
  }
}
