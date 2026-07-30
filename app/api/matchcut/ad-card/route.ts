import { NextResponse } from "next/server";
import { AD_CARD_STYLES, generateAdCards } from "@/lib/matchcut/ad-card";
import { CREDIT_COSTS } from "@/lib/matchcut/constants";
import { debitCredits, getCreditBalance, grantCredits } from "@/lib/matchcut/credits-store";
import { requireMatchCutSession } from "@/lib/matchcut/session";

export const maxDuration = 300;

export async function GET() {
  try {
    await requireMatchCutSession();
    return NextResponse.json({ ok: true, styles: AD_CARD_STYLES });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireMatchCutSession();
    const body = await request.json();
    const productName = String(body.productName ?? "").trim();
    const productImageBase64 = String(body.productImageBase64 ?? "");
    const productMime = body.productMime ? String(body.productMime) : undefined;
    const sellingPoints = Array.isArray(body.sellingPoints)
      ? body.sellingPoints.map(String)
      : [];
    const priceKrw = body.priceKrw != null ? Number(body.priceKrw) : undefined;
    const styleIds = Array.isArray(body.styleIds)
      ? body.styleIds.map(String)
      : Array.isArray(body.specIds)
        ? body.specIds.map(String)
        : undefined;

    if (!productName || !productImageBase64) {
      return NextResponse.json(
        { error: "상품명과 상품 사진이 필요합니다." },
        { status: 400 },
      );
    }

    const count = styleIds?.length || 3;
    const cost = CREDIT_COSTS.adCard * count;
    await debitCredits(session.sub, cost);

    const cards = await generateAdCards({
      productName,
      productImageBase64,
      productMime,
      sellingPoints,
      priceKrw,
      styleIds,
    });

    const failed = cards.filter((c) => !c.imageBase64).length;
    if (failed > 0) {
      await grantCredits(session.sub, CREDIT_COSTS.adCard * failed, "permanent");
    }

    const credits = await getCreditBalance(session.sub);
    return NextResponse.json({
      ok: true,
      cards,
      creditsDebited: cost - CREDIT_COSTS.adCard * failed,
      credits,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "광고카드 생성 실패";
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
