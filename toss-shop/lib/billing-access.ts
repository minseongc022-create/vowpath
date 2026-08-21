import { NextResponse } from "next/server";
import { getPlanAccess, type PlanAccess } from "./billing";
import { getAccount } from "./store";
import type { TossShopAccount } from "./types";

export async function getAccountAccess(accountId: string): Promise<{
  account: TossShopAccount | null;
  access: PlanAccess | null;
}> {
  const account = await getAccount(accountId);
  if (!account) return { account: null, access: null };
  return { account, access: getPlanAccess(account) };
}

export function planRequiredResponse(access: PlanAccess): NextResponse {
  return NextResponse.json(
    {
      error: "Pro 플랜이 필요합니다.",
      code: "PLAN_REQUIRED",
      tier: access.tier,
      priceKrw: access.priceKrw,
      upgradeUrl: "/dashboard/settings#upgrade",
    },
    { status: 402 },
  );
}

export function keywordLimitResponse(used: number, limit: number): NextResponse {
  return NextResponse.json(
    {
      error: `Free 플랜은 하루 ${limit}개 키워드 분석만 가능합니다. (사용 ${used}/${limit})`,
      code: "KEYWORD_LIMIT",
      used,
      limit,
      upgradeUrl: "/dashboard/settings#upgrade",
    },
    { status: 429 },
  );
}

export async function requireFullAccess(accountId: string): Promise<
  | { ok: true; account: TossShopAccount; access: PlanAccess }
  | { ok: false; response: NextResponse }
> {
  const { account, access } = await getAccountAccess(accountId);
  if (!account || !access) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!access.fullAccess) {
    return { ok: false, response: planRequiredResponse(access) };
  }
  return { ok: true, account, access };
}
