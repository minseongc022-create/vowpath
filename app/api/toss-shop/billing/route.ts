import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { getAccountAccess } from "@/toss-shop/lib/billing-access";
import { PRO_PRICE_KRW } from "@/toss-shop/lib/billing";
import { createTossShopCheckout, isTossShopLsConfigured } from "@/toss-shop/lib/lemon-squeezy";
import { getAccount, getKeywordUsageToday, upgradeAccountToPro } from "@/toss-shop/lib/store";
import { verifySameOriginRequest } from "@/lib/security/request-guard";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { account, access } = await getAccountAccess(session.sub);
  if (!account || !access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keywordUsed = access.fullAccess ? null : await getKeywordUsageToday(session.sub);

  return NextResponse.json({
    plan: account.plan,
    access,
    proExpiresAt: account.proExpiresAt,
    subscriptionStatus: account.subscriptionStatus,
    checkoutConfigured: isTossShopLsConfigured(),
    keywordUsage: access.fullAccess
      ? null
      : { used: keywordUsed, limit: access.dailyKeywordLimit },
    priceKrw: PRO_PRICE_KRW,
  });
}

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await getAccount(session.sub);
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (account.plan === "owner") {
    return NextResponse.json({ error: "Owner 계정은 업그레이드가 필요 없습니다." }, { status: 400 });
  }

  const body = (await request.json()) as { action?: string; code?: string };

  if (body.action === "start_checkout") {
    if (!isTossShopLsConfigured()) {
      return NextResponse.json(
        {
          error: "결제 시스템 설정 중입니다. 잠시 후 다시 시도하거나 활성화 코드를 사용하세요.",
          checkoutConfigured: false,
        },
        { status: 503 },
      );
    }
    try {
      const checkout = await createTossShopCheckout({
        accountId: account.id,
        email: account.email,
        name: account.name,
      });
      return NextResponse.json({ ok: true, url: checkout.url, checkoutId: checkout.checkoutId });
    } catch (e) {
      console.error("[toss-shop/billing] checkout", e);
      return NextResponse.json({ error: "결제 페이지를 열 수 없습니다." }, { status: 502 });
    }
  }

  if (body.action === "activate_pro") {
    const secret = process.env.TOSS_SHOP_PRO_ACTIVATION_CODE?.trim();
    if (!secret || body.code?.trim() !== secret) {
      return NextResponse.json({ error: "유효하지 않은 활성화 코드입니다." }, { status: 403 });
    }
    const updated = await upgradeAccountToPro(session.sub, 1);
    return NextResponse.json({ ok: true, plan: updated?.plan, proExpiresAt: updated?.proExpiresAt });
  }

  return NextResponse.json(
    {
      error: "지원하지 않는 action입니다.",
      actions: ["start_checkout", "activate_pro"],
      priceKrw: PRO_PRICE_KRW,
    },
    { status: 400 },
  );
}
