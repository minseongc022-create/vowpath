import { NextResponse } from "next/server";
import { z } from "zod";
import { discoveryHeadline, discoveryQueries, selectDiscoveries } from "@/dajeong/lib/discovery-engine";
import { geocodeRegion } from "@/dajeong/lib/place-discovery";
import { discoverySourcesConfigured, fetchCultureEvents, fetchNaverBlogBuzz, fetchNaverLocal, fetchSeoulEvents } from "@/dajeong/lib/discovery-sources";
import { dajeongAiRateLimit } from "@/lib/security/ai-route-guard";
import type { DiscoveryItem } from "@/dajeong/lib/types";

/**
 * "요즘 뭐 떴어?"에 답하는 엔드포인트.
 *
 * 기간이 있는 전시·공연은 기관 데이터에서, 아직 기관 데이터에 없는 신상 가게는
 * 네이버 검색에서 가져와 한 목록으로 정리한다. 확정(official)과 추정(inferred)은
 * 응답에서 끝까지 구분된 채로 나간다 — 화면이 둘을 다르게 보여줄 수 있어야 한다.
 */

const MOODS = ["romantic", "mysterious", "trendy", "calm", "luxurious", "playful", "warm", "nature", "artistic", "hidden"] as const;

const bodySchema = z.object({
  region: z.string().trim().max(40).optional(),
  preferences: z.array(z.string().max(60)).max(8).optional(),
  moods: z.array(z.enum(MOODS)).max(6).optional(),
  withinDays: z.number().int().min(1).max(90).optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

export async function POST(request: Request) {
  const limited = await dajeongAiRateLimit(request);
  if (limited) return NextResponse.json(limited, { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "검색 조건을 다시 확인해줘." }, { status: 400 });
  }
  const { region, preferences, moods, withinDays, limit } = parsed.data;

  // 출처가 하나도 안 붙어 있으면 "없다"가 아니라 "못 본다"고 말해야 한다.
  if (!discoverySourcesConfigured()) {
    return NextResponse.json({
      items: [],
      sourcesConfigured: false,
      message: "지금 행사·팝업 데이터 연결이 안 돼 있어서 찾아볼 수가 없어. 뜬 게 없다는 뜻이 아니라 우리 쪽 설정 문제야.",
    });
  }

  const queries = discoveryQueries({ region, preferences, moods });
  // "광화문"으로 물으면 실제 행사가 "경복궁"으로 등록돼 있어도 찾아야 한다 — 이름이 아니라
  // 좌표 거리로 지역을 판단하려면 먼저 그 지역이 어디인지 좌표를 알아야 한다.
  const regionCoordinates = region ? await geocodeRegion(region) : undefined;

  try {
    const [culture, seoul, local, buzz] = await Promise.all([
      // 지역은 이름이 아니라 좌표 사각형으로 서버에 직접 요청한다 — "광화문"과 "경복궁"처럼
      // 이름은 달라도 실제로는 붙어 있는 곳을 API 단계에서부터 잡아낸다.
      fetchCultureEvents({ near: regionCoordinates, radiusKm: 8, keyword: preferences?.[0], withinDays, limit: 40 }),
      // 자치구 단위 행사는 전국 데이터에 잘 안 올라온다. 서울을 물었을 때만 부른다.
      region && /서울|강남|성수|홍대|연남|잠실|종로|용산|여의도|광화문|마포|송파/.test(region)
        ? fetchSeoulEvents({ keyword: region.match(/[가-힣]+구(?=\s|$)/)?.[0], limit: 30 }).catch(() => [] as DiscoveryItem[])
        : Promise.resolve([] as DiscoveryItem[]),
      Promise.all(queries.slice(0, 2).map((query) => fetchNaverLocal({ query }))).then((rows) => rows.flat()),
      Promise.all(queries.slice(0, 2).map((query) => fetchNaverBlogBuzz({ query }))).then((rows) => rows.flat()),
    ]);

    const items = selectDiscoveries({ items: [...culture, ...seoul, ...local, ...buzz], region, regionCoordinates, limit });
    const officialCount = items.filter((item) => item.confidence === "official").length;

    return NextResponse.json({
      items: items.map((item: DiscoveryItem) => ({ ...item, headline: discoveryHeadline(item) })),
      sourcesConfigured: true,
      officialCount,
      inferredCount: items.length - officialCount,
      message: items.length
        // 확정과 추정의 개수를 그대로 말한다. 뭉뚱그리면 어디까지 믿을지 판단할 수 없다.
        ? `${items.length}개 찾았어. 기간까지 확인된 건 ${officialCount}개고, 나머지는 요즘 얘기가 많이 나오는 것들이야.`
        : "지금 이 조건으로 새로 뜬 건 안 보여. 지역을 넓히거나 다른 걸로 찾아볼까?",
    });
  } catch {
    return NextResponse.json({ error: "지금 찾아보는 중에 문제가 생겼어. 잠시 후에 다시 해볼래?" }, { status: 502 });
  }
}
