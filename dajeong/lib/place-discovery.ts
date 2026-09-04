import "server-only";

import { attachCuratedReality, chainNameFor, haversineKm, placeToPlanOption, rankRealPlaceCandidates, type Coordinates, type RealPlaceCandidate } from "./place-utils";
import { searchKakaoPlaces } from "./kakao-local";
import { buildExperienceFlow } from "./experience";
import { scheduleDajeongPlan } from "./schedule-engine";
import type { DajeongPlan, ParsedSituation, PlanCategory, PlanItem, PlanOption, PrepCategory, PrepItem } from "./types";

type GoogleNewPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  currentOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  businessStatus?: string;
  photos?: Array<{ name?: string }>;
  editorialSummary?: { text?: string };
  reviews?: Array<{ text?: { text?: string }; rating?: number; relativePublishTimeDescription?: string; authorAttribution?: { displayName?: string; uri?: string } }>;
  types?: string[];
};

type GoogleLegacyPlace = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  business_status?: string;
  photos?: Array<{ photo_reference?: string }>;
  website?: string;
  formatted_phone_number?: string;
  url?: string;
  opening_hours?: { open_now?: boolean; weekday_text?: string[] };
  editorial_summary?: { overview?: string };
  reviews?: Array<{ text?: string; rating?: number; relative_time_description?: string; author_name?: string }>;
  types?: string[];
};

const SEARCH_QUERY: Record<PlanCategory, string> = {
  activity: "몰입형 전시 이색 체험 미디어아트 특별한 경험",
  cafe: "정원 온실 한옥 개조 건축 분위기 좋은 로컬 카페",
  meal: "공간이 특별한 로컬 다이닝 정원 한옥 분위기 좋은 레스토랑",
  view: "야간 미디어아트 빛 축제 특별 야경 전망",
  lodging: "감성 숙소 부티크 호텔 독채 스테이 후기 좋은 숙박",
  cake: "레터링 케이크",
  flower: "꽃집 꽃다발",
  gift: "소품샵 선물 편집샵",
  moment: "산책 명소",
};

const PRICE_LEVEL: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const REGION_COORDINATES: Record<string, Coordinates> = {
  강남: { latitude: 37.4979, longitude: 127.0276 },
  성수: { latitude: 37.5446, longitude: 127.0559 },
  홍대: { latitude: 37.5572, longitude: 126.9254 },
  연남: { latitude: 37.5651, longitude: 126.9236 },
  여의도: { latitude: 37.5219, longitude: 126.9245 },
  잠실: { latitude: 37.5133, longitude: 127.1001 },
  광화문: { latitude: 37.5759, longitude: 126.9768 },
  종로: { latitude: 37.5704, longitude: 126.9922 },
  용산: { latitude: 37.5299, longitude: 126.9648 },
  이태원: { latitude: 37.5345, longitude: 126.9946 },
  서울: { latitude: 37.5665, longitude: 126.9780 },
  인천: { latitude: 37.4563, longitude: 126.7052 },
  수원: { latitude: 37.2636, longitude: 127.0286 },
  성남: { latitude: 37.4200, longitude: 127.1265 },
  분당: { latitude: 37.3827, longitude: 127.1190 },
  가평: { latitude: 37.8315, longitude: 127.5090 },
  춘천: { latitude: 37.8813, longitude: 127.7298 },
  강릉: { latitude: 37.7519, longitude: 128.8761 },
  속초: { latitude: 38.2070, longitude: 128.5918 },
  전주: { latitude: 35.8242, longitude: 127.1480 },
  여수: { latitude: 34.7604, longitude: 127.6622 },
  경주: { latitude: 35.8562, longitude: 129.2247 },
  부산: { latitude: 35.1796, longitude: 129.0756 },
  대구: { latitude: 35.8714, longitude: 128.6014 },
  대전: { latitude: 36.3504, longitude: 127.3845 },
  광주: { latitude: 35.1595, longitude: 126.8526 },
  제주: { latitude: 33.4996, longitude: 126.5312 },
};

type OsmElement = {
  type?: "node" | "way" | "relation";
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

const osmCache = new Map<string, { expiresAt: number; places: RealPlaceCandidate[] }>();

function key(): string | null {
  return process.env.GOOGLE_MAPS_API_KEY?.trim()
    || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
    || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY?.trim()
    || null;
}

function referers(): string[] {
  return [...new Set([
    process.env.GOOGLE_MAPS_HTTP_REFERER?.trim(),
    process.env.TWILIO_WEBHOOK_BASE_URL?.trim(),
    "https://effiroad.com/",
    "https://www.effiroad.com/",
  ].filter((value): value is string => Boolean(value)).map((value) => value.endsWith("/") ? value : `${value}/`))];
}

function headers(referer: string, extra: Record<string, string> = {}): Record<string, string> {
  return { Referer: referer, Origin: referer.replace(/\/$/, ""), ...extra };
}

function businessStatus(value?: string): RealPlaceCandidate["businessStatus"] {
  if (value === "OPERATIONAL") return "operational";
  if (value === "CLOSED_TEMPORARILY") return "closed_temporarily";
  if (value === "CLOSED_PERMANENTLY") return "closed_permanently";
  return "unknown";
}

function shortReview(value?: string): string | undefined {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > 118 ? `${text.slice(0, 115).trim()}…` : text;
}

function selectionSignals(candidate: { rating?: number; reviewCount?: number; photoUrl?: string; localIndependent?: boolean }): string[] {
  return [
    candidate.localIndependent ? "로컬 매장" : null,
    candidate.rating != null && candidate.rating >= 4.4 ? "평점이 특히 높아요" : null,
    candidate.reviewCount != null && candidate.reviewCount >= 100 ? "리뷰가 충분해요" : null,
    candidate.photoUrl ? "실제 대표 사진" : null,
  ].filter((value): value is string => Boolean(value));
}

function normalizeNew(place: GoogleNewPlace, checkedAt: string): RealPlaceCandidate | null {
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  const id = place.id?.replace(/^places\//, "");
  const name = place.displayName?.text?.trim();
  if (!id || !name || latitude == null || longitude == null) return null;
  const photo = place.photos?.[0]?.name;
  const chainName = chainNameFor(name);
  const candidate: RealPlaceCandidate = {
    id,
    name,
    address: place.formattedAddress?.trim() || "주소 확인 필요",
    latitude,
    longitude,
    rating: place.rating,
    reviewCount: place.userRatingCount,
    reviewHighlights: place.reviews?.map((review) => shortReview(review.text?.text)).filter((value): value is string => Boolean(value)).slice(0, 2),
    reviewAuthors: place.reviews?.map((review) => review.authorAttribution?.displayName?.trim() || "Google 지도 이용자").slice(0, 2),
    editorialSummary: shortReview(place.editorialSummary?.text),
    localIndependent: !chainName,
    chainName,
    priceLevel: place.priceLevel ? PRICE_LEVEL[place.priceLevel] : undefined,
    openNow: place.currentOpeningHours?.openNow ?? null,
    openingHours: place.currentOpeningHours?.weekdayDescriptions ?? place.regularOpeningHours?.weekdayDescriptions ?? [],
    businessStatus: businessStatus(place.businessStatus),
    mapsUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(id)}`,
    websiteUrl: place.websiteUri,
    phoneNumber: place.nationalPhoneNumber,
    photoUrl: photo ? `/api/dajeong/places/photo?source=new&ref=${encodeURIComponent(photo)}` : undefined,
    source: "google_places",
    sourceLabel: "Google Places",
    checkedAt,
  };
  candidate.selectionSignals = selectionSignals(candidate);
  return candidate;
}

function normalizeLegacy(place: GoogleLegacyPlace, checkedAt: string): RealPlaceCandidate | null {
  const latitude = place.geometry?.location?.lat;
  const longitude = place.geometry?.location?.lng;
  const id = place.place_id;
  const name = place.name?.trim();
  if (!id || !name || latitude == null || longitude == null) return null;
  const photo = place.photos?.[0]?.photo_reference;
  const chainName = chainNameFor(name);
  const candidate: RealPlaceCandidate = {
    id,
    name,
    address: place.formatted_address?.trim() || "주소 확인 필요",
    latitude,
    longitude,
    rating: place.rating,
    reviewCount: place.user_ratings_total,
    reviewHighlights: place.reviews?.map((review) => shortReview(review.text)).filter((value): value is string => Boolean(value)).slice(0, 2),
    reviewAuthors: place.reviews?.map((review) => review.author_name?.trim() || "Google 지도 이용자").slice(0, 2),
    editorialSummary: shortReview(place.editorial_summary?.overview),
    localIndependent: !chainName,
    chainName,
    priceLevel: place.price_level,
    openNow: place.opening_hours?.open_now ?? null,
    openingHours: place.opening_hours?.weekday_text ?? [],
    businessStatus: businessStatus(place.business_status),
    mapsUrl: place.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(id)}`,
    websiteUrl: place.website,
    phoneNumber: place.formatted_phone_number,
    photoUrl: photo ? `/api/dajeong/places/photo?source=legacy&ref=${encodeURIComponent(photo)}` : undefined,
    source: "google_places",
    sourceLabel: "Google Places",
    checkedAt,
  };
  candidate.selectionSignals = selectionSignals(candidate);
  return candidate;
}

async function searchNew(apiKey: string, query: string, near?: Coordinates): Promise<RealPlaceCandidate[]> {
  const checkedAt = new Date().toISOString();
  for (const referer of referers()) {
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: headers(referer, {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.regularOpeningHours,places.photos,places.businessStatus,places.editorialSummary,places.reviews,places.types",
        }),
        body: JSON.stringify({
          textQuery: query,
          languageCode: "ko",
          regionCode: "KR",
          pageSize: 8,
          ...(near ? { locationBias: { circle: { center: near, radius: 4500 } } } : {}),
        }),
        signal: AbortSignal.timeout(8_000),
      });
      const data = await response.json().catch(() => ({})) as { places?: GoogleNewPlace[] };
      if (response.ok) return (data.places ?? []).map((place) => normalizeNew(place, checkedAt)).filter((place): place is RealPlaceCandidate => Boolean(place));
    } catch {
      // Try the next permitted referer and then the legacy endpoint.
    }
  }
  return [];
}

async function searchLegacy(apiKey: string, query: string, near?: Coordinates): Promise<RealPlaceCandidate[]> {
  const checkedAt = new Date().toISOString();
  const params = new URLSearchParams({ query, key: apiKey, language: "ko", region: "kr" });
  if (near) {
    params.set("location", `${near.latitude},${near.longitude}`);
    params.set("radius", "4500");
  }
  for (const referer of referers()) {
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`, {
        headers: headers(referer),
        signal: AbortSignal.timeout(8_000),
      });
      const data = await response.json().catch(() => ({})) as { status?: string; results?: GoogleLegacyPlace[] };
      if (response.ok && data.status === "OK") {
        const raw = (data.results ?? []).slice(0, 8);
        const detailed = await Promise.all(raw.map((place) => place.place_id
          ? legacyPlaceDetails(apiKey, place.place_id, referer, checkedAt)
          : Promise.resolve(null)));
        return raw.map((place, index) => detailed[index] ?? normalizeLegacy(place, checkedAt)).filter((place): place is RealPlaceCandidate => Boolean(place));
      }
      if (data.status === "ZERO_RESULTS") return [];
    } catch {
      // Try next permitted referer.
    }
  }
  return [];
}

async function legacyPlaceDetails(apiKey: string, placeId: string, referer: string, checkedAt: string): Promise<RealPlaceCandidate | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    key: apiKey,
    language: "ko",
    fields: "place_id,name,formatted_address,geometry,rating,user_ratings_total,price_level,opening_hours,business_status,photos,website,formatted_phone_number,url,reviews,editorial_summary,types",
  });
  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`, {
      headers: headers(referer),
      signal: AbortSignal.timeout(8_000),
    });
    const data = await response.json().catch(() => ({})) as { status?: string; result?: GoogleLegacyPlace };
    return response.ok && data.status === "OK" && data.result ? normalizeLegacy(data.result, checkedAt) : null;
  } catch {
    return null;
  }
}

async function searchLegacyAutocomplete(apiKey: string, query: string, near?: Coordinates): Promise<RealPlaceCandidate[]> {
  const checkedAt = new Date().toISOString();
  const params = new URLSearchParams({ input: query, key: apiKey, language: "ko", components: "country:kr", types: "establishment" });
  if (near) {
    params.set("location", `${near.latitude},${near.longitude}`);
    params.set("radius", "5000");
    params.set("strictbounds", "false");
  }
  for (const referer of referers()) {
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`, {
        headers: headers(referer),
        signal: AbortSignal.timeout(8_000),
      });
      const data = await response.json().catch(() => ({})) as { status?: string; predictions?: Array<{ place_id?: string }> };
      if (response.ok && data.status === "OK") {
        const ids = (data.predictions ?? []).map((prediction) => prediction.place_id).filter((id): id is string => Boolean(id)).slice(0, 6);
        const places = await Promise.all(ids.map((id) => legacyPlaceDetails(apiKey, id, referer, checkedAt)));
        return places.filter((place): place is RealPlaceCandidate => Boolean(place));
      }
      if (data.status === "ZERO_RESULTS") return [];
    } catch {
      // Try next referer.
    }
  }
  return [];
}

async function geocodeRegion(region: string): Promise<Coordinates | undefined> {
  if (REGION_COORDINATES[region]) return REGION_COORDINATES[region];
  const search = new URL("https://nominatim.openstreetmap.org/search");
  search.searchParams.set("format", "jsonv2");
  search.searchParams.set("limit", "1");
  search.searchParams.set("countrycodes", "kr");
  search.searchParams.set("accept-language", "ko");
  search.searchParams.set("q", `${region}역`);
  try {
    const response = await fetch(search, {
      headers: { "User-Agent": "DajeongConcierge/1.0 (https://effiroad.com)", Accept: "application/json" },
      signal: AbortSignal.timeout(6_000),
    });
    const data = await response.json().catch(() => []) as Array<{ lat?: string; lon?: string }>;
    const latitude = Number(data[0]?.lat);
    const longitude = Number(data[0]?.lon);
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : undefined;
  } catch {
    return undefined;
  }
}

function osmFilters(category: PlanCategory): string[] {
  if (category === "cafe") return ['["amenity"="cafe"]["name"]'];
  if (category === "meal") return ['["amenity"="restaurant"]["name"]'];
  if (category === "view") return ['["tourism"="viewpoint"]["name"]', '["leisure"="park"]["name"]'];
  if (category === "lodging") return ['["tourism"~"hotel|guest_house|hostel|motel|apartment"]["name"]'];
  if (category === "cake") return ['["shop"="bakery"]["name"]', '["shop"="confectionery"]["name"]'];
  if (category === "flower") return ['["shop"="florist"]["name"]'];
  if (category === "gift") return ['["shop"~"gift|variety_store|stationery|books|art|interior_decoration"]["name"]'];
  if (category === "activity") return ['["tourism"~"museum|gallery|attraction"]["name"]', '["leisure"="escape_game"]["name"]'];
  return [];
}

function osmAddress(tags: Record<string, string>, region: string): string {
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const area = [tags["addr:city"], tags["addr:district"], tags["addr:subdistrict"]].filter(Boolean).join(" ");
  return [area, street].filter(Boolean).join(" · ") || `${region} 일대 · 상세 주소 지도 확인`;
}

function normalizeOsm(element: OsmElement, region: string, checkedAt: string): RealPlaceCandidate | null {
  const tags = element.tags ?? {};
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  const name = (tags["name:ko"] || tags.name || tags["name:en"])?.trim();
  if (!element.id || !name || latitude == null || longitude == null) return null;
  const address = osmAddress(tags, region);
  const genericName = /^(카페|커피|식당|음식점|국수집|레스토랑|푸드카페|분식|전망대|전망 포인트|공원|restaurant|food ?cafe|cafe|viewpoint)$/i.test(name) || /(어린이|근린)공원$/.test(name);
  const koreanNameLength = (name.match(/[가-힣]/g) ?? []).length;
  const genericEnglishPrefix = /^(?:cafe|coffee|bakery|restaurant|gift ?shop|food ?cafe)\b/i.test(name);
  if (genericName || koreanNameLength < 2 || genericEnglishPrefix) return null;
  const landmarkName = /(서울숲|한강|호수|전망|스카이|타워)/.test(name);
  const brand = tags.brand || tags.operator;
  const chainName = chainNameFor(name, brand);
  const imageTag = tags.image || tags["contact:image"];
  const commons = tags.wikimedia_commons?.replace(/^File:/i, "");
  const photoUrl = imageTag?.startsWith("https://")
    ? imageTag
    : commons
      ? `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(commons)}?width=1200`
      : undefined;
  const dataQuality = (tags.opening_hours ? 1.2 : 0)
    + (tags.website || tags["contact:website"] ? 0.9 : 0)
    + (tags["addr:street"] ? 0.7 : 0)
    + (tags.check_date ? 0.5 : 0)
    + (tags.cuisine ? 0.35 : 0)
    + (name.length >= 4 ? 0.35 : 0)
    + (landmarkName ? 2 : 0)
    - (genericName ? 2.2 : 0);
  const candidate: RealPlaceCandidate = {
    id: `osm-${element.type ?? "node"}-${element.id}`,
    name,
    address,
    latitude,
    longitude,
    openNow: null,
    openingHours: tags.opening_hours ? [tags.opening_hours] : [],
    businessStatus: "unknown",
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`,
    websiteUrl: tags.website || tags["contact:website"],
    photoUrl,
    localIndependent: chainName ? false : undefined,
    chainName,
    source: "openstreetmap",
    sourceLabel: "OpenStreetMap 최근 등록 정보",
    checkedAt,
    dataQuality,
  };
  candidate.selectionSignals = selectionSignals(candidate);
  return candidate;
}

async function searchOpenStreetMap(region: string, category: PlanCategory, near?: Coordinates): Promise<RealPlaceCandidate[]> {
  const filters = osmFilters(category);
  if (!filters.length) return [];
  const center = near ?? await geocodeRegion(region);
  if (!center) return [];
  const cacheKey = `${category}:${center.latitude.toFixed(2)}:${center.longitude.toFixed(2)}`;
  const cached = osmCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.places;
  const radius = category === "lodging" || category === "activity" || category === "view" ? 6500 : 3500;
  const around = `around:${radius},${center.latitude},${center.longitude}`;
  const clauses = filters.map((filter) => `nwr(${around})${filter};`).join("");
  const query = `[out:json][timeout:12];(${clauses});out body center 40;`;
  const endpoints = ["https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://lz4.overpass-api.de/api/interpreter"];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": "DajeongConcierge/1.0 (https://effiroad.com)", Accept: "application/json" },
        signal: AbortSignal.timeout(16_000),
      });
      if (!response.ok) continue;
      const data = await response.json() as { elements?: OsmElement[] };
      const checkedAt = new Date().toISOString();
      const places = (data.elements ?? []).map((element) => normalizeOsm(element, region, checkedAt)).filter((place): place is RealPlaceCandidate => Boolean(place));
      if (places.length) {
        osmCache.set(cacheKey, { expiresAt: Date.now() + 3_600_000, places });
        return places;
      }
    } catch {
      // Try another public OSM endpoint, then retain the curated fallback.
    }
  }
  return [];
}

function osmMatchesCategory(tags: Record<string, string>, category: PlanCategory): boolean {
  if (category === "cafe") return tags.amenity === "cafe";
  if (category === "meal") return tags.amenity === "restaurant";
  if (category === "view") return tags.tourism === "viewpoint" || tags.leisure === "park";
  if (category === "lodging") return /^(hotel|guest_house|hostel|motel|apartment)$/.test(tags.tourism ?? "");
  if (category === "cake") return tags.shop === "bakery" || tags.shop === "confectionery";
  if (category === "flower") return tags.shop === "florist";
  if (category === "gift") return /^(gift|variety_store|stationery|books|art|interior_decoration)$/.test(tags.shop ?? "");
  if (category === "activity") return /^(museum|gallery|attraction)$/.test(tags.tourism ?? "") || tags.leisure === "escape_game";
  return false;
}

async function searchOpenStreetMapBatch(region: string, categories: PlanCategory[]): Promise<Map<PlanCategory, RealPlaceCandidate[]>> {
  const center = await geocodeRegion(region);
  const result = new Map<PlanCategory, RealPlaceCandidate[]>();
  if (!center) return result;
  const uniqueCategories = [...new Set(categories.filter((category) => category !== "moment"))];
  if (!uniqueCategories.some((category) => osmFilters(category).length)) return result;
  const around = `around:5000,${center.latitude},${center.longitude}`;
  const categoryQueries = uniqueCategories.map((category) => {
    const clauses = osmFilters(category).map((filter) => `nwr(${around})${filter};`).join("");
    const limit = category === "meal" ? 100 : category === "cafe" ? 80 : 60;
    return clauses ? `(${clauses});out body center ${limit};` : "";
  }).join("");
  const query = `[out:json][timeout:14];${categoryQueries}`;
  const endpoints = ["https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://lz4.overpass-api.de/api/interpreter"];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": "DajeongConcierge/1.0 (https://effiroad.com)", Accept: "application/json" },
        signal: AbortSignal.timeout(18_000),
      });
      if (!response.ok) continue;
      const data = await response.json() as { elements?: OsmElement[] };
      const checkedAt = new Date().toISOString();
      for (const category of uniqueCategories) {
        const places = (data.elements ?? [])
          .filter((element) => osmMatchesCategory(element.tags ?? {}, category))
          .map((element) => normalizeOsm(element, region, checkedAt))
          .filter((place): place is RealPlaceCandidate => Boolean(place));
        if (places.length) {
          result.set(category, places);
          osmCache.set(`${category}:${center.latitude.toFixed(2)}:${center.longitude.toFixed(2)}`, { expiresAt: Date.now() + 3_600_000, places });
        }
      }
      return result;
    } catch {
      // Try one other public endpoint before retaining the curated candidates.
    }
  }
  return result;
}

async function searchGooglePlaces(params: { region: string; category: PlanCategory; query?: string; near?: Coordinates }): Promise<RealPlaceCandidate[]> {
  const apiKey = key();
  if (!apiKey || params.category === "moment") return [];
  const text = `${params.region} ${params.query?.trim() || SEARCH_QUERY[params.category]}`;
  const legacy = await searchLegacy(apiKey, text, params.near);
  if (legacy.length) return legacy;
  const modern = await searchNew(apiKey, text, params.near);
  if (modern.length) return modern;
  return searchLegacyAutocomplete(apiKey, text, params.near);
}

export function realPlaceDiscoveryEnabled(): boolean {
  return true;
}

/**
 * 같은 가게가 출처별로 따로 잡히면 하나로 합친다 — 카카오는 "진짜 존재하는 가게"를,
 * 구글은 평점·리뷰를 안다. 이름과 좌표(150m 이내)가 맞으면 같은 곳으로 본다.
 */
function mergeSources(kakao: RealPlaceCandidate[], google: RealPlaceCandidate[]): RealPlaceCandidate[] {
  if (!google.length) return kakao;
  if (!kakao.length) return google;
  const simplify = (value: string) => value.replace(/[\s·,()]/g, "").toLowerCase();
  const merged = kakao.map((place) => {
    const match = google.find((other) => {
      const near = (haversineKm(place, other) ?? 9) < 0.15;
      const sameName = simplify(other.name).includes(simplify(place.name)) || simplify(place.name).includes(simplify(other.name));
      return near && sameName;
    });
    if (!match) return place;
    return {
      ...place,
      rating: match.rating,
      reviewCount: match.reviewCount,
      reviewHighlights: match.reviewHighlights,
      reviewAuthors: match.reviewAuthors,
      editorialSummary: match.editorialSummary,
      priceLevel: match.priceLevel,
      openNow: match.openNow,
      openingHours: match.openingHours.length ? match.openingHours : place.openingHours,
      photoUrl: place.photoUrl ?? match.photoUrl,
      websiteUrl: place.websiteUrl ?? match.websiteUrl,
      sourceLabel: "카카오맵 등록 정보 · 구글 평점 확인",
      dataQuality: (place.dataQuality ?? 0) + (match.dataQuality ?? 0),
    };
  });
  const unmatched = google.filter((other) => !merged.some((place) => (haversineKm(place, other) ?? 9) < 0.15));
  return [...merged, ...unmatched];
}

export async function searchRealPlaces(params: {
  region: string;
  category: PlanCategory;
  query?: string;
  near?: Coordinates;
}): Promise<RealPlaceCandidate[]> {
  if (params.category === "moment") return [];
  const near = params.near ?? await geocodeRegion(params.region);
  const [kakao, google] = await Promise.all([
    searchKakaoPlaces({ ...params, near }),
    searchGooglePlaces({ ...params, near }),
  ]);
  const combined = mergeSources(kakao, google);
  if (combined.length) return combined;
  // 두 상권 출처가 모두 비었을 때만 OSM을 본다 — 한국 소상공인 커버리지가 얇아 마지막 수단이다.
  return searchOpenStreetMap(params.region, params.category, near);
}

function itemCoordinates(item?: PlanItem): Coordinates | undefined {
  const reality = item?.reality;
  return reality?.latitude != null && reality.longitude != null
    ? { latitude: reality.latitude, longitude: reality.longitude }
    : undefined;
}

const MOOD_SEARCH: Record<string, string> = {
  romantic: "로맨틱 기념일",
  mysterious: "신비로운 몽환적인 빛 미디어아트",
  trendy: "트렌디 감각적인",
  calm: "조용한 아늑한",
  luxurious: "고급스러운 공간",
  playful: "재미있는 이색 체험",
  warm: "따뜻한 편안한",
  nature: "숲 정원 자연",
  artistic: "예술 전시 건축",
  hidden: "숨은 명소 로컬 독립",
};

function searchQueryForItem(plan: DajeongPlan, item: PlanItem): string {
  const preferences = [...plan.situation.preferences, ...plan.situation.constraints].join(" ");
  const moods = plan.situation.desiredMoods.map((mood) => MOOD_SEARCH[mood]).filter(Boolean).join(" ");
  const limited = plan.situation.limitedEventPriority && ["activity", "view"].includes(item.category)
    ? "현재 운영 기간 한정 팝업 축제 야간개장 시즌 이벤트"
    : "";
  if (plan.situation.preferences.includes("소품샵") && (item.category === "activity" || item.category === "gift")) {
    return `${moods} 분위기 좋은 로컬 소품샵 편집샵 독립 매장`;
  }
  return [preferences, moods, limited, SEARCH_QUERY[item.category], ["meal", "cafe"].includes(item.category) ? "로컬 독립 매장 실제 리뷰 좋은 맛과 서비스 좋은" : ""]
    .filter(Boolean)
    .join(" ");
}

function travelMode(situation: ParsedSituation): NonNullable<PlanItem["travelFromPrevious"]>["mode"] {
  return situation.transport === "car" ? "차량" : situation.transport === "walking" ? "도보" : "대중교통";
}

function recalculate(plan: DajeongPlan, items: PlanItem[]): DajeongPlan {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return scheduleDajeongPlan({ ...plan, items, subtotal: total, total, reserve: Math.max(0, plan.budget - total), budgetRemaining: plan.budget - total, experienceFlow: buildExperienceFlow(items) });
}

export async function enrichDajeongPlanWithRealPlaces(plan: DajeongPlan): Promise<DajeongPlan> {
  const center = await geocodeRegion(plan.situation.region);
  // 항목마다 실제 상권 출처(카카오+구글)를 먼저 본다. 여기서 나오는 게 진짜 가게다.
  const liveSearchPromise = Promise.all(plan.items.map((item) => {
    if (item.handoffKind === "self" || item.category === "moment") return Promise.resolve([] as RealPlaceCandidate[]);
    const preferenceQuery = searchQueryForItem(plan, item);
    return searchRealPlaces({ region: plan.situation.region, category: item.category, query: preferenceQuery, near: center });
  }));
  const searchableCategories = plan.items
    .filter((item) => item.handoffKind !== "self" && item.category !== "moment")
    .map((item) => item.category);
  const osmSearchPromise = searchableCategories.length
    ? searchOpenStreetMapBatch(plan.situation.region, searchableCategories)
    : Promise.resolve(new Map<PlanCategory, RealPlaceCandidate[]>());
  const [googleSearches, osmSearches] = await Promise.all([liveSearchPromise, osmSearchPromise]);
  let previous: Coordinates | undefined;
  let realPlaceCount = 0;
  const usedPlaceIds = new Set<string>();
  const items: PlanItem[] = [];
  for (const [itemIndex, item] of plan.items.entries()) {
    if (item.handoffKind === "self" || item.category === "moment") {
      items.push({ ...item, ...attachCuratedReality(item), alternatives: item.alternatives.map(attachCuratedReality) });
      continue;
    }
    const candidates = googleSearches[itemIndex]?.length ? googleSearches[itemIndex] : osmSearches.get(item.category) ?? [];
    const freshCandidates = candidates.filter((candidate) => !usedPlaceIds.has(candidate.id));
    const ranked = rankRealPlaceCandidates(freshCandidates.length ? freshCandidates : candidates, previous, item.category, Math.max(item.price * 1.35, plan.budgetRemaining + item.price), item.price, plan.situation, searchQueryForItem(plan, item));
    const realOptions = ranked.slice(0, 4).map((place, index) => placeToPlanOption({
      place,
      base: index === 0 ? item : item.alternatives[index % Math.max(1, item.alternatives.length)] ?? item,
      category: item.category,
      situation: plan.situation,
      previous,
      visitOnly: item.category === "gift" && /소품|편집샵/.test(place.name),
    }));
    if (realOptions.length === 0) {
      const fallback = attachCuratedReality(item);
      items.push({ ...item, ...fallback, alternatives: item.alternatives.map(attachCuratedReality) });
      continue;
    }
    realPlaceCount += 1;
    const [selected, ...alternatives] = realOptions;
    const enriched: PlanItem = {
      ...item,
      ...selected,
      id: item.id,
      dayNumber: item.dayNumber,
      category: item.category,
      categoryLabel: item.categoryLabel,
      icon: item.icon,
      time: item.time,
      status: item.status,
      alternatives: [...alternatives, ...item.alternatives.slice(0, 1).map(attachCuratedReality)],
      travelFromPrevious: selected.reality?.travelEstimateMinutes != null && items.length
        ? { minutes: selected.reality.travelEstimateMinutes, mode: travelMode(plan.situation), note: "직선거리 기반 예상 · 실제 경로는 지도에서 확인" }
        : item.travelFromPrevious,
    };
    items.push(enriched);
    if (selected.reality?.placeId) usedPlaceIds.add(selected.reality.placeId);
    previous = itemCoordinates(enriched) ?? previous;
  }
  const checkedAt = new Date().toISOString();
  const actualSources = new Set(items.map((item) => item.reality?.source).filter((source) => source && source !== "curated"));
  const sourceLabel = actualSources.has("google_places")
    ? actualSources.has("openstreetmap") ? "Google Places · OpenStreetMap" : "Google Places"
    : actualSources.has("openstreetmap") ? "OpenStreetMap" : "장소 탐색 서비스";
  const hasGoogleReviewData = actualSources.has("google_places");
  const status = realPlaceCount === 0
    ? "unavailable"
    : hasGoogleReviewData && realPlaceCount === plan.items.filter((item) => item.handoffKind !== "self").length
      ? "live"
      : "partial";
  return {
    ...recalculate(plan, items),
    notice: "장소명과 주소는 지도 데이터를 기준으로 하고, 실제 평점·리뷰·대표 사진이 연결된 경우에만 화면에 표시합니다. 가격·영업·예약은 변동될 수 있어 실행 직전에 다시 확인하며, 승인 없이 결제하지 않습니다.",
    discovery: {
      status,
      sourceLabel,
      checkedAt,
      realPlaceCount,
      message: realPlaceCount
        ? hasGoogleReviewData
          ? `평점·리뷰·대표 사진을 확인할 수 있는 장소 ${realPlaceCount}곳을 동선과 예산에 맞췄어요.`
          : `실제로 등록된 장소 ${realPlaceCount}곳을 동선에 맞췄어요. 평점·리뷰·사진은 지도에서 바로 확인할 수 있어요.`
        // 못 찾았을 때는 "탐색 중"처럼 얼버무리지 않는다 — 아래 후보가 실제 가게가 아니라는 뜻이다.
        : "이번 조건에 맞는 실제 가게를 아직 찾지 못했어요. 아래는 참고용 기본 후보라 실제 가게가 아니고, 지역을 좁히거나 조건을 바꿔서 다시 찾아볼 수 있어요.",
    },
  };
}

const PREP_CATEGORY_TO_PLAN: Partial<Record<PrepCategory, PlanCategory>> = {
  flower: "flower",
  cake: "cake",
  gift: "gift",
  event_booking: "activity",
};

const PREP_FALLBACK_PRICE: Record<PrepCategory, number> = {
  flower: 45_000,
  cake: 40_000,
  gift: 40_000,
  event_booking: 200_000,
  custom: 30_000,
};

/**
 * Auto-discovery for prep items (flower/cake/gift shops, event venues) — the same real-place
 * pipeline used for main itinerary items, so "꽃 준비해줘" attaches an actual nearby florist
 * candidate instead of leaving the prep item as a bare label. `custom` prep items have no
 * reliable category to search, so they're left untouched.
 */
export async function discoverPrepPlace(plan: DajeongPlan, prepItem: PrepItem): Promise<PrepItem> {
  const category = PREP_CATEGORY_TO_PLAN[prepItem.category];
  if (!category) return prepItem;
  const previous = [...plan.items].reverse().map(itemCoordinates).find((coordinates): coordinates is Coordinates => Boolean(coordinates));
  const query = [prepItem.title, prepItem.notes].map((value) => value?.trim()).filter(Boolean).join(" ");
  const fallbackPrice = prepItem.price ?? PREP_FALLBACK_PRICE[prepItem.category];
  const candidates = await searchRealPlaces({ region: plan.situation.region, category, query, near: previous });
  if (!candidates.length) return prepItem;
  const ranked = rankRealPlaceCandidates(candidates, previous, category, Math.max(fallbackPrice * 1.5, plan.budgetRemaining + fallbackPrice), fallbackPrice, plan.situation, query);
  const best = ranked[0];
  if (!best) return prepItem;
  const base: PlanOption = {
    id: prepItem.id,
    title: prepItem.title,
    subtitle: "",
    price: fallbackPrice,
    durationMinutes: 20,
    provider: "",
    handoffKind: "search",
    href: "",
    notes: [],
    location: "",
    imageUrl: "",
    imageAlt: "",
    reason: "",
    venueType: "indoor",
    reservationRequired: true,
  };
  const option = placeToPlanOption({ place: best, base, category, situation: plan.situation, previous });
  const priceConfidence = option.reality?.priceConfidence === "provider" ? "provider_quote" as const : option.reality?.priceConfidence === "unknown" ? "unknown" as const : "estimate" as const;
  return {
    ...prepItem,
    reality: option.reality,
    price: prepItem.price ?? option.price,
    priceConfidence,
    updatedAt: new Date().toISOString(),
  };
}

export async function discoverOptionsForItem(params: {
  plan: DajeongPlan;
  category: PlanCategory;
  query: string;
  base: PlanOption;
  previous?: PlanItem;
}): Promise<PlanOption[]> {
  const previous = itemCoordinates(params.previous)
    ?? [...params.plan.items].reverse().map(itemCoordinates).find((coordinates): coordinates is Coordinates => Boolean(coordinates));
  const candidates = await searchRealPlaces({ region: params.plan.situation.region, category: params.category, query: params.query, near: previous });
  return rankRealPlaceCandidates(candidates, previous, params.category, Math.max(params.base.price * 1.4, params.plan.budgetRemaining + params.base.price), params.base.price, params.plan.situation, params.query)
    .slice(0, 5)
    .map((place) => placeToPlanOption({
      place,
      base: params.base,
      category: params.category,
      situation: params.plan.situation,
      previous,
      visitOnly: /소품샵|편집샵|독립서점/.test(params.query),
    }));
}
