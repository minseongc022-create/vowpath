import { NextResponse } from "next/server";
import { z } from "zod";
import { findPlaceByName, searchRealPlaces } from "@/dajeong/lib/place-discovery";
import { classifyPlaceRequest, guessCategory, stripRegionFromName } from "@/dajeong/lib/place-intent";
import { rankRealPlaceCandidates, estimatePlacePrice, type RealPlaceCandidate } from "@/dajeong/lib/place-utils";
import { dajeongAiRateLimit } from "@/lib/security/ai-route-guard";
import type { PlanCategory } from "@/dajeong/lib/types";

/**
 * 직접 만들기 화면에서 "하루에게 장소 찾아달라기"를 눌렀을 때 쓰는 검색.
 * 계획을 만들지 않고 후보만 돌려준다 — 무엇을 담을지는 사용자가 고른다.
 *
 * 여기서 반드시 갈라야 하는 두 가지가 있다.
 *   지목("인천 까사올리브 찾아줘")  → 그 가게가 맞는지만 확인하고, 없으면 없다고 말한다.
 *   조건("분위기 좋은 파스타집")     → 조건에 맞는 후보를 넓게 모아 준다.
 * 지목을 조건처럼 처리하면 "까사올리브"를 찾다가 "인천 맛집"으로 갈아타 엉뚱한 가게를
 * 정답인 양 보여주게 된다. 실제로 그 사고가 났고, 그래서 아래 두 갈래가 분리돼 있다.
 */

const CATEGORIES = ["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift"] as const;

const bodySchema = z.object({
  region: z.string().min(1).max(40),
  // 카테고리는 힌트일 뿐 필수가 아니다 — 말로만 찾을 수 있어야 한다.
  category: z.enum(CATEGORIES).optional(),
  query: z.string().max(120).optional(),
  budget: z.number().int().min(0).max(5_000_000).optional(),
});

/** 업종을 모르면 가격도 추정할 수 없다. 지목 검색은 가게가 스스로 말하는 업종(카카오 분류)을 본다. */
function categoryOf(place: RealPlaceCandidate, hint: PlanCategory | undefined, text: string): PlanCategory {
  return hint ?? guessCategory((place.selectionSignals ?? []).join(" ")) ?? guessCategory(text) ?? "meal";
}

function toPayload(place: RealPlaceCandidate, category: PlanCategory) {
  const base = estimatePlacePrice(category, undefined, 40_000);
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    category,
    rating: place.rating,
    reviewCount: place.reviewCount,
    phoneNumber: place.phoneNumber,
    mapsUrl: place.mapsUrl,
    photoUrl: place.photoUrl,
    sourceLabel: place.sourceLabel,
    signals: place.selectionSignals ?? [],
    estimatedPrice: estimatePlacePrice(category, place.priceLevel, base),
  };
}

export async function POST(request: Request) {
  const limited = await dajeongAiRateLimit(request);
  if (limited) return NextResponse.json(limited, { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "검색 조건을 다시 확인해줘." }, { status: 400 });
  }
  const { region, category: hint, query, budget } = parsed.data;
  const intent = query?.trim() ? classifyPlaceRequest(query) : null;

  try {
    // ── 지목: 그 가게가 맞는지만 본다 ─────────────────────────────
    if (intent?.kind === "specific") {
      // 지역을 따로 받은 화면에서는 사용자가 "인천 까사올리브"처럼 지역을 한 번 더 쓰기도 한다.
      // 이름에 남겨두면 "인천 인천 까사올리브"로 검색돼 매칭만 어긋난다.
      const placeName = stripRegionFromName(intent.placeName, [region]) || intent.placeName;
      const matches = await findPlaceByName({ placeName, region });
      if (!matches.length) {
        return NextResponse.json({
          places: [],
          intent: "specific",
          askedFor: placeName,
          // 지목한 가게를 못 찾았으면 비슷한 다른 가게로 채우지 않는다. 그건 거짓말이다.
          message: `'${placeName}'은(는) ${region}에서 못 찾았어. 비슷한 다른 가게를 대신 보여주진 않을게. 동네 이름이나 주소를 같이 알려주면 다시 찾아볼게.`,
        });
      }
      const places = matches.slice(0, 6).map((place) => toPayload(place, categoryOf(place, hint, intent.raw)));
      return NextResponse.json({
        places,
        intent: "specific",
        askedFor: placeName,
        message: places.length === 1
          ? `'${places[0].name}' 찾았어.`
          : `'${placeName}'으로 ${places.length}곳이 나왔어. 맞는 곳을 골라줘.`,
      });
    }

    // ── 조건: 조건에 맞는 후보를 넓게 모은다 ───────────────────────
    const keywords = intent?.keywords ?? "";
    const category = hint ?? guessCategory(keywords);
    if (!category) {
      return NextResponse.json({
        places: [],
        intent: "conditional",
        // 업종을 모르는 채로 아무 데나 뒤지면 엉뚱한 결과가 나온다. 짐작하지 말고 한 번 묻는다.
        message: "어떤 곳을 찾을까? 식당·카페·꽃집처럼 종류를 한 단어만 붙여주면 바로 찾을게.",
      });
    }

    const candidates = await searchRealPlaces({ region, category, query: keywords || undefined });
    const base = estimatePlacePrice(category, undefined, 40_000);
    const budgetShare = budget && budget > 0 ? budget : base * 1.5;
    const ranked = rankRealPlaceCandidates(candidates, undefined, category, budgetShare, base);
    const places = ranked.slice(0, 8).map((place) => toPayload(place, category));
    return NextResponse.json({
      places,
      intent: "conditional",
      // 못 찾았으면 왜 비었는지 화면이 그대로 말할 수 있게 함께 돌려준다.
      message: places.length
        ? `${places.length}곳 찾았어.`
        : "이 조건으로는 실제 가게를 못 찾았어. 동네를 더 좁히거나 다른 표현으로 말해줘.",
    });
  } catch {
    return NextResponse.json({ error: "장소를 찾는 중 문제가 생겼어. 잠시 후 다시 시도해줘." }, { status: 502 });
  }
}
