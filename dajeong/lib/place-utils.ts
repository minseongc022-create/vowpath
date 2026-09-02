import type { ParsedSituation, PlanCategory, PlanOption } from "./types";
import { buildExperienceProfile } from "./experience";

export type RealPlaceCandidate = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  reviewCount?: number;
  reviewHighlights?: string[];
  reviewAuthors?: string[];
  editorialSummary?: string;
  localIndependent?: boolean;
  chainName?: string;
  selectionSignals?: string[];
  priceLevel?: number;
  openNow: boolean | null;
  openingHours: string[];
  businessStatus: "operational" | "closed_temporarily" | "closed_permanently" | "unknown";
  mapsUrl: string;
  websiteUrl?: string;
  phoneNumber?: string;
  photoUrl?: string;
  source: "google_places" | "openstreetmap";
  sourceLabel: string;
  checkedAt: string;
  dataQuality?: number;
};

const CHAIN_PATTERN = /스타벅스|이디야|투썸|메가커피|컴포즈|빽다방|할리스|커피빈|파스쿠찌|엔제리너스|맥도날드|버거킹|롯데리아|서브웨이|이삭토스트|파리바게뜨|뚜레쥬르|아웃백|애슐리|vips|교촌|bhc|bbq/i;

export function chainNameFor(name: string, brand?: string): string | undefined {
  const source = `${name} ${brand ?? ""}`;
  const known = source.match(CHAIN_PATTERN)?.[0];
  if (known) return known;
  if (brand?.trim()) return brand.trim();
  if (/(?:강남|성수|홍대|연남|잠실|종로|용산|여의도|판교|분당|부산|대구|대전|수원|인천)(?:역)?점(?:\s|$)/.test(name)) return "지점형 매장";
  return undefined;
}

export type Coordinates = { latitude: number; longitude: number };

export function haversineKm(a?: Coordinates, b?: Coordinates): number | undefined {
  if (!a || !b) return undefined;
  const radians = (value: number) => value * Math.PI / 180;
  const lat = radians(b.latitude - a.latitude);
  const lng = radians(b.longitude - a.longitude);
  const value = Math.sin(lat / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function travelMinutes(distanceKm: number | undefined, transport: ParsedSituation["transport"]): number | undefined {
  if (distanceKm == null) return undefined;
  const speed = transport === "walking" ? 4.2 : transport === "car" ? 23 : 15;
  const overhead = transport === "walking" ? 2 : transport === "car" ? 7 : 8;
  return Math.max(3, Math.round(distanceKm / speed * 60 + overhead));
}

export function estimatePlacePrice(category: PlanCategory, priceLevel: number | undefined, fallback: number): number {
  if (priceLevel == null) return fallback;
  const level = Math.max(0, Math.min(4, priceLevel));
  const ranges: Record<PlanCategory, number[]> = {
    activity: [0, 28_000, 48_000, 78_000, 120_000],
    cafe: [10_000, 16_000, 24_000, 34_000, 48_000],
    meal: [30_000, 48_000, 72_000, 110_000, 170_000],
    view: [0, 10_000, 28_000, 48_000, 70_000],
    lodging: [90_000, 130_000, 180_000, 260_000, 380_000],
    cake: [18_000, 25_000, 34_000, 48_000, 70_000],
    flower: [15_000, 25_000, 38_000, 60_000, 90_000],
    gift: [0, 20_000, 35_000, 60_000, 100_000],
    moment: [0, 3_000, 10_000, 20_000, 35_000],
  };
  return ranges[category][level] ?? fallback;
}

export function rankRealPlaceCandidates(
  candidates: RealPlaceCandidate[],
  previous: Coordinates | undefined,
  category: PlanCategory,
  budgetShare: number,
  fallbackPrice: number,
  situation?: ParsedSituation,
  query = "",
): RealPlaceCandidate[] {
  const openCandidates = candidates.filter((candidate) => candidate.businessStatus !== "closed_permanently");
  const independent = openCandidates.filter((candidate) => candidate.localIndependent !== false && !candidate.chainName);
  const localPool = independent.length >= 4 ? independent : openCandidates;
  const reviewed = localPool.filter((candidate) => candidate.source !== "google_places" || ((candidate.rating ?? 0) >= 4.2 && (candidate.reviewCount ?? 0) >= 20));
  const pool = reviewed.length >= 3 ? reviewed : localPool;
  return [...pool]
    .sort((a, b) => {
      const score = (candidate: RealPlaceCandidate) => {
        const distance = haversineKm(previous, candidate) ?? 1.2;
        const estimatedPrice = estimatePlacePrice(category, candidate.priceLevel, fallbackPrice);
        const rating = candidate.rating ?? 3.95;
        const reviews = Math.log10((candidate.reviewCount ?? 0) + 10);
        const openBoost = candidate.openNow === true ? 0.8 : candidate.openNow === false ? -0.25 : 0;
        const budgetPenalty = estimatedPrice > budgetShare ? (estimatedPrice - budgetShare) / Math.max(10_000, budgetShare) * 2.1 : 0;
        const distancePenalty = Math.min(4, distance) * 0.55;
        const reviewTrust = candidate.rating != null && candidate.reviewCount != null
          ? (candidate.rating >= 4.4 ? 2.2 : candidate.rating >= 4.2 ? 1.2 : candidate.rating < 4 ? -1.8 : 0) + Math.min(2.2, reviews * 0.55)
          : -0.35;
        const localBoost = candidate.localIndependent === true ? 2.2 : candidate.chainName ? -5 : 0;
        const photoBoost = candidate.photoUrl ? 0.9 : 0;
        const experienceText = [candidate.name, candidate.address, candidate.editorialSummary, ...(candidate.reviewHighlights ?? []), ...(candidate.selectionSignals ?? [])].join(" ");
        const specialHits = [/미디어아트|몰입|몽환|빛|야간|전망/, /정원|온실|숲|한옥|루프탑|오션|건축|개조/, /팝업|축제|기간 한정|특별 개방|공방|체험/, /로컬|독립|숨은|비밀|이색/]
          .filter((pattern) => pattern.test(experienceText)).length;
        const desiredMoodHits = situation?.desiredMoods.filter((mood) => ({
          romantic: /로맨틱|낭만|야경|꽃|기념일/,
          mysterious: /신비|몽환|미디어아트|빛|몰입/,
          trendy: /힙|트렌디|팝업|감각/,
          calm: /조용|아늑|정원|여유/,
          luxurious: /고급|다이닝|코스|호텔/,
          playful: /체험|클래스|재밌|공연/,
          warm: /따뜻|가족|감사/,
          nature: /숲|정원|자연|바다|오션/,
          artistic: /전시|예술|미술|건축|공연/,
          hidden: /숨은|로컬|독립|이색|개조/,
        })[mood].test(experienceText)).length ?? 0;
        const wantsSpecial = situation?.preferences.some((value) => /특별|이색|흔하지|신비/.test(value)) || situation?.desiredMoods.some((mood) => ["mysterious", "hidden", "luxurious"].includes(mood));
        const specialBoost = specialHits * (wantsSpecial ? 1.65 : 0.25) + desiredMoodHits * 1.15;
        return rating * 1.45 + reviewTrust + localBoost + photoBoost + openBoost + specialBoost + (candidate.dataQuality ?? 0) * 0.75 - budgetPenalty - distancePenalty;
      };
      return score(b) - score(a);
    });
}

export function placeToPlanOption(params: {
  place: RealPlaceCandidate;
  base: PlanOption;
  category: PlanCategory;
  situation: ParsedSituation;
  previous?: Coordinates;
  visitOnly?: boolean;
}): PlanOption {
  const { place, base, category, situation, previous, visitOnly = false } = params;
  const distance = haversineKm(previous, place);
  const minutes = travelMinutes(distance, situation.transport);
  const estimatedPrice = visitOnly ? 0 : estimatePlacePrice(category, place.priceLevel, base.price);
  const priceLabel = visitOnly
    ? "입장 무료 · 구매 비용 별도"
    : place.priceLevel == null
      ? `2인 예상 ${estimatedPrice.toLocaleString("ko-KR")}원`
      : `가격대 기반 2인 예상 ${estimatedPrice.toLocaleString("ko-KR")}원`;
  const reservationRequired = ["activity", "meal", "lodging", "cake", "flower"].includes(category);
  const openText = place.openNow === true ? "현재 영업 중" : place.openNow === false ? "현재 영업 종료" : "영업 여부 확인 필요";
  const distanceText = distance == null ? "" : ` · 이전 일정에서 약 ${distance.toFixed(distance < 1 ? 1 : 0)}km`;
  const reason = `${place.localIndependent ? "이 동네만의 분위기" : `${situation.region} 안의 접근성`}, 이동 동선과 ${situation.budget.toLocaleString("ko-KR")}원 예산을 함께 고려했어요.${place.rating ? ` 평점 ${place.rating.toFixed(1)}와 리뷰 신뢰도도 반영했어요.` : ""}`;
  const optionForExperience = {
    ...base,
    title: place.name,
    subtitle: `${place.address}${distanceText}`,
    reason,
    badge: place.rating ? `평점 ${place.rating.toFixed(1)}` : "실제 장소",
    notes: [openText, priceLabel, ...base.notes.slice(0, 1)],
  };

  return {
    ...base,
    id: `real-${category}-${place.id}`,
    title: place.name,
    subtitle: `${place.address}${distanceText}`,
    price: estimatedPrice,
    provider: place.sourceLabel,
    handoffKind: "search",
    href: place.mapsUrl,
    badge: place.rating ? `평점 ${place.rating.toFixed(1)}` : "실제 장소",
    location: place.address,
    imageUrl: place.photoUrl ?? base.imageUrl,
    referenceImageUrl: base.imageUrl,
    imageAlt: place.photoUrl ? `${place.name} 실제 대표 사진` : `${place.name} 분위기 참고 사진`,
    notes: [openText, priceLabel, ...base.notes.slice(0, 1)],
    reason,
    reservationRequired,
    reality: {
      source: place.source,
      sourceLabel: place.sourceLabel,
      placeId: place.id,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      rating: place.rating,
      reviewCount: place.reviewCount,
      reviewHighlights: place.reviewHighlights,
      reviewAuthors: place.reviewAuthors,
      editorialSummary: place.editorialSummary,
      localIndependent: place.localIndependent,
      chainName: place.chainName,
      selectionSignals: place.selectionSignals,
      priceLevel: place.priceLevel,
      priceLabel,
      priceConfidence: place.priceLevel == null ? "estimated" : "provider",
      openNow: place.openNow,
      openingHours: place.openingHours,
      businessStatus: place.businessStatus,
      checkedAt: place.checkedAt,
      freshness: place.source === "google_places" ? "live" : "recent",
      imageKind: place.photoUrl ? "place" : "reference",
      detailsUrl: place.mapsUrl,
      websiteUrl: place.websiteUrl,
      phoneNumber: place.phoneNumber,
      reservationState: reservationRequired ? "manual" : "walk_in",
      reservationLabel: reservationRequired ? "예약 가능 여부 확인 필요" : "방문 전 영업 상태 확인",
      distanceFromPreviousKm: distance,
      travelEstimateMinutes: minutes,
      travelEstimateBasis: distance == null ? undefined : "straight_line",
    },
    experience: buildExperienceProfile(optionForExperience, category, situation, {
      rating: place.rating,
      reviewCount: place.reviewCount,
      localIndependent: place.localIndependent,
    }),
  };
}

export function attachCuratedReality(option: PlanOption): PlanOption {
  if (option.reality) return option;
  return {
    ...option,
    reality: {
      source: "curated",
      sourceLabel: "하루온 기본 후보",
      priceLabel: `예상 ${option.price.toLocaleString("ko-KR")}원`,
      priceConfidence: "estimated",
      openNow: null,
      openingHours: [],
      businessStatus: "unknown",
      checkedAt: new Date().toISOString(),
      freshness: "reference",
      imageKind: "reference",
      detailsUrl: option.href,
      reservationState: option.reservationRequired ? "manual" : "unknown",
      reservationLabel: option.reservationRequired ? "실제 후보 선택 후 예약 확인" : "실제 후보 선택 후 영업 확인",
    },
  };
}
