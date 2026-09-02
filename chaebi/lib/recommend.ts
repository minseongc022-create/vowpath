import type { CatalogItem, NeedKind, OccasionKind, RelationKind, SituationBrief } from "./types";
import { CATALOG } from "./catalog";
import { NATIONWIDE, regionSearchOrder } from "./regions";
import { hoursUntil } from "./datetime";

/**
 * 후보 고르기.
 *
 * 점수는 다섯 갈래로 나뉜다 — 취향 일치, 예산 적합, 평점, 표본 수, 거리.
 * 어느 하나가 다른 걸 압도하지 않게 가중치를 잡았다.
 *
 * ★ 필터와 점수를 가르는 기준
 *
 * 시간(leadTimeHours)은 **필터**다. 오늘 저녁 자리에 24시간 걸리는 케이크를
 * 추천하면 그 순간 앱이 거짓말을 한 게 된다 — 점수를 깎는 걸로는 부족하다.
 *
 * 반면 항목별 예산 배분은 **점수**다. 배분은 안내선일 뿐이고 사용자가 말한
 * 진짜 한도는 계획 총액이라, 배분을 조금 넘는다고 후보에서 빼면 4만6천원짜리
 * 동네 케이크집이 3만5천원짜리 교환권한테 지는 일이 생긴다. 총액 한도는
 * plan-engine.ts의 trimToBudget이 따로 지킨다.
 */

export type Candidate = {
  item: CatalogItem;
  score: number;
  /** 사용자에게 보여줄 근거 조각들 */
  reasons: string[];
  /** 인원수까지 반영한 최종 금액 */
  priceKrw: number;
  /** 이웃 지역에서 끌어온 후보인가 */
  nearby: boolean;
};

const OCCASION_TAGS: Record<OccasionKind, string[]> = {
  birthday: ["생일", "케이크반입", "분위기"],
  anniversary: ["기념일", "분위기", "프라이빗"],
  proposal: ["프로포즈", "프라이빗", "야경", "고급"],
  parents_day: ["부모님", "한식", "룸", "주차"],
  date: ["감성", "분위기", "캐주얼"],
  apology: ["조용한", "프라이빗", "분위기"],
  congratulation: ["활기찬", "캐주얼", "기념일"],
  farewell: ["조용한", "룸"],
  other: ["무난한"],
};

const RELATION_TAGS: Record<RelationKind, string[]> = {
  girlfriend: ["기념일", "분위기", "감성", "여자친구"],
  boyfriend: ["기념일", "감성", "남자친구"],
  spouse: ["기념일", "조용한", "고급", "아내", "남편"],
  parent: ["부모님", "한식", "룸", "주차", "조용한", "어른"],
  friend: ["캐주얼", "활기찬", "친구"],
  colleague: ["룸", "조용한", "동료", "무난한"],
  child: ["캐주얼", "활기찬"],
  self: ["감성"],
  unknown: [],
};

/** 예산을 취향보다 앞세우지 않되, 취향이 예산을 이기게도 하지 않는다. */
const WEIGHTS = {
  tag: 0.34,
  budget: 0.26,
  rating: 0.22,
  popularity: 0.1,
  distance: 0.08,
} as const;

/**
 * 종류마다 "좋은 것"의 기준이 다르다.
 *
 * 상황·관계 태그만 쓰면 케이크·꽃처럼 어휘가 다른 카테고리에서 아무것도
 * 안 걸린다. 그러면 점수가 전부 가격으로만 갈려서, 4만6천원짜리 동네
 * 케이크집이 3만5천원짜리 교환권에 진다. 카테고리별 기준을 따로 준다.
 */
function needSpecificTags(brief: SituationBrief, need: NeedKind): string[] {
  const couple =
    brief.relation === "girlfriend" || brief.relation === "boyfriend" || brief.relation === "spouse";

  switch (need) {
    case "cake":
      if (brief.relation === "parent") return ["어른입맛", "한식", "부모님", "프리미엄"];
      return ["레터링", "생크림", "디자인"];
    case "flower":
      if (brief.relation === "parent") return ["오래가는", "실용", "부모님"];
      if (brief.occasion === "proposal") return ["프리미엄", "오래가는", "디자인"];
      return ["디자인", "감성"];
    case "activity":
      return couple ? ["체험", "커플"] : ["체험"];
    case "photo":
      return ["스냅", "커플"];
    case "transport":
      return ["이동", "편의"];
    default:
      return [];
  }
}

export function preferredTags(brief: SituationBrief, need: NeedKind): string[] {
  const tags = new Set<string>([
    ...OCCASION_TAGS[brief.occasion],
    ...RELATION_TAGS[brief.relation],
    ...needSpecificTags(brief, need),
    ...brief.vibes,
  ]);
  if (brief.timeOfDay === "night") tags.add("늦은시간");
  if (brief.timeOfDay === "lunch" || brief.timeOfDay === "morning") tags.add("점심");
  if (brief.urgency === "today") {
    tags.add("당일가능");
    tags.add("즉시전송");
  }
  for (const constraint of brief.constraints) {
    if (constraint.includes("주차")) tags.add("주차");
    if (constraint.includes("채식")) tags.add("채식");
    if (constraint.includes("거동")) tags.add("주차");
  }
  if (need === "gift" && brief.relation === "parent") {
    tags.add("건강");
    tags.add("실용");
  }
  return [...tags];
}

function tagScore(item: CatalogItem, wanted: string[]): { score: number; matched: string[] } {
  if (!wanted.length) return { score: 0.5, matched: [] };
  const matched = wanted.filter((tag) => item.tags.includes(tag));
  // 태그가 하나도 안 맞아도 0점은 아니다 — 카탈로그 태그가 촘촘하지 않을 수 있다
  return { score: 0.25 + 0.75 * Math.min(1, matched.length / Math.min(4, wanted.length)), matched };
}

function budgetScore(price: number, allocated: number): number {
  if (allocated <= 0) return 0.5;
  if (price === 0) return 0.8; // 무료 코스 — 예산을 아껴주는 쪽이라 나쁘지 않다
  const ratio = price / allocated;
  // 배정치를 넘는 건 후보에서 아예 빼지 않는다(항목별 배분은 안내선일 뿐,
  // 진짜 한도는 계획 총액이다 — plan-engine.ts의 trimToBudget이 잡는다).
  // 대신 넘을수록 점수가 가파르게 떨어진다.
  if (ratio > 1) return Math.max(0, 0.45 - (ratio - 1) * 1.2);
  // 배정 예산의 60~100%를 쓰는 게 가장 "제값"이다
  if (ratio >= 0.6) return 1 - (1 - ratio) * 0.5;
  return 0.45 + ratio * 0.6;
}

function ratingScore(rating: number): number {
  return Math.max(0, Math.min(1, (rating - 4.0) / 0.9));
}

function popularityScore(reviews: number): number {
  return Math.max(0, Math.min(1, Math.log10(Math.max(1, reviews)) / 4));
}

export function priceFor(item: CatalogItem, headcount: number): number {
  return item.perPerson ? item.priceKrw * Math.max(1, headcount) : item.priceKrw;
}

/** 지금 시점에서 물리적으로 가능한가 (준비 시간 + 주문 마감) */
export function isFeasible(item: CatalogItem, brief: SituationBrief, now: Date): boolean {
  const hoursLeft = hoursUntil(brief.dateISO, brief.startTime, now);
  if (hoursLeft < 0) return false;
  return item.leadTimeHours <= hoursLeft;
}

function distanceScore(item: CatalogItem, brief: SituationBrief, need: NeedKind): number {
  if (item.regionKey === brief.regionKey) return 1;
  if (item.regionKey === NATIONWIDE) {
    // 케이크·꽃은 자리로 가는 길에 들르면 되는 것들이라 동네 가게가 낫다.
    // 선물처럼 원래 택배로 받는 것은 전국 배송이 불리할 이유가 없다.
    return need === "cake" || need === "flower" ? 0.6 : 0.9;
  }
  return 0.45;
}

function buildReasons(
  item: CatalogItem,
  matchedTags: string[],
  brief: SituationBrief,
  price: number,
  allocated: number,
  nearby: boolean,
): string[] {
  const reasons: string[] = [];
  if (matchedTags.length) reasons.push(matchedTags.slice(0, 3).join(" · "));
  if (item.rating >= 4.7 && item.reviewCount >= 150) {
    reasons.push(`평점 ${item.rating} (후기 ${item.reviewCount.toLocaleString("ko-KR")})`);
  }
  if (allocated > 0 && price <= allocated * 0.85) reasons.push("배정 예산보다 저렴");
  if (nearby) reasons.push(`${item.regionLabel} — 조금 떨어져 있음`);
  if (brief.urgency === "today" && item.leadTimeHours <= 3) reasons.push("오늘 안에 가능");
  return reasons;
}

/**
 * 지역 범위.
 *  - local: 사용자가 말한 지역 + 전국 배송
 *  - expanded: 이웃 지역까지
 *
 * 기본은 local이다. "강남에서"라고 말한 사람에게 성수 식당을 잡아주면
 * 아무리 점수가 높아도 그건 틀린 답이다. 이웃 지역은 그 지역에 마땅한 게
 * 없을 때만 꺼낸다.
 */
export type RegionScope = "local" | "expanded";

export type CandidateOptions = {
  need: NeedKind;
  brief: SituationBrief;
  /** 이 항목에 배정된 예산 (안내선 — 총액 한도는 plan-engine이 잡는다) */
  allocated: number;
  now: Date;
  /** 예산 상한을 완화한다 (후보가 하나도 없을 때 2차 시도) */
  relaxBudget?: boolean;
  /** 제외할 카탈로그 id (이미 다른 항목이 잡은 것) */
  exclude?: Set<string>;
  scope?: RegionScope;
};

/** 항목별 배분을 이만큼까지는 넘어도 후보로 본다 */
const FLEX = 1.3;
const FLEX_RELAXED = 1.9;

/** 점수 높은 순 후보 목록. 없으면 빈 배열. */
export function rankCandidates(options: CandidateOptions): Candidate[] {
  const { need, brief, allocated, now, relaxBudget, exclude } = options;
  const order =
    options.scope === "expanded"
      ? regionSearchOrder(brief.regionKey)
      : [brief.regionKey, NATIONWIDE];
  const wanted = preferredTags(brief, need);
  const cap = allocated * (relaxBudget ? FLEX_RELAXED : FLEX);

  const candidates: Candidate[] = [];
  for (const item of CATALOG) {
    if (item.need !== need) continue;
    if (exclude?.has(item.id)) continue;
    if (!order.includes(item.regionKey)) continue;
    if (!isFeasible(item, brief, now)) continue;

    const price = priceFor(item, brief.headcount);
    if (cap > 0 && price > cap) continue;

    const { score: tag, matched } = tagScore(item, wanted);
    const nearby = item.regionKey !== brief.regionKey && item.regionKey !== NATIONWIDE;
    // 기프티콘·교환권은 "시간이 없을 때"의 답이다. 시간이 있는데 이걸 1순위로
    // 올리면 받는 사람 눈에 성의 없어 보이고, 그건 이 앱이 실패한 것이다.
    const instantPenalty =
      item.fulfillment === "instant" && brief.urgency !== "today" ? 0.12 : 0;
    const score =
      tag * WEIGHTS.tag +
      budgetScore(price, relaxBudget ? cap : allocated) * WEIGHTS.budget +
      ratingScore(item.rating) * WEIGHTS.rating +
      popularityScore(item.reviewCount) * WEIGHTS.popularity +
      distanceScore(item, brief, need) * WEIGHTS.distance -
      instantPenalty;

    candidates.push({
      item,
      score,
      reasons: buildReasons(item, matched, brief, price, allocated, nearby),
      priceKrw: price,
      nearby,
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

function firstNonEmpty(options: CandidateOptions, scope: RegionScope): Candidate[] {
  const strict = rankCandidates({ ...options, scope });
  if (strict.length) return strict;
  return rankCandidates({ ...options, scope, relaxBudget: true });
}

/**
 * 한 항목의 최종 후보군.
 *
 * 말한 지역 안에서 먼저 찾는다. 지역 후보가 너무 적으면(고를 게 없으면)
 * 뒤에 이웃 지역을 덧붙인다 — 순서는 지역이 항상 앞이다. 지역에 아예 없으면
 * 그때만 이웃으로 넘어가고, 그래도 없으면 빈 배열을 준다(호출부가 그 항목을
 * 빼고 사용자에게 이유를 밝힌다).
 */
export function candidatesFor(options: CandidateOptions): Candidate[] {
  const local = firstNonEmpty(options, "local");
  if (local.length >= 4) return local;

  const expanded = firstNonEmpty(options, "expanded");
  if (!local.length) return expanded;

  const seen = new Set(local.map((candidate) => candidate.item.id));
  return [...local, ...expanded.filter((candidate) => !seen.has(candidate.item.id))];
}
