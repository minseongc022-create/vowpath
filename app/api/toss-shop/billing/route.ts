import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { getAccountAccess } from "@/toss-shop/lib/billing-access";
import { PRO_PRICE_KRW } from "@/toss-shop/lib/billing";
import { getKeywordUsageToday, upgradeAccountToPro } from "@/toss-shop/lib/store";
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

  const body = (await request.json()) as { action?: string; code?: string };
  if (body.action === "activate_pro") {
    const secret = process.env.TOSS_SHOP_PRO_ACTIVATION_CODE?.trim();
    if (!secret || body.code?.trim() !== secret) {
      return NextResponse.json({ error: "유효하지 않은 활성화 코드입니다." }, { status: 403 });
    }
    const account = await upgradeAccountToPro(session.sub, 1);
    return NextResponse.json({ ok: true, plan: account?.plan, proExpiresAt: account?.proExpiresAt });
  }

  return NextResponse.json(
    {
      error: "결제 연동 준비 중입니다. Pro 활성화 코드를 입력하거나 관리자에게 문의하세요.",
      priceKrw: PRO_PRICE_KRW,
      contact: "minseongc022@gmail.com",
    },
    { status: 501 },
  );
}
