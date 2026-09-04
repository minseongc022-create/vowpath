import "server-only";

import { classifyPlaceRequest, isSamePlaceName } from "./place-intent";
import { KAKAO_CATEGORY_SEARCH, chainNameFor, kakaoCategoryMatches, type Coordinates, type RealPlaceCandidate } from "./place-utils";
import type { PlanCategory } from "./types";

/**
 * 카카오 로컬(장소) 검색 — 한국 상권을 실제로 아는 유일한 무료 출처.
 *
 * OpenStreetMap은 한국 소상공인(꽃집·소품샵·동네 식당)이 거의 등록돼 있지 않아, 반경 안에서
 * 아무거나 집어오면 "인천 미추홀구청"처럼 가게가 아닌 것이 후보로 올라온다. 카카오는 사업자
 * 등록 기반이라 이 문제가 없고, place_url이 실제 카카오맵 상세 페이지(사진·리뷰 포함)라
 * "사진·리뷰 더 보기"가 처음으로 진짜 장소를 가리키게 된다.
 *
 * 키는 카카오 로그인에 쓰는 REST API 키와 같은 값이다(KAKAO_REST_API_KEY로 따로 줘도 된다).
 */

const ENDPOINT = "https://dapi.kakao.com/v2/local/search/keyword.json";

type KakaoDocument = {
  id?: string;
  place_name?: string;
  address_name?: string;
  road_address_name?: string;
  phone?: string;
  category_name?: string;
  category_group_code?: string;
  place_url?: string;
  x?: string;
  y?: string;
  distance?: string;
};

export function kakaoRestKey(): string | null {
  return process.env.KAKAO_REST_API_KEY?.trim() || process.env.KAKAO_CLIENT_ID?.trim() || null;
}

export function kakaoLocalEnabled(): boolean {
  return Boolean(kakaoRestKey());
}

function normalize(document: KakaoDocument, checkedAt: string): RealPlaceCandidate | null {
  const name = document.place_name?.trim();
  const latitude = Number(document.y);
  const longitude = Number(document.x);
  if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const address = document.road_address_name?.trim() || document.address_name?.trim() || "";
  const categoryPath = document.category_name?.trim() ?? "";
  const chainName = chainNameFor(name);
  // 카카오는 평점을 주지 않는다. 대신 "실제 영업 중인 가게"라는 신뢰 신호만 점수화한다.
  const dataQuality = (document.phone ? 1.1 : 0)
    + (document.road_address_name ? 0.8 : 0)
    + (categoryPath.split(">").length >= 3 ? 0.7 : 0)
    + (name.length >= 3 ? 0.3 : 0);

  return {
    id: `kakao-${document.id ?? `${latitude},${longitude}`}`,
    name,
    address: address || "주소는 지도에서 확인",
    latitude,
    longitude,
    openNow: null,
    openingHours: [],
    businessStatus: "operational",
    mapsUrl: document.place_url || `https://map.kakao.com/?q=${encodeURIComponent(name)}`,
    phoneNumber: document.phone?.trim() || undefined,
    localIndependent: chainName ? false : undefined,
    chainName,
    source: "kakao_local",
    sourceLabel: "카카오맵 등록 정보",
    checkedAt,
    dataQuality,
    selectionSignals: categoryPath ? [categoryPath.split(">").at(-1)?.trim() ?? categoryPath] : [],
  };
}

async function requestOnce(params: URLSearchParams, apiKey: string): Promise<KakaoDocument[]> {
  try {
    const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
      headers: { Authorization: `KakaoAK ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(7_000),
    });
    if (!response.ok) return [];
    const data = await response.json().catch(() => ({})) as { documents?: KakaoDocument[] };
    return data.documents ?? [];
  } catch {
    return [];
  }
}

/**
 * 지역·카테고리·사용자 표현을 함께 넣어 실제 가게를 찾는다.
 * 사용자가 말한 표현("분위기 좋은", "감성")을 우선 검색어로 쓰고, 결과가 얇으면 기본 업종어로 넓힌다.
 */
export async function searchKakaoPlaces(params: {
  region: string;
  category: PlanCategory;
  query?: string;
  near?: Coordinates;
  limit?: number;
}): Promise<RealPlaceCandidate[]> {
  const apiKey = kakaoRestKey();
  const rule = KAKAO_CATEGORY_SEARCH[params.category];
  if (!apiKey || params.category === "moment" || !rule.keywords.length) return [];

  // "분위기 좋은 파스타집 찾아줘"를 그대로 넣으면 카카오는 문장 전체를 상호명처럼 보고 0건을 준다.
  // 요청 동사를 걷어낸 조건어만 남겨서 넣는다.
  const intent = params.query?.trim() ? classifyPlaceRequest(params.query) : null;
  const cleanedQuery = intent ? (intent.kind === "specific" ? intent.placeName : intent.keywords) : "";
  const keywords = [...new Set([
    ...(cleanedQuery ? [`${params.region} ${cleanedQuery}`.trim()] : []),
    ...rule.keywords.map((keyword) => `${params.region} ${keyword}`.trim()),
  ])].slice(0, 3);

  const checkedAt = new Date().toISOString();
  const seen = new Set<string>();
  const found: RealPlaceCandidate[] = [];

  for (const keyword of keywords) {
    const search = new URLSearchParams({ query: keyword, size: "15", sort: "accuracy" });
    if (rule.groupCode) search.set("category_group_code", rule.groupCode);
    if (params.near) {
      search.set("x", String(params.near.longitude));
      search.set("y", String(params.near.latitude));
      search.set("radius", "8000");
    }
    for (const document of await requestOnce(search, apiKey)) {
      if (!kakaoCategoryMatches(document.category_name, document.place_name, params.category, document.category_group_code)) continue;
      const candidate = normalize(document, checkedAt);
      if (!candidate || seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      found.push(candidate);
    }
    if (found.length >= (params.limit ?? 18)) break;
  }

  return found.slice(0, params.limit ?? 18);
}

/**
 * 사용자가 콕 집어 말한 상호명을 그 이름 그대로 확인한다.
 *
 * 업종 필터를 일부러 걸지 않는다 — "까사올리브"가 식당인지 카페인지 사용자는 말한 적이 없고,
 * 업종을 잘못 짐작해 걸러내면 정작 맞는 그 가게가 사라진다. 이름이 실제로 같은지만 본다.
 * 반경도 걸지 않는다. 지역 경계 바로 바깥에 있는 진짜 그 가게가 잘려나가기 때문에,
 * 지역은 검색어와 아래 정렬에서만 쓴다.
 *
 * 못 찾으면 빈 배열을 돌려준다. 이름이 다른 가게로 자리를 메우지 않는다.
 */
export async function findKakaoPlaceByName(params: {
  placeName: string;
  region?: string;
  limit?: number;
}): Promise<RealPlaceCandidate[]> {
  const apiKey = kakaoRestKey();
  const wanted = params.placeName.trim();
  if (!apiKey || wanted.length < 2) return [];

  const region = params.region?.trim();
  const queries = [...new Set([region ? `${region} ${wanted}` : "", wanted].filter(Boolean))];
  const checkedAt = new Date().toISOString();
  const seen = new Set<string>();
  const found: RealPlaceCandidate[] = [];

  for (const query of queries) {
    const search = new URLSearchParams({ query, size: "15", sort: "accuracy" });
    for (const document of await requestOnce(search, apiKey)) {
      if (!isSamePlaceName(wanted, document.place_name ?? "")) continue;
      const candidate = normalize(document, checkedAt);
      if (!candidate || seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      found.push(candidate);
    }
    if (found.length) break;
  }

  // 같은 상호의 지점이 여럿이면 사용자가 말한 지역의 지점을 먼저 보여준다.
  const inRegion = (place: RealPlaceCandidate) => (region && place.address.includes(region) ? 1 : 0);
  return found
    .sort((a, b) => inRegion(b) - inRegion(a) || (b.dataQuality ?? 0) - (a.dataQuality ?? 0))
    .slice(0, params.limit ?? 6);
}
