import { NextResponse } from "next/server";
import { CREDIT_COSTS } from "@/lib/matchcut/constants";
import { debitCredits, getCreditBalance, grantCredits } from "@/lib/matchcut/credits-store";
import { registerToMarkets, type MarketChannelId } from "@/lib/matchcut/markets";
import { requireMatchCutSession } from "@/lib/matchcut/session";

export const maxDuration = 120;

const VALID: MarketChannelId[] = [
  "coupang",
  "smartstore",
  "elevenst",
  "gmarket",
  "auction",
];

export async function POST(request: Request) {
  try {
    const session = await requireMatchCutSession();
    const body = await request.json();
    const channels = (Array.isArray(body.channels) ? body.channels : [])
      .map(String)
      .filter((c): c is MarketChannelId => VALID.includes(c as MarketChannelId));

    const title = String(body.title ?? "").trim();
    const salePrice = Number(body.salePrice ?? 0);
    const detailHtml = String(body.detailHtml ?? "");
    const imagesBase64 = Array.isArray(body.imagesBase64)
      ? body.imagesBase64.map(String).filter(Boolean)
      : [];

    if (!channels.length) {
      return NextResponse.json({ error: "등록할 마켓을 선택하세요." }, { status: 400 });
    }
    if (!title || !salePrice) {
      return NextResponse.json({ error: "상품명과 판매가가 필요합니다." }, { status: 400 });
    }

    const cost = CREDIT_COSTS.marketRegister * channels.length;
    await debitCredits(session.sub, cost);

    const results = await registerToMarkets({
      channels,
      listing: {
        title,
        salePrice,
        detailHtml,
        imagesBase64,
        brand: body.brand ? String(body.brand) : undefined,
        stock: body.stock != null ? Number(body.stock) : undefined,
        categoryHint: body.categoryHint ? String(body.categoryHint) : undefined,
        credentials: body.credentials && typeof body.credentials === "object"
          ? Object.fromEntries(
              Object.entries(body.credentials).map(([k, v]) => [k, String(v)]),
            )
          : undefined,
      },
    });

    // Refund channels that hard-errored with no draft
    const failedHard = results.filter((r) => r.status === "error").length;
    if (failedHard > 0) {
      await grantCredits(session.sub, CREDIT_COSTS.marketRegister * failedHard, "permanent");
    }

    const credits = await getCreditBalance(session.sub);
    return NextResponse.json({
      ok: true,
      results,
      creditsDebited: cost - CREDIT_COSTS.marketRegister * failedHard,
      credits,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "등록 실패";
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
