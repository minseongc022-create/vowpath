import { NextResponse } from "next/server";
import { apiErrorsEn } from "@/lib/api-errors-en";
import { ownerSignupPhoneError } from "@/lib/owner-phone-policy";
import { createAndSendSignupCode, normalizeSignupPhone } from "@/lib/signup-verify";
import { isEmailDeliveryConfigured } from "@/lib/send-verification-code";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");
    const passwordConfirm = String(body?.passwordConfirm ?? "");
    const shopName = String(body?.shopName ?? "").trim();
    const phoneRaw = String(body?.phone ?? "").trim();
    const channel = body?.channel === "sms" ? "sms" : "email";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: apiErrorsEn.invalidEmail }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: apiErrorsEn.passwordTooShort }, { status: 400 });
    }

    if (password !== passwordConfirm) {
      return NextResponse.json({ error: apiErrorsEn.passwordMismatch }, { status: 400 });
    }

    if (!phoneRaw) {
      return NextResponse.json({ error: apiErrorsEn.phoneRequiredSignup }, { status: 400 });
    }

    const phone = normalizeSignupPhone(phoneRaw, email);
    if (!phone) {
      return NextResponse.json(
        { error: ownerSignupPhoneError(email) },
        { status: 400 },
      );
    }

    const result = await createAndSendSignupCode({
      email,
      password,
      shopName,
      phone,
      channel,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      signupRequestId: result.signupRequestId,
      message: apiErrorsEn.codeSent,
      devHint:
        process.env.NODE_ENV !== "production" &&
        channel === "email" &&
        !isEmailDeliveryConfigured()
          ? apiErrorsEn.devEmailHint
          : process.env.NODE_ENV !== "production" && channel === "sms"
            ? apiErrorsEn.devSmsHint
            : undefined,
    });
  } catch (e) {
    console.error("[signup/send-code]", e);
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json({ error: apiErrorsEn.kvNotConfigured }, { status: 503 });
    }
    return NextResponse.json({ error: apiErrorsEn.sendCodeFailed }, { status: 500 });
  }
}
