import { NextResponse } from "next/server";
import { createAndSendResetCode } from "@/lib/password-reset";
import { isEmailDeliveryConfigured } from "@/lib/send-reset-code";
import { isTwilioConfigured } from "@/lib/twilio-config";
import { findUserByEmail } from "@/lib/users-db";

const GENERIC_OK =
  "등록된 계정이면 인증번호를 보냈습니다. 이메일 또는 문자함을 확인해 주세요.";

const DEV_EMAIL_HINT =
  "개발 모드: 실제 이메일은 발송되지 않습니다. npm run dev 터미널에서 [dev] Password reset code 로그를 확인하세요.";

const DEV_SMS_HINT =
  "개발 모드: 실제 문자는 발송되지 않습니다. npm run dev 터미널에서 [dev] Password reset SMS 로그를 확인하세요.";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const channel = body?.channel === "sms" ? "sms" : "email";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "올바른 이메일을 입력해 주세요." },
        { status: 400 },
      );
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return NextResponse.json({
        ok: true,
        message: GENERIC_OK,
      });
    }

    const result = await createAndSendResetCode(user, channel);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: GENERIC_OK,
      requestId: result.requestId,
      hasPhone: Boolean(user.phone),
      devHint:
        process.env.NODE_ENV !== "production" &&
        channel === "email" &&
        !isEmailDeliveryConfigured()
          ? DEV_EMAIL_HINT
          : process.env.NODE_ENV !== "production" &&
              channel === "sms" &&
              !isTwilioConfigured()
            ? DEV_SMS_HINT
            : undefined,
    });
  } catch (e) {
    console.error("[forgot-password]", e);
    return NextResponse.json(
      { error: "요청 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
