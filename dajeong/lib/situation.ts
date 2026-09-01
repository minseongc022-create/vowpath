import type { AgeBand, ExperienceMood, Occasion, ParsedSituation, PlanCategory, PlanRequest, PlanScope, SituationUnderstanding, TransportMode } from "./types";

const REGIONS = [
  "강남", "성수", "홍대", "연남", "여의도", "잠실", "광화문", "종로", "용산", "이태원",
  "서울", "인천", "수원", "성남", "분당", "가평", "춘천", "강릉", "속초", "전주", "여수", "경주", "부산", "대구", "대전", "광주", "제주",
];

function dateAtLocalNoon(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function explicitDateInText(text: string): string | null {
  const match = text.match(/(?:(\d{4})[.\-/년]\s*)?(\d{1,2})[.\-/월]\s*(\d{1,2})일?/);
  if (!match) return null;
  const now = new Date();
  const year = match[1] ? Number(match[1]) : now.getFullYear();
  const candidate = new Date(year, Number(match[2]) - 1, Number(match[3]), 12);
  if (Number.isNaN(candidate.getTime())) return null;
  if (!match[1] && candidate.getTime() < now.getTime() - 86_400_000) candidate.setFullYear(year + 1);
  return dateAtLocalNoon(candidate);
}

function deriveDate(text: string, explicit?: string): { targetDate: string; urgency: ParsedSituation["urgency"] } {
  const textual = explicitDateInText(text);
  const selected = explicit || textual;
  if (selected) {
    const selectedDate = new Date(`${selected}T12:00:00`);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const days = Math.round((selectedDate.getTime() - today.getTime()) / 86_400_000);
    return { targetDate: selected, urgency: days <= 0 ? "today" : days === 1 ? "tomorrow" : days <= 4 ? "soon" : "planned" };
  }
  const now = new Date();
  if (/오늘|당장|지금/.test(text)) return { targetDate: dateAtLocalNoon(now), urgency: "today" };
  if (/내일/.test(text)) {
    now.setDate(now.getDate() + 1);
    return { targetDate: dateAtLocalNoon(now), urgency: "tomorrow" };
  }
  if (/모레/.test(text)) {
    now.setDate(now.getDate() + 2);
    return { targetDate: dateAtLocalNoon(now), urgency: "soon" };
  }
  const weekdayMatch = text.match(/(?:(이번|다음|다다음)\s*(?:주\s*)?)?(월|화|수|목|금|토|일)요일/);
  if (weekdayMatch) {
    const target = ({ 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 } as const)[weekdayMatch[2] as "일" | "월" | "화" | "수" | "목" | "금" | "토"];
    let days = (target - now.getDay() + 7) % 7;
    if (days === 0) days = 7;
    if (weekdayMatch[1] === "다음") days += 7;
    if (weekdayMatch[1] === "다다음") days += 14;
    now.setDate(now.getDate() + days);
    return { targetDate: dateAtLocalNoon(now), urgency: days <= 4 ? "soon" : "planned" };
  }
  const days = /다다음 ?주/.test(text) ? 14 : /다음 ?주/.test(text) ? 7 : /이번 ?주|주말|곧/.test(text) ? 3 : 7;
  now.setDate(now.getDate() + days);
  return { targetDate: dateAtLocalNoon(now), urgency: days <= 4 ? "soon" : "planned" };
}

function budgetFromText(text: string): number | null {
  const manwon = text.match(/(\d{1,3})\s*만\s*원?/);
  if (manwon) return Math.min(2_000_000, Math.max(50_000, Number(manwon[1]) * 10_000));
  const won = text.match(/(?:\d{1,3}(?:,\d{3})+|\d{5,7})\s*원/);
  if (won) return Math.min(2_000_000, Math.max(50_000, Number(won[0].replace(/[^\d]/g, ""))));
  return null;
}

function deriveBudget(text: string, explicit?: number): number {
  if (explicit && explicit >= 50_000) return Math.min(2_000_000, explicit);
  return budgetFromText(text) ?? 200_000;
}

function deriveOccasion(text: string): { occasion: Occasion; occasionLabel: string } {
  if (/프로포즈|청혼/.test(text)) return { occasion: "proposal", occasionLabel: "프로포즈" };
  if (/생일/.test(text)) return { occasion: "birthday", occasionLabel: "생일" };
  if (/기념일|100일|일주년|주년/.test(text)) return { occasion: "anniversary", occasionLabel: "기념일" };
  if (/감사|고마|부모님|어버이/.test(text)) return { occasion: "thanks", occasionLabel: "감사의 날" };
  if (/데이트|만나/.test(text)) return { occasion: "date", occasionLabel: "데이트" };
  return { occasion: "special", occasionLabel: "특별한 하루" };
}

function deriveTransport(text: string, explicit?: TransportMode): TransportMode {
  if (explicit && explicit !== "unknown") return explicit;
  if (/(?:차|자차)(?:는|가)?\s*(?:없|없이)|운전(?:은|을)?\s*(?:못|안)|뚜벅|대중교통|지하철|버스/.test(text)) return "public_transit";
  if (/차로|자차|운전|주차/.test(text)) return "car";
  if (/도보|걸어서|걷기/.test(text)) return "walking";
  return "unknown";
}

function deriveRecipient(text: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim().slice(0, 30);
  if (/남자친구/.test(text)) return "남자친구";
  if (/여자친구/.test(text)) return "여자친구";
  if (/남편/.test(text)) return "남편";
  if (/아내/.test(text)) return "아내";
  if (/엄마|어머니/.test(text)) return "어머니";
  if (/아빠|아버지/.test(text)) return "아버지";
  if (/부모님/.test(text)) return "부모님";
  if (/친구/.test(text)) return "친구";
  return "함께할 사람";
}

function deriveAgeBand(text: string, fallback?: AgeBand): AgeBand {
  const explicit = text.match(/(10|20|30|40|50|60|70|80)대/);
  if (explicit) return Number(explicit[1]) >= 60 ? "60대 이상" : `${explicit[1]}대` as AgeBand;
  return fallback ?? "미상";
}

function deriveMoods(text: string, remembered: ExperienceMood[] = []): ExperienceMood[] {
  return Array.from(new Set<ExperienceMood>([
    ...remembered,
    /로맨틱|낭만|설레/.test(text) ? "romantic" : null,
    /신비|몽환|영화 같|빛|미디어아트/.test(text) ? "mysterious" : null,
    /트렌디|힙|세련/.test(text) ? "trendy" : null,
    /조용|차분|편안|여유/.test(text) ? "calm" : null,
    /고급|우아|격식/.test(text) ? "luxurious" : null,
    /재밌|신나|활동|액티브|놀고|놀고 싶|놀거리/.test(text) ? "playful" : null,
    /따뜻|감사|가족/.test(text) ? "warm" : null,
    /숲|정원|자연|바다|오션/.test(text) ? "nature" : null,
    /전시|예술|건축|공연/.test(text) ? "artistic" : null,
    /숨은|흔하지|평범하지|이색|특별/.test(text) ? "hidden" : null,
  ].filter((value): value is ExperienceMood => Boolean(value))));
}

function deriveSingleCategory(text: string): PlanCategory | undefined {
  if (/식당|레스토랑|밥집|저녁.{0,8}(예약|찾|잡)/.test(text)) return "meal";
  if (/카페|커피|디저트/.test(text)) return "cafe";
  if (/전시|체험|공연|뮤지컬|연극|놀거리/.test(text)) return "activity";
  if (/케이크/.test(text)) return "cake";
  if (/꽃집|꽃다발/.test(text)) return "flower";
  if (/소품샵|편집샵|선물/.test(text)) return "gift";
  if (/야경|전망대/.test(text)) return "view";
  return undefined;
}

function derivePlanScope(text: string, singleCategory?: PlanCategory, explicit?: PlanScope): PlanScope {
  if (explicit) return explicit;
  if (/\d+\s*박\s*\d+\s*일|여행|숙소|항공|렌터카/.test(text)) return "trip";
  if (singleCategory && /예약|잡아|찾아|찾아줘|가고 싶|가고싶/.test(text)
    && !/하루|코스|데이트|놀고|놀자|특별하게 보내|준비해/.test(text)) return "single";
  return "day";
}

function deriveTripStay(text: string, explicitDays?: number, explicitNights?: number): { tripDays?: number; tripNights?: number } {
  if (explicitDays != null || explicitNights != null) {
    const nights = Math.max(0, Math.min(13, explicitNights ?? Math.max(0, (explicitDays ?? 1) - 1)));
    const days = Math.max(1, Math.min(14, explicitDays ?? nights + 1));
    return { tripDays: days, tripNights: Math.min(nights, Math.max(0, days - 1)) };
  }
  if (/당일치기|당일 여행|하루 여행/.test(text)) return { tripDays: 1, tripNights: 0 };
  const stay = text.match(/(\d+)\s*박(?:\s*(\d+)\s*일)?/);
  if (stay) {
    const nights = Math.max(1, Math.min(13, Number(stay[1])));
    const days = Math.max(nights + 1, Math.min(14, Number(stay[2] ?? nights + 1)));
    return { tripDays: days, tripNights: nights };
  }
  return {};
}

function derivePartySize(text: string, explicit?: number): number {
  if (explicit && explicit > 0) return Math.min(12, explicit);
  const match = text.match(/(\d{1,2})\s*명/);
  return match ? Math.max(1, Math.min(12, Number(match[1]))) : 2;
}

function deriveTimes(text: string): { startTime: string; preferredTime: string } {
  const start = text.match(/(?:(오전|오후|저녁)\s*)?(\d{1,2})(?::(\d{2}))?\s*시?(?:부터|시작)/);
  const meal = text.match(/(?:저녁|식사)[^\d]{0,6}(?:(오전|오후)\s*)?(\d{1,2})(?::(\d{2}))?\s*시?/);
  const normalize = (match: RegExpMatchArray | null, fallback: string) => {
    if (!match) return fallback;
    let hour = Number(match[2]);
    if ((match[1] === "오후" || match[1] === "저녁") && hour < 12) hour += 12;
    return `${String(Math.min(22, Math.max(9, hour))).padStart(2, "0")}:${match[3] ?? "00"}`;
  };
  return { startTime: normalize(start, "14:00"), preferredTime: normalize(meal, "18:30") };
}

export function parseSituation(input: PlanRequest): ParsedSituation {
  const text = input.request.trim();
  const { occasion, occasionLabel } = deriveOccasion(text);
  const { targetDate, urgency } = deriveDate(text, input.targetDate);
  const rawTimes = deriveTimes(text);
  const region = input.region?.trim() || REGIONS.find((candidate) => text.includes(candidate)) || "서울";
  const transport = deriveTransport(text, input.transport);
  const singleCategory = deriveSingleCategory(text);
  const planScope = derivePlanScope(text, singleCategory, input.planScope);
  const tripStay = deriveTripStay(text, input.tripDays, input.tripNights);
  const startTime = planScope === "trip" && rawTimes.startTime === "14:00" ? "11:00" : rawTimes.startTime;
  const preferredTime = rawTimes.preferredTime;
  const ageBand = deriveAgeBand(text, input.ageBand ?? input.personProfile?.ageBand);
  const desiredMoods = deriveMoods(text, [...(input.desiredMoods ?? []), ...(input.personProfile?.moodPreferences ?? [])]);
  const indoorPreference = /실내|비\s*(와|오|올)|추워|더워|미세먼지/.test(text);
  const tone = /신나|재밌|활기/.test(text)
    ? "lively"
    : /조용|차분|부모님/.test(text)
      ? "calm"
      : /감사|고마/.test(text)
        ? "warm"
        : "romantic";
  const parsedPreferences = [
    /전시|미술|갤러리/.test(text) ? "전시" : null,
    /공연|뮤지컬|연극/.test(text) ? "공연" : null,
    /야경|뷰|전망/.test(text) ? "야경" : null,
    /카페|커피|디저트/.test(text) ? "카페" : null,
    /소품샵|편집샵|독립서점/.test(text) ? "소품샵" : null,
    /특별|기억|색다른|평범하지|흔하지/.test(text) ? "특별함" : null,
    /조용|차분|대화/.test(text) ? "조용한 분위기" : null,
    /감성|사진|인스타|예쁜/.test(text) ? "사진과 분위기" : null,
    /한식/.test(text) ? "한식" : null,
    /일식|초밥|스시/.test(text) ? "일식" : null,
    /파스타|이탈리안|양식/.test(text) ? "이탈리안·양식" : null,
    /고기|스테이크/.test(text) ? "고기 요리" : null,
    /빵|베이커리/.test(text) ? "베이커리" : null,
    /프랜차이즈.{0,5}(싫|제외)|로컬|동네.{0,4}(가게|맛집)/.test(text) ? "로컬 독립 매장" : null,
    /꽃/.test(text) ? "꽃" : null,
    /향수/.test(text) ? "향수" : null,
    /정원|숲|자연/.test(text) ? "정원·자연 공간" : null,
    /미디어아트|몰입형/.test(text) ? "미디어아트·몰입형 경험" : null,
    /신비|몽환|영화 같/.test(text) ? "신비롭고 몽환적인 분위기" : null,
    /재밌|신나|액티브|놀고|놀고 싶|놀거리/.test(text) ? "재미있는 체험" : null,
  ].filter((value): value is string => Boolean(value));
  const parsedConstraints = [
    /술.{0,4}(못|안)|논알코올/.test(text) ? "논알코올" : null,
    transport === "public_transit" ? "차량 없이 이동" : null,
    transport === "car" ? "주차 가능" : null,
    /채식|비건/.test(text) ? "채식 선택" : null,
    /알레르기/.test(text) ? "알레르기 확인" : null,
    /매운.{0,6}(못|안|싫)|맵지 않/.test(text) ? "맵지 않은 음식" : null,
    indoorPreference ? "실내 위주" : null,
    /걷.{0,8}(싫|힘|않)|많이.{0,4}(못 걸|걷지)|오래.{0,4}(못 걸|걷지)/.test(text) ? "도보 이동 최소화" : null,
    /사람.{0,5}(많|붐비).{0,5}(싫|피)|붐비는.{0,5}(싫|피)/.test(text) ? "혼잡한 장소 제외" : null,
    /시끄럽.{0,5}(싫|피)|소음/.test(text) ? "시끄러운 장소 제외" : null,
  ].filter((value): value is string => Boolean(value));
  const preferences = Array.from(new Set([...(input.personProfile?.preferences ?? []), ...(input.personProfile?.hobbies ?? []), ...(input.preferences ?? []), ...parsedPreferences]));
  const constraints = Array.from(new Set([...(input.personProfile?.constraints ?? []), ...(input.constraints ?? []), ...parsedConstraints]));

  return {
    occasion,
    occasionLabel,
    recipient: deriveRecipient(text, input.recipient),
    region,
    departureRegion: input.departureRegion?.trim() || undefined,
    budget: deriveBudget(text, input.budget),
    targetDate,
    partySize: derivePartySize(text, input.partySize),
    urgency,
    preferredTime,
    startTime,
    tone,
    transport,
    indoorPreference,
    preferences,
    constraints,
    ageBand,
    desiredMoods,
    planScope,
    singleCategory: planScope === "single" ? singleCategory : undefined,
    tripDays: tripStay.tripDays,
    tripNights: tripStay.tripNights,
    needsLodging: planScope === "trip" && (tripStay.tripNights ?? 0) > 0,
    checkInTime: planScope === "trip" && (tripStay.tripNights ?? 0) > 0 ? input.checkInTime ?? "15:00" : undefined,
    checkOutTime: planScope === "trip" && (tripStay.tripNights ?? 0) > 0 ? input.checkOutTime ?? "11:00" : undefined,
    arrivalTime: input.arrivalTime,
    returnDepartureTime: input.returnDepartureTime,
    lodgingPreference: input.lodgingPreference,
    lodgingIncludedInBudget: input.lodgingIncludedInBudget ?? false,
    requestKind: input.requestKind ?? (planScope === "trip" ? "trip_plan" : planScope === "single" ? "place_search" : "day_plan"),
    requestedCategories: input.requestedCategories ?? (singleCategory ? [singleCategory] : []),
    excludedCategories: input.excludedCategories ?? [],
    explicitUnknowns: input.explicitUnknowns ?? [],
    personMemoryUpdate: input.personMemoryUpdate,
    limitedEventPriority: /오늘|이번|주말|이번 주|이번주|기간 한정|팝업|축제|야간개장|시즌/.test(text),
    personProfile: input.personProfile,
  };
}

export function analyzeSituation(input: PlanRequest): SituationUnderstanding {
  const text = input.request.trim();
  const situation = parseSituation(input);
  const hasDate = Boolean(input.targetDate || explicitDateInText(text) || /오늘|내일|모레|(?:이번|다음|다다음) ?주|주말|곧|(?:이번|다음|다다음)?\s*(?:주\s*)?(?:월|화|수|목|금|토|일)요일/.test(text));
  const hasRegion = Boolean(input.region?.trim() || REGIONS.some((region) => text.includes(region)));
  const hasBudget = Boolean(input.budget || budgetFromText(text));
  const missing = [!hasDate ? "date" : null, !hasRegion ? "region" : null, situation.planScope !== "single" && !hasBudget ? "budget" : null]
    .filter((value): value is "date" | "region" | "budget" => Boolean(value));
  const recognized = [
    { label: "목적", value: situation.occasionLabel },
    { label: "함께", value: situation.recipient },
    hasDate ? { label: "날짜", value: situation.targetDate } : null,
    hasRegion ? { label: "지역", value: situation.region } : null,
    hasBudget ? { label: "예산", value: `${Math.round(situation.budget / 10_000)}만원` } : null,
    situation.transport !== "unknown" ? { label: "이동", value: situation.transport === "car" ? "차량" : situation.transport === "walking" ? "도보" : "대중교통" } : null,
    situation.partySize !== 2 || /\d+\s*명/.test(text) ? { label: "인원", value: `${situation.partySize}명` } : null,
    situation.ageBand !== "미상" ? { label: "나이대", value: situation.ageBand } : null,
    situation.desiredMoods.length ? { label: "느낌", value: situation.desiredMoods.map((mood) => ({ romantic: "로맨틱", mysterious: "신비롭게", trendy: "트렌디", calm: "편안하게", luxurious: "고급스럽게", playful: "재밌게", warm: "따뜻하게", nature: "자연 속", artistic: "예술적으로", hidden: "숨은 명소" }[mood])).slice(0, 3).join(" · ") } : null,
    input.personProfile?.preferences.length ? { label: "기억", value: `${input.personProfile.name} 취향 ${input.personProfile.preferences.slice(0, 2).join(" · ")}` } : null,
    ...situation.constraints.filter((value) => value !== "차량 없이 이동" && value !== "주차 가능").map((value) => ({ label: "조건", value })),
  ].filter((value): value is { label: string; value: string } => Boolean(value));
  const confidence = Math.max(62, Math.min(98, 68 + recognized.length * 5 - missing.length * 3));

  return {
    situation,
    recognized,
    missing,
    confidence,
    message: missing.length === 0
      ? "필요한 조건을 충분히 이해했어요. 바로 하루를 구성할 수 있어요."
      : `이미 말해준 내용은 기억했어요. 계획을 정확히 맞추려면 ${missing.length}가지만 더 필요해요.`,
  };
}
