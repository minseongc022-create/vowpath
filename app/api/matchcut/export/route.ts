import { NextResponse } from "next/server";
import { exportImagesForMarkets } from "@/lib/sourcing-detail/market-export";
import { requireMatchCutSession } from "@/lib/matchcut/session";
import type { MarketPlatform } from "@/lib/matchcut/constants";

export async function POST(request: Request) {
  try {
    await requireMatchCutSession();
    const body = await request.json();
    const platform = (body.platform ?? "both") as MarketPlatform;
    const images = (body.images ?? []) as { name?: string; base64?: string; url?: string }[];

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "내보낼 이미지가 없습니다." }, { status: 400 });
    }

    const files = await exportImagesForMarkets({
      platform,
      images: images.map((img, i) => ({
        name: img.name ?? `image-${i + 1}`,
        base64: img.base64,
        url: img.url,
      })),
    });

    return NextResponse.json({ ok: true, files });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "내보내기 실패";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
