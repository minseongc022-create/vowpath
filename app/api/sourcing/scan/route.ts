import { NextResponse } from "next/server";
import { scrapeListing } from "@/lib/sourcing-detail/fetch-listing";
import { isSupportedListingUrl, normalizeListingUrl } from "@/lib/sourcing-detail/platforms";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = normalizeListingUrl(String(body.url ?? ""));
    if (!url) {
      return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
    }
    if (!isSupportedListingUrl(url)) {
      return NextResponse.json(
        { error: "1688, 타오바오, 티몰, 알리익스프레스 URL만 지원합니다." },
        { status: 400 },
      );
    }

    const listing = await scrapeListing(url);
    return NextResponse.json({ ok: true, listing });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "스캔 실패" },
      { status: 500 },
    );
  }
}
