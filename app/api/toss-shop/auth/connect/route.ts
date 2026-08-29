import { NextResponse } from "next/server";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import { connectTossSeller, syncMerchantNow } from "@/toss-shop/lib/store";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { isOwnerSession } from "@/jarvis/core/access";
import {
  createTossShopSessionToken,
  tossShopSessionCookieOptions,
} from "@/toss-shop/lib/auth";
import { validateTossSellerKeys, TOSS_SELLER_CENTER_URL } from "@/toss-shop/lib/toss-connect";
import { configFromEnv } from "@/toss-shop/lib/api/config";

export async function GET() {
  const envConfig = configFromEnv();
  return NextResponse.json({
    tossSellerUrl: TOSS_SELLER_CENTER_URL,
    serverKeysConfigured: Boolean(envConfig),
  });
}

/**
 * ★ 실제로 발견된 두 번째 구멍
 *
 * 이 라우트는 인증 없이 누구나 부를 수 있었다. Toss Access/Secret Key만
 * 있으면(자기 것이든, `useServerKeys: true`로 **우리 서버에 저장된 진짜
 * 키**를 그대로 가져다 쓰든) 새 계정과 세션이 만들어졌다. 실제로 계정
 * 감사에서 `seller_thxs94nk@connect.effiroad.local`이라는, 사장님 본인
 * 계정보다 먼저 만들어진 낯선 계정이 발견됐다.
 *
 * 로그인 라우트(app/api/toss-shop/auth/login)처럼 이메일로 소유자를
 * 가리는 게 안 된다 — 여기서 만들어지는 이메일은 Toss 키에서 뽑아낸
 * 값이라 사전에 알 수 없다. 그래서 대신 **이미 소유자로 로그인된 세션이
 * 있어야만** 이 라우트가 동작하게 막는다. 사장님이 처음 들어올 때는
 * `/login`으로 소유자 이메일 로그인부터 하고, 그다음 이 화면에서 Toss
 * 키를 연결하는 흐름이면 충분하다 — 이 라우트 자체가 "계정을 새로
 * 만드는" 입구일 필요가 없다.
 */
export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await requireTossShopSessionFromRequest(request);
  if (!isOwnerSession(session)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      accessKey?: string;
      secretKey?: string;
      sandbox?: boolean;
      shopName?: string;
      name?: string;
      useServerKeys?: boolean;
    };

    let accessKey = body.accessKey?.trim() ?? "";
    let secretKey = body.secretKey?.trim() ?? "";
    let sandbox = body.sandbox ?? false;

    if (body.useServerKeys) {
      const envConfig = configFromEnv();
      if (!envConfig) {
        return NextResponse.json({ error: "서버 연동 키가 설정되어 있지 않습니다." }, { status: 400 });
      }
      accessKey = envConfig.accessKey;
      secretKey = envConfig.secretKey;
      sandbox = envConfig.sandbox;
    }

    if (!accessKey || !secretKey) {
      return NextResponse.json({ error: "Access Key와 Secret Key를 입력해주세요." }, { status: 400 });
    }

    await validateTossSellerKeys(accessKey, secretKey, sandbox);

    const account = await connectTossSeller({
      accessKey,
      secretKey,
      sandbox,
      shopName: body.shopName,
      name: body.name,
    });

    const sync = await syncMerchantNow(account.merchantId);

    const token = await createTossShopSessionToken({
      sub: account.id,
      email: account.email,
      name: account.name,
      merchantId: account.merchantId,
    });

    const res = NextResponse.json({
      ok: true,
      user: { email: account.email, name: account.name, merchantId: account.merchantId },
      sync,
    });
    res.cookies.set(tossShopSessionCookieOptions(token));
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("TOSS_TOKEN_FAILED") || msg.startsWith("TOSS_")) {
      return NextResponse.json(
        { error: "토스쇼핑 API 키가 올바르지 않습니다. 토스 셀러센터에서 발급한 키를 확인해주세요." },
        { status: 401 },
      );
    }
    console.error("[toss-shop/auth/connect]", e);
    return NextResponse.json({ error: "연동 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
