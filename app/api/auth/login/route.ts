import { NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { normalizeSmsPhone } from "@/lib/phone";
import { findUserByEmail, findUserByPhone } from "@/lib/users-db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = String(body?.password ?? "");
    const email = String(body?.email ?? "").trim().toLowerCase();
    const phoneRaw = String(body?.phone ?? "").trim();

    if (!password || (!email && !phoneRaw)) {
      return NextResponse.json(
        { error: "이메일 또는 전화번호와 비밀번호를 입력해 주세요." },
        { status: 400 },
      );
    }

    let user;

    if (phoneRaw) {
      const phone = normalizeSmsPhone(phoneRaw);
      if (!phone) {
        return NextResponse.json(
          { error: "휴대폰 번호 형식을 확인해 주세요. (예: 010-1234-5678)" },
          { status: 400 },
        );
      }
      user = await findUserByPhone(phone);
    } else {
      user = await findUserByEmail(email);
    }

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "이메일/전화번호 또는 비밀번호가 올바르지 않습니다." },
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
