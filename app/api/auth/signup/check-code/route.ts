import { NextResponse } from "next/server";
import { checkSignupCode } from "@/lib/signup-verify";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signupRequestId = String(body?.signupRequestId ?? "").trim();
    const code = String(body?.code ?? "").trim();

    if (!signupRequestId || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "인증번호 6자리를 입력해 주세요." },
        { status: 400 },
      );
    }

    const result = await checkSignupCode(signupRequestId, code);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "인증이 완료되었습니다." });
  } catch (e) {
    console.error("[signup/check-code]", e);
    return NextResponse.json(
      { error: "인증 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
