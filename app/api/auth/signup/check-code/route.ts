import { NextResponse } from "next/server";
import { checkSignupCode } from "@/lib/signup-verify";
import { apiErrorsEn } from "@/lib/api-errors-en";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signupRequestId = String(body?.signupRequestId ?? "").trim();
    const code = String(body?.code ?? "").trim();

    if (!signupRequestId || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: apiErrorsEn.codeRequired },
        { status: 400 },
      );
    }

    const result = await checkSignupCode(signupRequestId, code);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: apiErrorsEn.verifySuccess });
  } catch (e) {
    console.error("[signup/check-code]", e);
    return NextResponse.json(
      { error: apiErrorsEn.verifyFailed },
      { status: 500 },
    );
  }
}
