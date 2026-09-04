import { NextResponse } from "next/server";
import { kakaoLocalEnabled, searchKakaoPlaces } from "@/dajeong/lib/kakao-local";
import { searchRealPlaces } from "@/dajeong/lib/place-discovery";
import { cultureDataKey, naverSearchCredentials, probeSourceShape, seoulOpenDataKey } from "@/dajeong/lib/discovery-sources";

export const dynamic = "force-dynamic";

/**
 * "실제 장소를 지금 찾을 수 있는 상태인가"를 확인하는 진단용 엔드포인트.
 *
 * 배포 환경에서 검색이 0건으로 돌아올 때, 원인이 키가 없는 건지·키가 거부당하는 건지·
 * 그 지역에 진짜 결과가 없는 건지 구분할 방법이 없어서 계속 추측하게 됐다. 여기서 그걸 가른다.
 * 키 값은 절대 돌려주지 않고, 설정 여부와 결과 개수만 말한다.
 *
 * 기본 GET은 설정 여부만 본다(외부 호출 없음). 실제 호출까지 해보려면 CRON_SECRET을 들고
 * ?probe=1을 붙인다 — 아무나 우리 이름으로 외부 API를 때리게 두지 않기 위해서다.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const config = {
    kakaoLocal: kakaoLocalEnabled(),
    googlePlaces: Boolean(
      process.env.GOOGLE_MAPS_API_KEY?.trim()
      || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
      || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY?.trim(),
    ),
    cultureData: Boolean(cultureDataKey()),
    seoulOpenData: Boolean(seoulOpenDataKey()),
    naverSearch: Boolean(naverSearchCredentials()),
  };

  if (url.searchParams.get("probe") !== "1") {
    return NextResponse.json({ config, probe: null });
  }

  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!secret || (bearer !== secret && request.headers.get("x-cron-secret") !== secret)) {
    return NextResponse.json({ error: "probe requires CRON_SECRET" }, { status: 401 });
  }

  const region = url.searchParams.get("region")?.trim() || "성수";
  const startedAt = Date.now();
  const [kakao, combined, cultureShape, naverLocalShape, naverBlogShape] = await Promise.all([
    searchKakaoPlaces({ region, category: "cafe" }),
    searchRealPlaces({ region, category: "cafe" }),
    // 기관·네이버 응답의 "실제 필드 이름"을 그대로 받아 온다. 키를 넣기 전에는 확정할 수 없는
    // 부분이라, 추측을 계속 쌓는 대신 첫 호출에서 진짜 이름을 보고 매핑을 맞추기 위함이다.
    probeSourceShape("culture_data", region),
    probeSourceShape("naver_local", `${region} 카페`),
    probeSourceShape("naver_blog", `${region} 팝업`),
  ]);
  return NextResponse.json({
    config,
    probe: {
      region,
      elapsedMs: Date.now() - startedAt,
      kakaoCount: kakao.length,
      kakaoSample: kakao.slice(0, 3).map((place) => place.name),
      // 합쳐진 결과가 어느 출처에서 왔는지까지 보면 폴백이 도는지 바로 안다.
      combinedCount: combined.length,
      combinedSources: [...new Set(combined.map((place) => place.source))],
      discoveryShapes: {
        cultureData: cultureShape,
        naverLocal: naverLocalShape,
        naverBlog: naverBlogShape,
      },
    },
  });
}
