import { NextResponse } from "next/server";
import { CREDIT_COSTS } from "@/lib/matchcut/constants";
import { debitCredits, getCreditBalance } from "@/lib/matchcut/credits-store";
import { calcPricing, enrichPricingRationale } from "@/lib/matchcut/pricing";
import { requireMatchCutSession } from "@/lib/matchcut/session";
import { searchNaverShopping } from "@/lib/sourcing-detail/competitor-research";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await requireMatchCutSession();
    const body = await request.json();
    const costKrw = Number(body.costKrw ?? 0);
    const fulfillmentKrw = Number(body.fulfillmentKrw ?? 0);
    const targetMarginRate = body.targetMarginRate != null ? Number(body.targetMarginRate) : 0.25;
    const marketId = String(body.marketId ?? "coupang");
    const searchQuery = String(body.searchQuery ?? "").trim();
    const productName = body.productName ? String(body.productName) : undefined;
    const enrich = body.enrich !== false;

    if (!costKrw || costKrw <= 0) {
      return NextResponse.json({ error: "원가(costKrw)를 입력하세요." }, { status: 400 });
    }

    await debitCredits(session.sub, CREDIT_COSTS.pricing);

    const competitors = searchQuery ? await searchNaverShopping(searchQuery) : [];
    let pricing = calcPricing({
      costs: { costKrw, fulfillmentKrw, targetMarginRate, marketId },
      competitors,
      productName,
    });

    if (enrich) {
      pricing = {
        ...pricing,
        rationale: await enrichPricingRationale(pricing, productName),
      };
    }

    const credits = await getCreditBalance(session.sub);
    return NextResponse.json({
      ok: true,
      pricing,
      competitors: competitors.slice(0, 8),
      creditsDebited: CREDIT_COSTS.pricing,
      credits,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "가격 분석 실패";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (msg === "INSUFFICIENT_CREDITS") {
      return NextResponse.json(
        { error: "크레딧이 부족합니다.", code: "INSUFFICIENT_CREDITS" },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
