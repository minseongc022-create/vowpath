import { NextResponse } from "next/server";
import {
  createSessionToken,
  hashPassword,
  sessionCookieOptions,
} from "@/lib/auth";
import { normalizePhone } from "@/lib/password-reset";
import { createUser, findUserByEmail } from "@/lib/users-db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");
    const shopName = String(body?.shopName ?? "").trim();
    const phoneRaw = String(body?.phone ?? "").trim();
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

    if (phoneRaw && !phone) {
      return NextResponse.json(
        { error: "휴대폰 번호 형식을 확인해 주세요. (예: +1 512 555 0100)" },
        { status: 400 },
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 입력해 주세요." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 },
      );
    }

    if (await findUserByEmail(email)) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다. 로그인해 주세요." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({
      email,
      passwordHash,
      shopName,
      phone: phone ?? undefined,
    });

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
    console.error("[signup]", e);
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json(
        {
          error:
            "서버 저장소가 설정되지 않았습니다. Vercel KV를 연결해 주세요. (DEPLOY.md 참고)",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
