import { NextResponse } from "next/server";
import { scrapeListing } from "@/lib/sourcing-detail/fetch-listing";
import { requireMatchCutSession } from "@/lib/matchcut/session";
import { isSupportedListingUrl, normalizeListingUrl } from "@/lib/sourcing-detail/platforms";

export async function POST(request: Request) {
  try {
    await requireMatchCutSession();
    const body = await request.json();
    const url = normalizeListingUrl(String(body.url ?? ""));
    if (!url || !isSupportedListingUrl(url)) {
      return NextResponse.json({ error: "지원하지 않는 URL입니다." }, { status: 400 });
    }
    const listing = await scrapeListing(url);
    return NextResponse.json({ ok: true, listing });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "스캔 실패";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
