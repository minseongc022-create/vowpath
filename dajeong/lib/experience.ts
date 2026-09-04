import type { DajeongPlan, ExperienceMood, ExperienceProfile, JourneyRole, ParsedSituation, PlanCategory, PlanItem, PlanOption } from "./types";

export const MOOD_LABEL: Record<ExperienceMood, string> = {
  romantic: "로맨틱",
  mysterious: "신비로운",
  trendy: "트렌디",
  calm: "조용한",
  luxurious: "고급스러운",
  playful: "재미있는",
  warm: "따뜻한",
  nature: "자연 속",
  artistic: "예술적인",
  hidden: "숨은 명소",
};

const MOOD_PATTERNS: Array<[ExperienceMood, RegExp]> = [
  ["romantic", /로맨틱|낭만|설렘|기념일|데이트|야경|꽃/],
  ["mysterious", /신비|몽환|미디어아트|빛|야간|영화 같|몰입/],
  ["trendy", /트렌디|힙|감각|성수|팝업|편집샵/],
  ["calm", /조용|차분|아늑|편안|여유|정원/],
  ["luxurious", /고급|우아|다이닝|코스요리|호텔|프리미엄/],
  ["playful", /재밌|체험|액티브|클래스|놀이|공연/],
  ["warm", /따뜻|감사|가족|부모님|손글씨/],
  ["nature", /숲|정원|온실|자연|바다|오션|공원/],
  ["artistic", /예술|전시|갤러리|미술|건축|공연|공예/],
  ["hidden", /숨은|로컬|독립|비밀|이색|특별|희소|개조/],
];

const SPECIAL_PATTERNS = [
  /미디어아트|몰입형|야간개장|빛의|몽환|비밀스러운/,
  /정원|온실|숲속|오션뷰|루프탑|야경|한옥|폐공장|개조/,
  /원데이|공방|코스요리|테이스팅|공연|전시|팝업|축제/,
  /독특한 건축|공간 자체|숨은|로컬|독립|시즌|기간 한정/,
];

function textMoods(text: string): ExperienceMood[] {
  return MOOD_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([mood]) => mood);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function journeyRoleFor(category: PlanCategory, index = 0, total = 1): JourneyRole {
  if (category === "view" || (index === total - 1 && ["activity", "view"].includes(category))) return "highlight";
  if (["gift", "flower", "cake", "moment"].includes(category)) return "keepsake";
  if (category === "meal") return "centerpiece";
  if (category === "cafe" || category === "lodging") return "pause";
  if (category === "activity") return index === 0 ? "discovery" : "play";
  return index === 0 ? "opening" : "discovery";
}

export function buildExperienceProfile(
  option: Pick<PlanOption, "title" | "subtitle" | "reason" | "badge" | "notes">,
  category: PlanCategory,
  situation: ParsedSituation,
  context: { index?: number; total?: number; rating?: number; reviewCount?: number; localIndependent?: boolean } = {},
): ExperienceProfile {
  const text = [option.title, option.subtitle, option.reason, option.badge, ...option.notes, ...situation.preferences].filter(Boolean).join(" ");
  const inferredMoods = textMoods(text);
  const moodMatches = situation.desiredMoods.filter((mood) => inferredMoods.includes(mood)).length;
  const patternHits = SPECIAL_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const localBoost = context.localIndependent ? 9 : 0;
  const qualityFromRating = context.rating != null ? (context.rating - 3.6) * 23 : 10;
  const reviewTrust = context.reviewCount != null ? Math.min(12, Math.log10(context.reviewCount + 1) * 4) : 4;
  const genericPenalty = /일반 카페|프랜차이즈|영화관|흔한|평범한/.test(text) ? 24 : 0;
  const specialnessScore = clampScore(48 + patternHits * 10 + moodMatches * 7 + localBoost - genericPenalty);
  const qualityScore = clampScore(55 + qualityFromRating + reviewTrust);
  const rarityScore = clampScore(42 + patternHits * 12 + (context.localIndependent ? 15 : 0) + (inferredMoods.includes("hidden") ? 12 : 0) - genericPenalty);
  const photoValueScore = clampScore(50 + (inferredMoods.some((mood) => ["mysterious", "nature", "artistic", "luxurious"].includes(mood)) ? 22 : 0) + patternHits * 5);
  const journeyRole = journeyRoleFor(category, context.index ?? 0, context.total ?? Number.POSITIVE_INFINITY);
  const traits = Array.from(new Set([
    ...inferredMoods.slice(0, 3).map((mood) => MOOD_LABEL[mood]),
    context.localIndependent ? "이 동네만의 공간" : null,
    patternHits >= 2 ? "공간 자체가 경험" : null,
    journeyRole === "highlight" ? "강한 마무리" : null,
  ].filter((value): value is string => Boolean(value)))).slice(0, 4);
  const limitedMention = /기간 한정|팝업|축제|야간개장|시즌|특별 개방/.test(text);
  return {
    moods: Array.from(new Set([...situation.desiredMoods, ...inferredMoods])).slice(0, 6),
    traits,
    specialnessScore,
    qualityScore,
    rarityScore,
    photoValueScore,
    journeyRole,
    highlightReason: journeyRole === "highlight"
      ? `하루의 마지막에 ${traits[0] ?? "가장 인상적인 장면"}을 남기게 배치했어.`
      : undefined,
    limited: limitedMention ? { label: "운영 기간 확인 필요", status: "candidate" } : undefined,
  };
}

const FLOW_LABEL: Record<JourneyRole, string> = {
  opening: "설렘",
  discovery: "발견",
  play: "재미",
  pause: "대화와 휴식",
  centerpiece: "맛과 분위기",
  highlight: "강한 마무리",
  keepsake: "기억으로 남기기",
};

export function buildExperienceFlow(items: PlanItem[]): NonNullable<DajeongPlan["experienceFlow"]> {
  const labels = items.map((item, index) => FLOW_LABEL[journeyRoleFor(item.category, index, items.length)]);
  const finalItem = items.at(-1);
  const mostSpecial = [...items].sort((a, b) => (b.experience?.specialnessScore ?? 0) - (a.experience?.specialnessScore ?? 0))[0];
  const highlight = finalItem && ["view", "activity"].includes(finalItem.category) && (finalItem.experience?.specialnessScore ?? 0) >= 55
    ? finalItem
    : mostSpecial;
  return {
    labels,
    narrative: `${labels.join(" → ")}의 흐름으로, 비슷한 경험이 반복되지 않게 하루를 짰어.`,
    highlightItemId: highlight?.id,
  };
}
