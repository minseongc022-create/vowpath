import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { getWinnerReportForMerchant } from "@/toss-shop/lib/store";

/**
 * 효자상품 리포트 + 광고비 배분 계획.
 * ?budget=30000 으로 일 광고예산을 지정하면 배분 계획까지 함께 반환한다.
 */
export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const raw = url.searchParams.get("budget");
  const budget = raw ? Number.parseInt(raw, 10) : undefined;

  const result = await getWinnerReportForMerchant(
    session.merchantId,
    Number.isFinite(budget) && (budget ?? 0) > 0 ? budget : undefined,
  );
  return NextResponse.json(result);
}
