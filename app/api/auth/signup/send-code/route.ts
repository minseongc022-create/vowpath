import { NextResponse } from "next/server";
import { createAndSendSignupCode, normalizeSignupPhone } from "@/lib/signup-verify";
import { isEmailDeliveryConfigured } from "@/lib/send-verification-code";

const DEV_EMAIL_HINT =
  "개발 모드: 실제 이메일은 발송되지 않습니다. npm run dev 터미널에서 [dev] Signup verification code 로그를 확인하세요.";

const DEV_SMS_HINT =
  "개발 모드: 실제 문자는 발송되지 않습니다. npm run dev 터미널에서 [dev] Signup verification SMS 로그를 확인하세요.";

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
      return NextResponse.json({ error: "올바른 이메일을 입력해 주세요." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 },
      );
    }

    if (password !== passwordConfirm) {
      return NextResponse.json(
        { error: "비밀번호 확인이 일치하지 않습니다." },
        { status: 400 },
      );
    }

    if (!phoneRaw) {
      return NextResponse.json(
        { error: "휴대폰 번호를 입력해 주세요. (업체 알림·SMS 승인에 사용)" },
        { status: 400 },
      );
    }

    const phone = normalizeSignupPhone(phoneRaw);
    if (!phone) {
      return NextResponse.json(
        { error: "미국 휴대폰 번호 형식을 확인해 주세요. (예: (512) 555-0100)" },
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
      message: "인증번호를 보냈습니다. 이메일 또는 문자함을 확인해 주세요.",
      devHint:
        process.env.NODE_ENV !== "production" &&
        channel === "email" &&
        !isEmailDeliveryConfigured()
          ? DEV_EMAIL_HINT
          : process.env.NODE_ENV !== "production" && channel === "sms"
            ? DEV_SMS_HINT
            : undefined,
    });
  } catch (e) {
    console.error("[signup/send-code]", e);
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json(
        { error: "서버 저장소가 설정되지 않았습니다. Vercel KV를 연결해 주세요." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "인증번호 전송 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
