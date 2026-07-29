import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth-password";
import {
  createMatchCutSessionToken,
  matchCutSessionCookieOptions,
} from "@/lib/matchcut/auth-token";
import { initWelcomeWallet } from "@/lib/matchcut/credits-store";
import { createMatchCutUser, findMatchCutUserByEmail } from "@/lib/matchcut/users-db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const displayName = String(body.displayName ?? "").trim() || "셀러";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "올바른 이메일을 입력하세요." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
    }

    if (await findMatchCutUserByEmail(email)) {
      return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createMatchCutUser({ email, passwordHash, displayName });
    await initWelcomeWallet(user.id);

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
      { error: e instanceof Error ? e.message : "가입 실패" },
      { status: 500 },
    );
  }
}
