import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-password";
import {
  createMatchCutSessionToken,
  matchCutSessionCookieOptions,
} from "@/lib/matchcut/auth-token";
import { findMatchCutUserByEmail } from "@/lib/matchcut/users-db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "이메일과 비밀번호를 입력하세요." }, { status: 400 });
    }

    const user = await findMatchCutUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const token = await createMatchCutSessionToken({
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      sessionVersion: user.sessionVersion,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
    res.cookies.set(matchCutSessionCookieOptions(token));
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "로그인 실패" },
      { status: 500 },
    );
  }
}
