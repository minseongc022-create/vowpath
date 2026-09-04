import { NextResponse } from "next/server";
import { z } from "zod";
import { searchRealPlaces } from "@/dajeong/lib/place-discovery";
import { rankRealPlaceCandidates, estimatePlacePrice } from "@/dajeong/lib/place-utils";
import { dajeongAiRateLimit } from "@/lib/security/ai-route-guard";

/**
 * 직접 만들기 화면에서 "하루에게 장소 찾아달라기"를 눌렀을 때 쓰는 검색.
 * 계획을 만들지 않고 후보만 돌려준다 — 무엇을 담을지는 사용자가 고른다.
 */

const bodySchema = z.object({
  region: z.string().min(1).max(40),
  category: z.enum(["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift"]),
  query: z.string().max(120).optional(),
  budget: z.number().int().min(0).max(5_000_000).optional(),
});

export async function POST(request: Request) {
  const limited = await dajeongAiRateLimit(request);
  if (limited) return NextResponse.json(limited, { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "검색 조건을 다시 확인해 주세요." }, { status: 400 });
  }
  const { region, category, query, budget } = parsed.data;

  try {
    const candidates = await searchRealPlaces({ region, category, query });
    const budgetShare = budget && budget > 0 ? budget : estimatePlacePrice(category, undefined, 40_000) * 1.5;
    const ranked = rankRealPlaceCandidates(candidates, undefined, category, budgetShare, estimatePlacePrice(category, undefined, 40_000));
    const places = ranked.slice(0, 8).map((place) => ({
      id: place.id,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      rating: place.rating,
      reviewCount: place.reviewCount,
      phoneNumber: place.phoneNumber,
      mapsUrl: place.mapsUrl,
      photoUrl: place.photoUrl,
      sourceLabel: place.sourceLabel,
      signals: place.selectionSignals ?? [],
      estimatedPrice: estimatePlacePrice(category, place.priceLevel, estimatePlacePrice(category, undefined, 40_000)),
    }));
    return NextResponse.json({
      places,
      // 못 찾았으면 왜 비었는지 화면이 그대로 말할 수 있게 함께 돌려준다.
      message: places.length
        ? `${places.length}곳을 찾았어요.`
        : "이 조건으로는 실제 가게를 찾지 못했어요. 동네를 더 좁히거나 다른 표현으로 말해 주세요.",
    });
  } catch {
    return NextResponse.json({ error: "장소를 찾는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
