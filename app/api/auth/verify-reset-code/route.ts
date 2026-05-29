import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth-reset-token";
import { verifyResetCode } from "@/lib/password-reset";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestId = String(body?.requestId ?? "").trim();
    const code = String(body?.code ?? "").trim();

    if (!requestId || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "인증번호 6자리를 입력해 주세요." },
        { status: 400 },
      );
    }

    const result = await verifyResetCode(requestId, code);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const resetToken = await createPasswordResetToken(result.userId);

    return NextResponse.json({
      ok: true,
      resetToken,
    });
  } catch (e) {
    console.error("[verify-reset-code]", e);
    return NextResponse.json(
      { error: "인증 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
