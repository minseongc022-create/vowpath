import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { completeVerifiedSignup, normalizeSignupPhone } from "@/lib/signup-verify";
import { deletePendingSignup } from "@/lib/signup-verify-store";
import { createUser } from "@/lib/users-db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signupRequestId = String(body?.signupRequestId ?? "").trim();
    const phoneRaw = String(body?.phone ?? "").trim();
    if (!signupRequestId) {
      return NextResponse.json({ error: "인증 정보가 없습니다." }, { status: 400 });
    }

    const phone = phoneRaw ? normalizeSignupPhone(phoneRaw) : null;

    if (phoneRaw && !phone) {
      return NextResponse.json(
        { error: "미국 휴대폰 번호 형식을 확인해 주세요. (예: (512) 555-0100)" },
        { status: 400 },
      );
    }

    const result = await completeVerifiedSignup(signupRequestId, phone ?? undefined);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { pending } = result;

    const user = await createUser({
      email: pending.email,
      passwordHash: pending.passwordHash,
      shopName: pending.shopName,
      phone: pending.phone,
    });

    await deletePendingSignup(signupRequestId);

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      shopName: user.shopName,
    });

    const res = NextResponse.json({
      ok: true,
      redirect: "/settings",
    });
    res.cookies.set(sessionCookieOptions(token));
    return res;
  } catch (e) {
    console.error("[signup/complete]", e);
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json(
        { error: "서버 저장소가 설정되지 않았습니다. Vercel KV를 연결해 주세요." },
        { status: 503 },
      );
    }
    if (e instanceof Error && e.message === "EMAIL_EXISTS") {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다. 로그인해 주세요." },
        { status: 409 },
      );
    }
    if (e instanceof Error && e.message === "PHONE_REQUIRED") {
      return NextResponse.json(
        { error: "휴대폰 번호가 필요합니다." },
        { status: 400 },
      );
    }
    if (e instanceof Error && e.message === "PHONE_EXISTS") {
      return NextResponse.json(
        { error: "이미 등록된 휴대폰 번호입니다. 다른 번호를 사용해 주세요." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "회원가입 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
