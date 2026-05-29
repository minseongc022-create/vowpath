import { NextResponse } from "next/server";

/** Direct signup without verification is disabled — use send-code + verify. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "본인 인증이 필요합니다. 인증번호를 받은 뒤 가입을 완료해 주세요.",
    },
    { status: 403 },
  );
}
