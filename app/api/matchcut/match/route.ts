import { NextResponse } from "next/server";
import { runMatchPhase } from "@/lib/sourcing-detail/pipeline";
import { isSupportedListingUrl, normalizeListingUrl } from "@/lib/sourcing-detail/platforms";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = normalizeListingUrl(String(body.url ?? ""));
    const referenceImageBase64 = String(body.referenceImageBase64 ?? "");
    const referenceMime = body.referenceMime ? String(body.referenceMime) : undefined;

    if (!url) {
      return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
    }
    if (!isSupportedListingUrl(url)) {
      return NextResponse.json(
        { error: "1688, 타오바오, 티몰, 알리익스프레스 URL만 지원합니다." },
        { status: 400 },
      );
    }
    if (!referenceImageBase64) {
      return NextResponse.json({ error: "실제 상품 사진이 필요합니다." }, { status: 400 });
    }

    const { listing, match } = await runMatchPhase({
      url,
      referenceImageBase64,
      referenceMime,
    });

    return NextResponse.json({ ok: true, listing, match });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "매칭 실패" },
      { status: 500 },
    );
  }
}
