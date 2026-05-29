import { NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { findUserByEmail } from "@/lib/users-db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 입력해 주세요." },
        { status: 400 },
      );
    }

    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 },
      );
    }

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      shopName: user.shopName,
    });

    const res = NextResponse.json({
      ok: true,
      redirect: "/dashboard",
    });
    res.cookies.set(sessionCookieOptions(token));
    return res;
  } catch (e) {
    console.error("[login]", e);
    return NextResponse.json(
      { error: "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
