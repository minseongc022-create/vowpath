import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import {
  getAccount,
  getMerchant,
  merchantApiStatus,
  syncMerchantNow,
  updateMerchantApiKeys,
} from "@/toss-shop/lib/store";
import { isTossShopEntitled, planLabel, dataSourceLabel } from "@/toss-shop/lib/billing";
import { verifySameOriginRequest } from "@/lib/security/request-guard";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [merchant, account] = await Promise.all([
    getMerchant(session.merchantId),
    getAccount(session.sub),
  ]);
  if (!merchant || !account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const api = merchantApiStatus(merchant);
  return NextResponse.json({
    merchant: {
      shopName: merchant.shopName,
      category: merchant.category,
      bankName: merchant.bankName,
      bankAccount: merchant.bankAccount,
    },
    api,
    billing: {
      plan: account.plan ?? "trial",
      planLabel: planLabel(account.plan),
      trialEndsAt: account.trialEndsAt,
      entitled: isTossShopEntitled(account),
      dataSourceLabel: dataSourceLabel(api.dataSource),
    },
  });
}

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await getAccount(session.sub);
  if (!account || !isTossShopEntitled(account)) {
    return NextResponse.json({ error: "Trial expired", code: "PLAN_REQUIRED" }, { status: 402 });
  }

  try {
    const body = (await request.json()) as {
      action?: "save_keys" | "clear_keys" | "sync";
      accessKey?: string;
      secretKey?: string;
      sandbox?: boolean;
    };

    if (body.action === "save_keys") {
      const merchant = await updateMerchantApiKeys(session.merchantId, {
        accessKey: body.accessKey,
        secretKey: body.secretKey,
        sandbox: body.sandbox,
      });
      if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const sync = await syncMerchantNow(session.merchantId);
      return NextResponse.json({ api: merchantApiStatus(merchant), sync });
    }

    if (body.action === "clear_keys") {
      const merchant = await updateMerchantApiKeys(session.merchantId, { clear: true });
      return NextResponse.json({ api: merchant ? merchantApiStatus(merchant) : null });
    }

    if (body.action === "sync") {
      const sync = await syncMerchantNow(session.merchantId);
      const merchant = await getMerchant(session.merchantId);
      return NextResponse.json({ sync, api: merchant ? merchantApiStatus(merchant) : null });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("[toss-shop/settings]", e);
    return NextResponse.json({ error: "처리 중 오류" }, { status: 500 });
  }
}
