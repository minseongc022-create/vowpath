import { NextResponse } from "next/server";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import { authenticateAccount, createAccount } from "@/toss-shop/lib/store";
import {
  createTossShopSessionToken,
  tossShopSessionCookieOptions,
} from "@/toss-shop/lib/auth";

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
      shopName?: string;
      mode?: "login" | "signup";
    };

    const email = body.email?.trim();
    const password = body.password?.trim();
    if (!email || !password) {
      return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
    }

    let account;
    if (body.mode === "signup") {
      const name = body.name?.trim() || "셀러";
      const shopName = body.shopName?.trim() || `${name}의 상점`;
      try {
        account = await createAccount({ email, password, name, shopName });
      } catch (e) {
        if (e instanceof Error && e.message === "EMAIL_TAKEN") {
          return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
        }
        throw e;
      }
    } else {
      account = await authenticateAccount(email, password);
      if (!account) {
        return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
      }
    }

    const token = await createTossShopSessionToken({
      sub: account.id,
      email: account.email,
      name: account.name,
      merchantId: account.merchantId,
    });

    const res = NextResponse.json({
      ok: true,
      user: { email: account.email, name: account.name, merchantId: account.merchantId },
    });
    res.cookies.set(tossShopSessionCookieOptions(token));
    return res;
  } catch (e) {
    console.error("[toss-shop/auth/login]", e);
    return NextResponse.json({ error: "로그인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
