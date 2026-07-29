import { NextResponse } from "next/server";
import { exportImagesForMarkets } from "@/lib/sourcing-detail/market-export";
import type { MarketPlatform } from "@/lib/matchcut/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const platform = (body.platform ?? "both") as MarketPlatform;
    const images = (body.images ?? []) as { name?: string; base64?: string; url?: string }[];

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "내보낼 이미지가 없습니다." }, { status: 400 });
    }
    if (!["coupang", "smartstore", "both"].includes(platform)) {
      return NextResponse.json({ error: "platform은 coupang, smartstore, both 중 하나입니다." }, { status: 400 });
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
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "내보내기 실패" },
      { status: 500 },
    );
  }
}
