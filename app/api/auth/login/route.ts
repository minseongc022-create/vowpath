import { NextResponse } from "next/server";
import {
  clearSessionCookieOptions,
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { normalizeSmsPhone } from "@/lib/phone";
import { findUserByEmail, findUserByPhone } from "@/lib/users-db";

const INVALID_CREDENTIALS = "이메일/전화번호 또는 비밀번호가 올바르지 않습니다.";

function unauthorized(message = INVALID_CREDENTIALS) {
  const res = NextResponse.json({ ok: false, error: message }, { status: 401 });
  res.cookies.set(clearSessionCookieOptions());
  return res;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = String(body?.password ?? "");
    const email = String(body?.email ?? "").trim().toLowerCase();
    const phoneRaw = String(body?.phone ?? "").trim();

    if (!password || (!email && !phoneRaw)) {
      return NextResponse.json(
        { ok: false, error: "이메일 또는 전화번호와 비밀번호를 입력해 주세요." },
        { status: 400 },
      );
    }

    let user;

    if (phoneRaw) {
      const phone = normalizeSmsPhone(phoneRaw);
      if (!phone) {
        return NextResponse.json(
          { ok: false, error: "미국 휴대폰 번호 형식을 확인해 주세요. (예: (512) 555-0100)" },
          { status: 400 },
        );
      }
      user = await findUserByPhone(phone);
    } else {
      user = await findUserByEmail(email);
    }

    if (!user) {
      return unauthorized();
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return unauthorized();
    }

    const rememberMe = body?.rememberMe !== false;

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      shopName: user.shopName,
    });

    const res = NextResponse.json({
      ok: true,
      redirect: "/dashboard",
    });
    res.cookies.set(sessionCookieOptions(token, rememberMe));
    return res;
  } catch (e) {
    console.error("[login]", e);
    return NextResponse.json(
      { ok: false, error: "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
