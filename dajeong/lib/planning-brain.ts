import { openAiStructuredCompletion, type OpenAiJsonSchema } from "@/lib/openai-chat";
import { analyzeSituation, parseSituation } from "./situation";
import type {
  AgeBand,
  ExperienceMood,
  PersonMemoryUpdate,
  PlanCategory,
  PlanRequest,
  PlanningChatMessage,
  PlanningConversationResult,
  PlanningQuestionKey,
  PlanScope,
  RequestKind,
  TransportMode,
  ScheduleDensity,
} from "./types";

const REGIONS = ["성수", "강남", "홍대", "연남", "여의도", "잠실", "광화문", "종로", "용산", "이태원", "서울", "인천", "수원", "성남", "분당", "가평", "춘천", "강릉", "속초", "전주", "여수", "경주", "부산", "대구", "대전", "광주", "제주"];
const BROAD_REGIONS = ["서울", "인천", "부산", "대구", "대전", "광주", "수원", "성남", "제주"];
const MOODS: ExperienceMood[] = ["romantic", "mysterious", "trendy", "calm", "luxurious", "playful", "warm", "nature", "artistic", "hidden"];
const CATEGORIES: PlanCategory[] = ["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift", "moment"];
const QUESTION_KEYS: Exclude<PlanningQuestionKey, null>[] = ["recipient", "date", "region", "departure", "budget", "partySize", "tripLength", "preference", "transport", "lodgingPreference", "arrivalTime", "returnTime", "mustHave", "availabilityTime", "density"];

type StructuredConversationDecision = {
  requestKind: RequestKind;
  planScope: PlanScope;
  singleCategory: PlanCategory | null;
  recipient: string | null;
  region: string | null;
  departureRegion: string | null;
  budget: number | null;
  targetDate: string | null;
  partySize: number | null;
  transport: TransportMode | null;
  ageBand: AgeBand | null;
  tripDays: number | null;
  tripNights: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  arrivalTime: string | null;
  returnDepartureTime: string | null;
  lodgingPreference: string | null;
  lodgingIncludedInBudget: boolean | null;
  availabilityStartTime: string | null;
  availabilityEndTime: string | null;
  scheduleDensity: ScheduleDensity | null;
  homeByTime: string | null;
  homeTravelMinutes: number | null;
  preferences: string[];
  constraints: string[];
  desiredMoods: ExperienceMood[];
  requestedCategories: PlanCategory[];
  excludedCategories: PlanCategory[];
  explicitUnknowns: string[];
  personMemoryUpdate: PersonMemoryUpdate;
  enoughInformation: boolean;
  nextQuestionKey: PlanningQuestionKey;
  reply: string;
};

const nullable = (value: Record<string, unknown>) => ({ anyOf: [value, { type: "null" }] });
const stringArray = { type: "array", items: { type: "string" } };
const enumArray = (values: string[]) => ({ type: "array", items: { type: "string", enum: values } });

const DECISION_SCHEMA: OpenAiJsonSchema = {
  type: "object",
  properties: {
    requestKind: { type: "string", enum: ["day_plan", "trip_plan", "place_search", "reservation", "product_search"] },
    planScope: { type: "string", enum: ["single", "day", "trip"] },
    singleCategory: nullable({ type: "string", enum: CATEGORIES }),
    recipient: nullable({ type: "string" }),
    region: nullable({ type: "string" }),
    departureRegion: nullable({ type: "string" }),
    budget: nullable({ type: "number" }),
    targetDate: nullable({ type: "string" }),
    partySize: nullable({ type: "number" }),
    transport: nullable({ type: "string", enum: ["public_transit", "car", "walking", "unknown"] }),
    ageBand: nullable({ type: "string", enum: ["10대", "20대", "30대", "40대", "50대", "60대 이상", "미상"] }),
    tripDays: nullable({ type: "number" }),
    tripNights: nullable({ type: "number" }),
    checkInTime: nullable({ type: "string" }),
    checkOutTime: nullable({ type: "string" }),
    arrivalTime: nullable({ type: "string" }),
    returnDepartureTime: nullable({ type: "string" }),
    lodgingPreference: nullable({ type: "string" }),
    lodgingIncludedInBudget: nullable({ type: "boolean" }),
    availabilityStartTime: nullable({ type: "string" }),
    availabilityEndTime: nullable({ type: "string" }),
    scheduleDensity: nullable({ type: "string", enum: ["compact", "balanced", "relaxed"] }),
    homeByTime: nullable({ type: "string" }),
    homeTravelMinutes: nullable({ type: "number" }),
    preferences: stringArray,
    constraints: stringArray,
    desiredMoods: enumArray(MOODS),
    requestedCategories: enumArray(CATEGORIES),
    excludedCategories: enumArray(CATEGORIES),
    explicitUnknowns: stringArray,
    personMemoryUpdate: {
      type: "object",
      properties: {
        preferences: stringArray,
        constraints: stringArray,
        likedFoods: stringArray,
        dislikedFoods: stringArray,
        hobbies: stringArray,
        likedActivities: stringArray,
        dislikedActivities: stringArray,
        likedAtmospheres: stringArray,
        dislikedAtmospheres: stringArray,
        crowdTolerance: { type: "string", enum: ["low", "medium", "high", "unknown"] },
        walkingTolerance: { type: "string", enum: ["low", "medium", "high", "unknown"] },
        notes: stringArray,
      },
      required: ["preferences", "constraints", "likedFoods", "dislikedFoods", "hobbies", "likedActivities", "dislikedActivities", "likedAtmospheres", "dislikedAtmospheres", "crowdTolerance", "walkingTolerance", "notes"],
      additionalProperties: false,
    },
    enoughInformation: { type: "boolean" },
    nextQuestionKey: nullable({ type: "string", enum: QUESTION_KEYS }),
    reply: { type: "string" },
  },
  required: ["requestKind", "planScope", "singleCategory", "recipient", "region", "departureRegion", "budget", "targetDate", "partySize", "transport", "ageBand", "tripDays", "tripNights", "checkInTime", "checkOutTime", "arrivalTime", "returnDepartureTime", "lodgingPreference", "lodgingIncludedInBudget", "availabilityStartTime", "availabilityEndTime", "scheduleDensity", "homeByTime", "homeTravelMinutes", "preferences", "constraints", "desiredMoods", "requestedCategories", "excludedCategories", "explicitUnknowns", "personMemoryUpdate", "enoughInformation", "nextQuestionKey", "reply"],
  additionalProperties: false,
};

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function unique(values: Array<string | undefined | null>, limit = 30): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).slice(0, limit);
}

function nextSaturday(): string {
  const date = new Date();
  const distance = (6 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + distance);
  return localDate(date);
}

function hasDate(text: string): boolean {
  return /오늘|내일|모레|일주일\s*뒤|한\s*주\s*뒤|\d{1,3}\s*일\s*(?:뒤|후)|(?:이번|다음|다다음)\s*(?:주|주말)|주말|(?:이번|다음|다다음)?\s*(?:주\s*)?(?:월|화|수|목|금|토|일)요일|(?:\d{4}[.\-/년]\s*)?\d{1,2}[.\-/월]\s*\d{1,2}일?/.test(text);
}

function budgetIn(text: string): number | undefined {
  const manwon = text.match(/(\d{1,3})\s*만\s*원?/);
  if (manwon) return Math.max(10_000, Math.min(5_000_000, Number(manwon[1]) * 10_000));
  const won = text.match(/(?:\d{1,3}(?:,\d{3})+|\d{4,8})\s*원/);
  return won ? Math.max(10_000, Math.min(5_000_000, Number(won[0].replace(/\D/g, "")))) : undefined;
}

function partySizeIn(text: string): number | undefined {
  if (/혼자/.test(text)) return 1;
  if (/둘이|두\s*명|여자친구|여친|남자친구|남친|아내|남편/.test(text)) return 2;
  if (/셋이|세\s*명/.test(text)) return 3;
  if (/넷이|네\s*명/.test(text)) return 4;
  const match = text.match(/(\d{1,2})\s*명/);
  return match ? Math.max(1, Math.min(20, Number(match[1]))) : undefined;
}

function regionIn(text: string): string | undefined {
  return REGIONS.find((region) => text.includes(region));
}

function hasBatchim(word: string): boolean {
  const ch = word.trim().at(-1);
  if (!ch) return false;
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return false;
  return code % 28 !== 0;
}

function topicParticle(word: string): string {
  return hasBatchim(word) ? "은" : "는";
}

function regionNeedsNarrowing(draft: PlanRequest): boolean {
  return Boolean(draft.region && BROAD_REGIONS.includes(draft.region) && !draft.explicitUnknowns?.includes("regionNarrowed"));
}

function recipientIn(text: string): string | undefined {
  if (/남자친구|남친/.test(text)) return "남자친구";
  if (/여자친구|여친/.test(text)) return "여자친구";
  if (/남편/.test(text)) return "남편";
  if (/아내/.test(text)) return "아내";
  if (/엄마|어머니/.test(text)) return "어머니";
  if (/아빠|아버지/.test(text)) return "아버지";
  if (/친구/.test(text)) return "친구";
  if (/혼자/.test(text)) return "나";
  return undefined;
}

function isUndecided(text: string): boolean {
  return /모르겠|정한.{0,6}없|아무거나|추천해|추천해줘|맡길|상관없|알아서/.test(text);
}

function explicitNoMustHave(text: string): boolean {
  return /딱히.{0,12}(꼭|반드시).{0,10}(없|모르)|꼭.{0,10}(하고|가고|먹고).{0,8}(없|모르)|필수.{0,8}(없|모르)/.test(text);
}

function normalizeClock(period: string | undefined, hourText: string, minuteText?: string): string | undefined {
  let hour = Number(hourText);
  const minute = Number(minuteText ?? "0");
  if (!Number.isFinite(hour) || hour < 0 || hour > 24 || minute < 0 || minute > 59) return undefined;
  if ((period === "오후" || period === "저녁") && hour < 12) hour += 12;
  if (period === "오전" && hour === 12) hour = 0;
  return `${String(hour % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timeAfter(text: string, marker: RegExp): string | undefined {
  const match = text.match(new RegExp(`(?:${marker.source})[^\\d]{0,14}?(?:(오전|오후|저녁)\\s*)?(\\d{1,2})(?::(\\d{2}))?\\s*시?`));
  return match ? normalizeClock(match[1], match[2], match[3]) : undefined;
}

export function emptyPersonMemoryUpdate(): PersonMemoryUpdate {
  return {
    preferences: [],
    constraints: [],
    likedFoods: [],
    dislikedFoods: [],
    hobbies: [],
    likedActivities: [],
    dislikedActivities: [],
    likedAtmospheres: [],
    dislikedAtmospheres: [],
    crowdTolerance: "unknown",
    walkingTolerance: "unknown",
    notes: [],
  };
}

function memoryUpdateFrom(text: string): PersonMemoryUpdate {
  const dislikedFoods = unique([
    /매운.{0,8}(못|안|싫)|맵지 않/.test(text) ? "매운 음식" : null,
    /회.{0,6}(못|안|싫)/.test(text) ? "회" : null,
  ]);
  const likedActivities = unique([
    /전시.{0,6}(좋|좋아)/.test(text) ? "전시" : null,
    /야경.{0,6}(좋|좋아)/.test(text) ? "야경" : null,
    /공연.{0,6}(좋|좋아)/.test(text) ? "공연" : null,
  ]);
  const dislikedActivities = unique([
    /공방.{0,8}(싫|별로|안\s*좋)/.test(text) ? "공방" : null,
    /카페.{0,8}(싫|별로|뻔)/.test(text) ? "평범한 카페 데이트" : null,
  ]);
  const likedAtmospheres = unique([
    /조용.{0,8}(좋|좋아)/.test(text) ? "조용한 분위기" : null,
    /야경.{0,6}(좋|좋아)/.test(text) ? "야경이 보이는 분위기" : null,
  ]);
  const dislikedAtmospheres = unique([
    /사람.{0,5}(많|붐비).{0,6}(싫|피)/.test(text) ? "혼잡한 분위기" : null,
    /시끄럽.{0,6}(싫|피)/.test(text) ? "시끄러운 분위기" : null,
  ]);
  const constraints = unique([
    ...dislikedFoods.map((value) => `${value} 제외`),
    ...dislikedActivities.map((value) => `${value} 제외`),
    ...dislikedAtmospheres.map((value) => `${value} 제외`),
  ]);
  return {
    ...emptyPersonMemoryUpdate(),
    preferences: unique([...likedActivities, ...likedAtmospheres]),
    constraints,
    dislikedFoods,
    hobbies: likedActivities,
    likedActivities,
    dislikedActivities,
    likedAtmospheres,
    dislikedAtmospheres,
    crowdTolerance: dislikedAtmospheres.includes("혼잡한 분위기") ? "low" : "unknown",
    walkingTolerance: /많이.{0,4}(못 걸|걷지)|걷.{0,8}(싫|힘)/.test(text) ? "low" : "unknown",
  };
}

function mergeMemory(base?: PersonMemoryUpdate, update?: PersonMemoryUpdate): PersonMemoryUpdate {
  const fallback = emptyPersonMemoryUpdate();
  return {
    preferences: unique([...(base?.preferences ?? []), ...(update?.preferences ?? [])]),
    constraints: unique([...(base?.constraints ?? []), ...(update?.constraints ?? [])]),
    likedFoods: unique([...(base?.likedFoods ?? []), ...(update?.likedFoods ?? [])]),
    dislikedFoods: unique([...(base?.dislikedFoods ?? []), ...(update?.dislikedFoods ?? [])]),
    hobbies: unique([...(base?.hobbies ?? []), ...(update?.hobbies ?? [])]),
    likedActivities: unique([...(base?.likedActivities ?? []), ...(update?.likedActivities ?? [])]),
    dislikedActivities: unique([...(base?.dislikedActivities ?? []), ...(update?.dislikedActivities ?? [])]),
    likedAtmospheres: unique([...(base?.likedAtmospheres ?? []), ...(update?.likedAtmospheres ?? [])]),
    dislikedAtmospheres: unique([...(base?.dislikedAtmospheres ?? []), ...(update?.dislikedAtmospheres ?? [])]),
    crowdTolerance: update?.crowdTolerance && update.crowdTolerance !== "unknown" ? update.crowdTolerance : base?.crowdTolerance ?? fallback.crowdTolerance,
    walkingTolerance: update?.walkingTolerance && update.walkingTolerance !== "unknown" ? update.walkingTolerance : base?.walkingTolerance ?? fallback.walkingTolerance,
    notes: unique([...(base?.notes ?? []), ...(update?.notes ?? [])], 20),
  };
}

export function applyDeterministicConversation(messages: PlanningChatMessage[], previous: Partial<PlanRequest>, currentQuestion?: PlanningQuestionKey): PlanRequest {
  const userTexts = messages.filter((message) => message.role === "user").map((message) => message.text.trim()).filter(Boolean);
  const latest = userTexts.at(-1) ?? "";
  const fullText = userTexts.join("\n");
  const parsedAll = parseSituation({ ...previous, request: fullText || "특별한 하루를 추천해줘" });
  const parsedLatest = parseSituation({ request: latest || fullText || "특별한 하루를 추천해줘" });
  const foundRegion = regionIn(latest);
  const foundRecipient = recipientIn(latest);
  const latestTransport = /렌터카|렌트카|자차|차로|운전|차\s*(?:가져|가지)/.test(latest) ? "car" as const
    : /차.{0,5}(없|안\s*가져|안\s*가지)|뚜벅|대중교통/.test(latest) ? "public_transit" as const
      : /도보|걸어서/.test(latest) ? "walking" as const
        : undefined;
  const tripLengthMentioned = /당일치기|\d+\s*박(?:\s*\d+\s*일)?/.test(latest);
  const category = parsedLatest.singleCategory ?? parsedAll.singleCategory;
  const inferredScope: PlanScope = previous.planScope === "trip" || parsedAll.planScope === "trip" || /(놀러\s*가|떠나|제주(?:도)?[^\n]{0,16}가고\s*싶)/.test(fullText) ? "trip" : parsedAll.planScope;
  const requestKind: RequestKind = /예약|잡아\s*줘|잡아줘/.test(fullText) ? "reservation"
    : inferredScope === "trip" ? "trip_plan"
      : inferredScope === "single" && ["flower", "gift", "cake"].includes(category ?? "activity") ? "product_search"
        : inferredScope === "single" ? "place_search" : "day_plan";
  const memory = mergeMemory(previous.personMemoryUpdate, memoryUpdateFrom(fullText));
  const resolvedRegion = currentQuestion === "departure" ? previous.region : foundRegion ?? previous.region ?? (REGIONS.some((region) => fullText.includes(region)) ? parsedAll.region : undefined);
  const regionNarrowedNow = Boolean(currentQuestion === "region" && resolvedRegion && BROAD_REGIONS.includes(resolvedRegion) && previous.region && BROAD_REGIONS.includes(previous.region));
  const explicitUnknowns = unique([
    ...(previous.explicitUnknowns ?? []),
    ...(explicitNoMustHave(fullText) ? ["mustHave"] : []),
    ...(regionNarrowedNow ? ["regionNarrowed"] : []),
  ]);
  const arrivalTime = timeAfter(latest, /도착|도착하는|제주에\s*가는/) ?? previous.arrivalTime;
  const returnDepartureTime = timeAfter(latest, /돌아가는|돌아올|복귀|출발하는/) ?? previous.returnDepartureTime;
  const lodgingPreference = /오션\s*뷰|바다\s*뷰/.test(latest) ? "오션뷰"
    : /시티\s*뷰|야경\s*뷰/.test(latest) ? "시티뷰·야경"
      : /숙소|호텔|펜션|뷰|청결|위치/.test(latest) && currentQuestion === "lodgingPreference" ? latest.slice(0, 100) : previous.lodgingPreference;
  const latestBudget = budgetIn(latest);
  const targetDate = hasDate(latest) ? parsedLatest.targetDate : previous.targetDate;
  const tripDays = tripLengthMentioned ? parsedLatest.tripDays : previous.tripDays ?? parsedAll.tripDays;
  const tripNights = tripLengthMentioned ? parsedLatest.tripNights : previous.tripNights ?? parsedAll.tripNights;
  const planScope = inferredScope;
  const requestedCategories = unique([...(previous.requestedCategories ?? []), ...(category ? [category] : [])]).filter((value): value is PlanCategory => CATEGORIES.includes(value as PlanCategory));
  const excludedCategories = unique([
    ...(previous.excludedCategories ?? []),
    /카페(?:는|를|도)?\s*(?:빼|제외|싫)/.test(fullText) ? "cafe" : null,
  ]).filter((value): value is PlanCategory => CATEGORIES.includes(value as PlanCategory));
  const preferences = unique([...(previous.preferences ?? []), ...parsedAll.preferences, ...memory.preferences]);
  const constraints = unique([...(previous.constraints ?? []), ...parsedAll.constraints, ...memory.constraints, /공방.{0,8}(싫|제외)/.test(fullText) ? "공방 제외" : null]);
  const desiredMoods = Array.from(new Set([...(previous.desiredMoods ?? []), ...parsedAll.desiredMoods]));
  if (/힐링/.test(fullText) && !desiredMoods.includes("calm")) desiredMoods.push("calm");
  if (/액티비티|액티브/.test(fullText) && !desiredMoods.includes("playful")) desiredMoods.push("playful");

  const draft: PlanRequest = {
    ...previous,
    request: fullText,
    recipient: foundRecipient ?? previous.recipient ?? (parsedAll.recipient !== "함께할 사람" ? parsedAll.recipient : undefined),
    region: resolvedRegion,
    departureRegion: currentQuestion === "departure" && foundRegion ? foundRegion : previous.departureRegion,
    budget: latestBudget ?? previous.budget,
    targetDate,
    partySize: partySizeIn(latest) ?? previous.partySize ?? partySizeIn(fullText),
    transport: latestTransport ?? previous.transport ?? (parsedAll.transport !== "unknown" ? parsedAll.transport : undefined),
    ageBand: parsedAll.ageBand !== "미상" ? parsedAll.ageBand : previous.ageBand,
    planScope,
    requestKind,
    singleCategory: planScope === "single" ? category : previous.singleCategory,
    requestedCategories,
    excludedCategories,
    tripDays,
    tripNights,
    checkInTime: previous.checkInTime ?? (tripNights ? "15:00" : undefined),
    checkOutTime: previous.checkOutTime ?? (tripNights ? "11:00" : undefined),
    arrivalTime,
    returnDepartureTime,
    lodgingPreference,
    lodgingIncludedInBudget: previous.lodgingIncludedInBudget ?? (/숙소(?:까지|포함)|숙박(?:까지|포함)/.test(fullText) ? true : undefined),
    preferences,
    constraints,
    desiredMoods,
    explicitUnknowns,
    personMemoryUpdate: memory,
    intakeConversation: messages,
    availabilityStartTime: /(?:부터|시작|에\s*만나)/.test(latest) ? parsedLatest.startTime : previous.availabilityStartTime ?? parsedAll.startTime,
    availabilityEndTime: /부터.{0,30}(?:까지|쯤|정도)|\d{1,2}\s*시간/.test(latest) ? parsedLatest.availabilityEndTime : previous.availabilityEndTime,
    scheduleDensity: /알차게|여기저기|다양하게|꽉\s*차게|여유롭게|널널|천천히|쉬엄|느긋/.test(latest) ? parsedLatest.scheduleDensity : previous.scheduleDensity,
    densitySpecified: /알차게|여기저기|다양하게|꽉\s*차게|여유롭게|널널|천천히|쉬엄|느긋/.test(latest) || previous.densitySpecified,
    homeByTime: /까지\s*(?:집|귀가|들어가)/.test(latest) ? parsedLatest.homeByTime : previous.homeByTime,
    homeTravelMinutes: previous.homeTravelMinutes,
    temporaryCondition: /피곤|컨디션|발.{0,5}(아프|다쳤)|다리.{0,5}(아프|불편)/.test(latest) ? parsedLatest.temporaryCondition : previous.temporaryCondition,
    budgetUsage: /예산.{0,8}(꽉|다\s*써)|\d+\s*만\s*원.{0,8}(꽉|다\s*써)/.test(latest) ? "full" : previous.budgetUsage,
  };

  if (currentQuestion && isUndecided(latest)) {
    if (currentQuestion === "date") draft.targetDate = nextSaturday();
    if (currentQuestion === "tripLength") Object.assign(draft, { planScope: "trip", tripDays: 2, tripNights: 1, checkInTime: "15:00", checkOutTime: "11:00" });
    if (currentQuestion === "region") {
      draft.region = draft.planScope === "trip" ? "가평" : "서울";
      draft.explicitUnknowns = unique([...(draft.explicitUnknowns ?? []), "regionNarrowed"]);
    }
    if (currentQuestion === "budget") draft.budget = draft.planScope === "trip" ? 600_000 : 250_000;
    if (currentQuestion === "preference") {
      draft.preferences = unique([...(draft.preferences ?? []), "쉽게 찾기 어려운 특별한 경험"]);
      draft.desiredMoods = Array.from(new Set([...(draft.desiredMoods ?? []), "hidden", "playful"]));
    }
    if (currentQuestion === "lodgingPreference") draft.lodgingPreference = "위치와 청결이 좋은 조용한 숙소";
    if (currentQuestion === "transport") draft.transport = "public_transit";
    if (currentQuestion === "arrivalTime") draft.arrivalTime = "12:00";
    if (currentQuestion === "returnTime") draft.returnDepartureTime = "18:00";
    if (currentQuestion === "mustHave") draft.explicitUnknowns = unique([...(draft.explicitUnknowns ?? []), "mustHave"]);
    if (currentQuestion === "availabilityTime") Object.assign(draft, { availabilityStartTime: "14:00", availabilityEndTime: "22:00" });
    if (currentQuestion === "density") Object.assign(draft, { scheduleDensity: "balanced", densitySpecified: true });
  }
  if (currentQuestion === "density" && /적당|균형|보통/.test(latest)) Object.assign(draft, { scheduleDensity: "balanced", densitySpecified: true });
  return draft;
}

async function structuredDecision(messages: PlanningChatMessage[], draft: PlanRequest): Promise<StructuredConversationDecision | null> {
  if (!process.env.OPENAI_API_KEY?.trim()) return null;
  try {
    return await openAiStructuredCompletion<StructuredConversationDecision>({
      name: "haruon_conversation_decision",
      schema: DECISION_SCHEMA,
      timeoutMs: 10_000,
      temperature: 0.05,
      messages: [
        {
          role: "system",
          content: `너는 하루위드의 대화 이해 엔진이다. 오늘은 ${localDate(new Date())}다. 전체 멀티턴 대화와 현재 구조화 상태를 함께 읽어라. 사용자가 이미 말한 값은 유지하고 최신 명시적 수정만 덮어쓴다. 사용자가 말하지 않은 취향·사실·장소는 만들지 않는다. 단일 식당/카페/꽃/전시/예약 요청을 하루 코스로 확대하지 않는다. availabilityStartTime/endTime은 실제로 함께 놀 수 있는 범위, homeByTime은 장소 종료가 아닌 귀가 마감이다. 알차게는 compact, 여유롭게는 relaxed, 적당히는 balanced다. 피곤함과 발 통증은 이번 일정에만 쓰고 personMemoryUpdate에 넣지 않는다. session 값과 장기 사람 취향을 구분하고, personMemoryUpdate에는 특정 동반자에 대해 명시한 안정적인 취향만 넣는다. '딱히 꼭 하고 싶은 건 없어'는 explicitUnknowns에 mustHave를 넣는 유효한 답이다. 도착 시간과 돌아가는 출발 시간을 구분한다. 정보가 부족하면 결과를 가장 크게 바꾸는 질문 하나만 선택하고 자연스러운 한국어 한 문장으로 묻는다. 이미 말한 정보는 다시 묻지 않는다. reply에는 확인되지 않은 예약·가격·영업 사실을 쓰지 않는다.`,
        },
        {
          role: "user",
          content: `현재 구조화 상태:\n${JSON.stringify(draft)}\n\n전체 대화:\n${messages.map((message) => `${message.role}: ${message.text}`).join("\n")}`,
        },
      ],
    });
  } catch {
    return null;
  }
}

function safeTime(value: string | null): string | undefined {
  return value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : undefined;
}

function mergeStructuredDecision(draft: PlanRequest, decision: StructuredConversationDecision): PlanRequest {
  const memory = mergeMemory(draft.personMemoryUpdate, decision.personMemoryUpdate);
  const planScope = ["single", "day", "trip"].includes(decision.planScope) ? decision.planScope : draft.planScope;
  const singleCategory = decision.singleCategory && CATEGORIES.includes(decision.singleCategory) ? decision.singleCategory : draft.singleCategory;
  return {
    ...draft,
    requestKind: decision.requestKind,
    planScope,
    singleCategory: planScope === "single" ? singleCategory : draft.singleCategory,
    recipient: decision.recipient?.trim().slice(0, 30) || draft.recipient,
    region: decision.region?.trim().slice(0, 40) || draft.region,
    departureRegion: decision.departureRegion?.trim().slice(0, 40) || draft.departureRegion,
    budget: decision.budget != null && decision.budget >= 10_000 && decision.budget <= 5_000_000 ? Math.round(decision.budget) : draft.budget,
    targetDate: decision.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(decision.targetDate) ? decision.targetDate : draft.targetDate,
    partySize: decision.partySize != null && decision.partySize >= 1 && decision.partySize <= 20 ? Math.round(decision.partySize) : draft.partySize,
    transport: decision.transport && ["public_transit", "car", "walking", "unknown"].includes(decision.transport) ? decision.transport : draft.transport,
    ageBand: decision.ageBand ?? draft.ageBand,
    tripDays: decision.tripDays != null ? Math.max(1, Math.min(14, Math.round(decision.tripDays))) : draft.tripDays,
    tripNights: decision.tripNights != null ? Math.max(0, Math.min(13, Math.round(decision.tripNights))) : draft.tripNights,
    checkInTime: safeTime(decision.checkInTime) ?? draft.checkInTime,
    checkOutTime: safeTime(decision.checkOutTime) ?? draft.checkOutTime,
    arrivalTime: safeTime(decision.arrivalTime) ?? draft.arrivalTime,
    returnDepartureTime: safeTime(decision.returnDepartureTime) ?? draft.returnDepartureTime,
    lodgingPreference: decision.lodgingPreference?.trim().slice(0, 120) || draft.lodgingPreference,
    lodgingIncludedInBudget: decision.lodgingIncludedInBudget ?? draft.lodgingIncludedInBudget,
    availabilityStartTime: safeTime(decision.availabilityStartTime) ?? draft.availabilityStartTime,
    availabilityEndTime: safeTime(decision.availabilityEndTime) ?? draft.availabilityEndTime,
    scheduleDensity: decision.scheduleDensity ?? draft.scheduleDensity,
    densitySpecified: decision.scheduleDensity ? true : draft.densitySpecified,
    homeByTime: safeTime(decision.homeByTime) ?? draft.homeByTime,
    homeTravelMinutes: decision.homeTravelMinutes != null && decision.homeTravelMinutes >= 0 && decision.homeTravelMinutes <= 300 ? Math.round(decision.homeTravelMinutes) : draft.homeTravelMinutes,
    preferences: unique([...(draft.preferences ?? []), ...decision.preferences, ...memory.preferences]),
    constraints: unique([...(draft.constraints ?? []), ...decision.constraints, ...memory.constraints]),
    desiredMoods: Array.from(new Set([...(draft.desiredMoods ?? []), ...decision.desiredMoods.filter((mood) => MOODS.includes(mood))])),
    requestedCategories: Array.from(new Set([...(draft.requestedCategories ?? []), ...decision.requestedCategories.filter((category) => CATEGORIES.includes(category))])),
    excludedCategories: Array.from(new Set([...(draft.excludedCategories ?? []), ...decision.excludedCategories.filter((category) => CATEGORIES.includes(category))])),
    explicitUnknowns: unique([...(draft.explicitUnknowns ?? []), ...decision.explicitUnknowns]),
    personMemoryUpdate: memory,
  };
}

function substantivePreference(draft: PlanRequest): boolean {
  const lodgingOnlyPreference = (value: string) => Boolean(
    draft.lodgingPreference
    && value === "야경"
    && /오션|바다|시티|야경|뷰/.test(draft.lodgingPreference),
  );
  const lodgingOnlyMood = (value: ExperienceMood) => Boolean(
    draft.lodgingPreference
    && value === "nature"
    && /오션|바다|뷰/.test(draft.lodgingPreference),
  );
  return Boolean(
    draft.preferences?.some((value) => !/차량 없이|주차 가능/.test(value) && !lodgingOnlyPreference(value))
    || draft.desiredMoods?.some((value) => !lodgingOnlyMood(value))
    || draft.personProfile?.preferences.length
    || draft.explicitUnknowns?.includes("preference"),
  );
}

export function missingPlanningQuestions(draft: PlanRequest): Exclude<PlanningQuestionKey, null>[] {
  const situation = parseSituation(draft);
  if (situation.planScope === "single") {
    const isGiftLike = ["gift", "flower", "cake"].includes(draft.singleCategory ?? "");
    const questions: Exclude<PlanningQuestionKey, null>[] = [];
    if (isGiftLike && !draft.recipient) questions.push("recipient");
    if (!draft.region || regionNeedsNarrowing(draft)) questions.push("region");
    if (situation.requestKind === "reservation" && !draft.targetDate) questions.push("date");
    if (!draft.budget) questions.push("budget");
    if (!substantivePreference(draft)) questions.push("preference");
    return questions;
  }
  if (situation.planScope === "trip") {
    return [
      !draft.tripDays ? "tripLength" : null,
      !draft.targetDate ? "date" : null,
      !draft.region ? "region" : null,
      !draft.budget ? "budget" : null,
      !draft.transport ? "transport" : null,
      situation.needsLodging && !draft.lodgingPreference ? "lodgingPreference" : null,
      !substantivePreference(draft) ? "preference" : null,
      (draft.tripDays ?? 0) >= 3 && !draft.explicitUnknowns?.includes("mustHave") && !(draft.preferences ?? []).some((value) => /꼭|반드시/.test(value)) ? "mustHave" : null,
      !draft.arrivalTime ? "arrivalTime" : null,
      !draft.returnDepartureTime ? "returnTime" : null,
    ].filter((value): value is Exclude<PlanningQuestionKey, null> => Boolean(value));
  }
  const needsAvailabilityWindow = /놀\s*(거야|려고|예정)|데이트.{0,8}(거야|예정)|하루\s*종일|반나절/.test(draft.request) && !draft.availabilityEndTime;
  return [
    !draft.recipient ? "recipient" : null,
    !draft.targetDate ? "date" : null,
    !draft.region ? "region" : null,
    needsAvailabilityWindow ? "availabilityTime" : null,
    !draft.budget ? "budget" : null,
    !draft.transport ? "transport" : null,
    !substantivePreference(draft) ? "preference" : null,
    draft.availabilityEndTime && !draft.densitySpecified ? "density" : null,
  ].filter((value): value is Exclude<PlanningQuestionKey, null> => Boolean(value));
}

function question(key: Exclude<PlanningQuestionKey, null>, draft: PlanRequest): { reply: string; quickReplies: string[] } {
  const recipient = parseSituation(draft).recipient;
  if (key === "recipient") {
    if (draft.planScope === "single" && ["gift", "flower", "cake"].includes(draft.singleCategory ?? "")) {
      return { reply: "누구에게 줄 거야? 받는 사람을 알려주면 그 사람 취향에 맞게 찾아볼게.", quickReplies: ["여자친구", "부모님", "친구"] };
    }
    return { reply: "좋아! 이번 하루는 누구와 함께 보내고 싶어?", quickReplies: ["혼자예요", "여자친구와 둘이요", "친구들과 가요"] };
  }
  if (key === "tripLength") return { reply: "좋지, 제대로 여행으로 짜볼게. 며칠 정도 갈 생각이야?", quickReplies: ["당일치기", "1박 2일", "2박 3일"] };
  if (key === "date") return { reply: "언제로 생각하고 있어? 날짜를 아직 못 정했다면 이번 주말처럼 말해도 돼.", quickReplies: ["오늘", "이번 토요일", "일주일 뒤"] };
  if (key === "departure") return { reply: "어디에서 출발해? 출발 시간까지 무리 없게 맞춰볼게.", quickReplies: ["서울에서 출발", "인천에서 출발", "부산에서 출발"] };
  if (key === "region") {
    if (draft.region && BROAD_REGIONS.includes(draft.region)) {
      return { reply: `${draft.region}${topicParticle(draft.region)} 넓어서 그런데, 좀 더 좁혀서 말해줄 수 있어? 동네나 역 이름 정도면 충분해. 지금 있는 곳 근처가 좋은지, 가려는 곳 근처가 좋은지도 알려줘.`, quickReplies: [] };
    }
    return { reply: "어느 지역에서 찾을까? 지금 있는 곳 근처인지, 가려는 곳 근처인지도 함께 알려줘.", quickReplies: ["성수 쪽", "지금 있는 곳 근처", "제주"] };
  }
  if (key === "partySize") return { reply: "모두 몇 명이 함께 가? 좌석과 비용을 인원에 맞출게.", quickReplies: ["둘이 가요", "3명이에요", "4명이에요"] };
  if (key === "budget") return { reply: draft.planScope === "trip" ? "숙소와 이동까지 포함해서 전체 예산은 어느 정도로 볼까?" : "예산은 어느 정도로 생각해? 그 안에서 제일 좋은 걸로 찾아볼게.", quickReplies: ["15만원 안으로", "30만원 정도", "숙소까지 100만원"] };
  if (key === "preference") {
    if (draft.planScope === "single") {
      return { reply: "어떤 스타일이나 분위기가 좋아? 로맨틱하게, 심플하게, 고급스럽게처럼 떠오르는 대로 말해줘.", quickReplies: ["로맨틱하고 감성적으로", "고급스럽고 특별하게", "실용적이고 심플하게"] };
    }
    return { reply: `${recipient}와 어떤 느낌으로 보내고 싶어? 힐링, 액티비티, 전시, 맛있는 음식처럼 떠오르는 것만 말해줘.`, quickReplies: ["힐링과 액티비티 둘 다", "신비롭고 이색적으로", "조용하고 로맨틱하게"] };
  }
  if (key === "lodgingPreference") return { reply: "숙소에서 가장 중요한 건 뭐야? 뷰, 위치, 조용함처럼 한 가지만 말해줘도 돼.", quickReplies: ["오션뷰", "위치와 청결", "조용한 감성 숙소"] };
  if (key === "arrivalTime") return { reply: "첫날 도착은 몇 시쯤이야? 도착 직후부터 무리 없게 짤게.", quickReplies: ["오전 11시", "오후 3시", "아직 몰라"] };
  if (key === "returnTime") return { reply: "마지막 날 돌아가는 비행기나 기차는 몇 시쯤이야? 공항·역 이동 시간도 비워둘게.", quickReplies: ["오후 3시", "오후 6시", "아직 몰라"] };
  if (key === "mustHave") return { reply: "이번 여행에서 꼭 넣고 싶은 게 하나라도 있어? 없다면 없다고 말해도 좋아.", quickReplies: ["딱히 꼭 하고 싶은 건 없어", "바다는 꼭 보고 싶어", "맛있는 식사는 꼭"] };
  if (key === "availabilityTime") return { reply: "몇 시부터 몇 시 정도 함께 놀 수 있어? 실제 귀가 이동까지 그 안에 맞출게.", quickReplies: ["오후 2시부터 10시", "저녁 5시부터 10시", "3시간 정도"] };
  if (key === "density") return { reply: "좋아. 여기저기 알차게 다닐까, 아니면 중간중간 여유 있게 놀까?", quickReplies: ["알차게", "여유롭게", "적당히 균형 있게"] };
  return { reply: "이동은 어떻게 할 생각이야? 차가 없다면 대중교통과 도보가 자연스럽게 이어지게 맞출게.", quickReplies: ["차 없어요", "렌터카", "대중교통 위주"] };
}

export async function continuePlanningConversation(params: {
  messages: PlanningChatMessage[];
  draft?: Partial<PlanRequest>;
  currentQuestion?: PlanningQuestionKey;
}): Promise<PlanningConversationResult> {
  let draft = applyDeterministicConversation(params.messages, params.draft ?? {}, params.currentQuestion);
  const decision = await structuredDecision(params.messages, draft);
  if (decision) draft = mergeStructuredDecision(draft, decision);
  draft.request = params.messages.filter((message) => message.role === "user").map((message) => message.text.trim()).filter(Boolean).join("\n");
  draft.intakeConversation = params.messages;
  if (draft.planScope === "trip" && draft.tripDays && draft.tripNights == null) draft.tripNights = Math.max(0, draft.tripDays - 1);
  if ((draft.tripNights ?? 0) > 0) {
    draft.checkInTime ??= "15:00";
    draft.checkOutTime ??= "11:00";
  }

  const understanding = analyzeSituation(draft);
  const missing = missingPlanningQuestions(draft);
  const modelChoice = decision?.nextQuestionKey && missing.includes(decision.nextQuestionKey as Exclude<PlanningQuestionKey, null>) ? decision.nextQuestionKey : null;
  const questionKey = modelChoice ?? missing[0] ?? null;
  if (questionKey) {
    const fallback = question(questionKey, draft);
    const useModelReply = decision?.reply?.trim() && decision?.nextQuestionKey === questionKey;
    return {
      draft,
      understanding,
      reply: useModelReply ? decision.reply.trim().slice(0, 240) : fallback.reply,
      ready: false,
      questionKey,
      quickReplies: fallback.quickReplies,
      decisionSource: decision ? "structured_ai" : "deterministic_fallback",
    };
  }

  const situation = understanding.situation;
  const categoryLabel = situation.singleCategory ? { meal: "식당", cafe: "카페", flower: "꽃", gift: "선물", cake: "케이크", activity: "경험", view: "전망", lodging: "숙소", moment: "준비" }[situation.singleCategory] : "후보";
  const summary = situation.planScope === "trip"
    ? `${situation.tripNights ?? 0}박 ${situation.tripDays ?? 1}일 동안 도착부터 돌아가는 시간까지`
    : situation.planScope === "single" ? `요청한 ${categoryLabel}만`
      : "하루 전체 흐름을";
  return {
    draft,
    understanding,
    reply: `좋아, 필요한 내용은 충분히 이해했어. ${summary} 실제 장소·시간·예산에 맞춰볼게.`,
    ready: true,
    questionKey: null,
    quickReplies: [],
    decisionSource: decision ? "structured_ai" : "deterministic_fallback",
  };
}
