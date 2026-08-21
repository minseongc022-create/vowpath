import { NextResponse } from "next/server";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import { connectTossSeller, syncMerchantNow } from "@/toss-shop/lib/store";
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

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

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
