import "server-only";

import { openAiTextCompletion } from "@/lib/openai-chat";
import { analyzeSituation, parseSituation } from "./situation";
import type { ExperienceMood, PlanRequest, PlanningChatMessage, PlanningConversationResult, PlanningQuestionKey, TransportMode } from "./types";

const REGIONS = ["성수", "강남", "홍대", "연남", "여의도", "잠실", "광화문", "종로", "용산", "이태원", "서울", "인천", "수원", "성남", "분당", "가평", "춘천", "강릉", "속초", "전주", "여수", "경주", "부산", "대구", "대전", "광주", "제주"];
const MOODS: ExperienceMood[] = ["romantic", "mysterious", "trendy", "calm", "luxurious", "playful", "warm", "nature", "artistic", "hidden"];

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function nextSaturday(): string {
  const date = new Date();
  const distance = (6 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + distance);
  return localDate(date);
}

function budgetIn(text: string): number | undefined {
  const manwon = text.match(/(\d{1,3})\s*만\s*원?/);
  if (manwon) return Math.max(50_000, Math.min(2_000_000, Number(manwon[1]) * 10_000));
  const won = text.match(/(?:\d{1,3}(?:,\d{3})+|\d{5,7})\s*원/);
  return won ? Math.max(50_000, Math.min(2_000_000, Number(won[0].replace(/\D/g, "")))) : undefined;
}

function hasDate(text: string): boolean {
  return /오늘|내일|모레|(?:이번|다음|다다음)\s*(?:주|주말)|주말|(?:이번|다음|다다음)?\s*(?:주\s*)?(?:월|화|수|목|금|토|일)요일|(?:\d{4}[.\-/년]\s*)?\d{1,2}[.\-/월]\s*\d{1,2}일?/.test(text);
}

function hasPartySize(text: string): boolean {
  return /\d{1,2}\s*명|혼자|둘이|두\s*명|셋이|세\s*명|넷이|네\s*명/.test(text);
}

function partySizeIn(text: string): number | undefined {
  if (/혼자/.test(text)) return 1;
  if (/둘이|두\s*명/.test(text)) return 2;
  if (/셋이|세\s*명/.test(text)) return 3;
  if (/넷이|네\s*명/.test(text)) return 4;
  const match = text.match(/(\d{1,2})\s*명/);
  return match ? Math.max(1, Math.min(12, Number(match[1]))) : undefined;
}

function regionIn(text: string): string | undefined {
  return REGIONS.find((region) => text.includes(region));
}

function isUndecided(text: string): boolean {
  return /모르겠|정한.{0,4}없|아무거나|추천해|추천해줘|맡길|상관없|알아서/.test(text);
}

function substantivePreference(values: string[]): boolean {
  return values.some((value) => /전시|공연|체험|카페|소품|음식|한식|일식|파스타|고기|디저트|꽃|향수|정원|바다|야경|조용|신비|몽환|재밌|활동|로맨틱|고급|자연|사진/.test(value));
}

function destinationFor(draft: PlanRequest): string {
  const parsed = parseSituation(draft);
  if (parsed.planScope === "trip") {
    if (draft.departureRegion === "서울" || !draft.departureRegion) return parsed.tripDays && parsed.tripDays >= 3 ? "강릉" : "가평";
    return draft.departureRegion === "부산" ? "경주" : "서울";
  }
  if (parsed.desiredMoods.includes("playful") || parsed.desiredMoods.includes("trendy")) return "성수";
  if (parsed.desiredMoods.includes("artistic") || parsed.desiredMoods.includes("calm")) return "종로";
  if (parsed.desiredMoods.includes("romantic") || parsed.desiredMoods.includes("mysterious")) return "용산";
  return "서울";
}

function parseJson(value: string): Record<string, unknown> | null {
  const cleaned = value.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function aiUpdates(messages: PlanningChatMessage[], draft: PlanRequest): Promise<Partial<PlanRequest>> {
  if (!process.env.OPENAI_API_KEY?.trim()) return {};
  try {
    const response = await openAiTextCompletion({
      timeoutMs: 7_000,
      temperature: 0.05,
      messages: [
        {
          role: "system",
          content: `너는 한국어 실행형 여행·하루 컨시어지의 정보 추출기다. 명령어 일치가 아니라 전체 대화의 뜻을 읽는다. 오늘은 ${localDate(new Date())}다. JSON만 반환한다. 사용자가 말하지 않은 사실은 만들지 않는다. 가능한 키: recipient, region, departureRegion, budget(원), targetDate(YYYY-MM-DD), partySize, transport(public_transit/car/walking/unknown), ageBand, preferences(문자열 배열), constraints(문자열 배열), desiredMoods(romantic/mysterious/trendy/calm/luxurious/playful/warm/nature/artistic/hidden 배열), planScope(single/day/trip), tripDays, tripNights, checkInTime(HH:mm), checkOutTime(HH:mm). 사용자가 당일치기라고 하면 tripDays=1, tripNights=0이다. 1박2일이면 tripDays=2, tripNights=1이다. 모른다거나 추천해달라는 답은 해당 키를 생략한다.`,
        },
        { role: "user", content: `현재까지 구조화한 값: ${JSON.stringify(draft)}\n대화:\n${messages.map((message) => `${message.role}: ${message.text}`).join("\n")}` },
      ],
    });
    const json = parseJson(response);
    if (!json) return {};
    const result: Partial<PlanRequest> = {};
    if (typeof json.recipient === "string") result.recipient = json.recipient.slice(0, 30);
    if (typeof json.region === "string") result.region = json.region.slice(0, 40);
    if (typeof json.departureRegion === "string") result.departureRegion = json.departureRegion.slice(0, 40);
    if (typeof json.budget === "number" && json.budget >= 50_000 && json.budget <= 2_000_000) result.budget = Math.round(json.budget);
    if (typeof json.targetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(json.targetDate)) result.targetDate = json.targetDate;
    if (typeof json.partySize === "number" && json.partySize >= 1 && json.partySize <= 12) result.partySize = Math.round(json.partySize);
    if (typeof json.transport === "string" && ["public_transit", "car", "walking", "unknown"].includes(json.transport)) result.transport = json.transport as TransportMode;
    if (typeof json.planScope === "string" && ["single", "day", "trip"].includes(json.planScope)) result.planScope = json.planScope as PlanRequest["planScope"];
    if (typeof json.tripDays === "number") result.tripDays = Math.max(1, Math.min(14, Math.round(json.tripDays)));
    if (typeof json.tripNights === "number") result.tripNights = Math.max(0, Math.min(13, Math.round(json.tripNights)));
    if (typeof json.checkInTime === "string" && /^\d{2}:\d{2}$/.test(json.checkInTime)) result.checkInTime = json.checkInTime;
    if (typeof json.checkOutTime === "string" && /^\d{2}:\d{2}$/.test(json.checkOutTime)) result.checkOutTime = json.checkOutTime;
    if (typeof json.ageBand === "string" && ["10대", "20대", "30대", "40대", "50대", "60대 이상", "미상"].includes(json.ageBand)) result.ageBand = json.ageBand as PlanRequest["ageBand"];
    if (Array.isArray(json.preferences)) result.preferences = json.preferences.filter((value): value is string => typeof value === "string").slice(0, 12);
    if (Array.isArray(json.constraints)) result.constraints = json.constraints.filter((value): value is string => typeof value === "string").slice(0, 12);
    if (Array.isArray(json.desiredMoods)) result.desiredMoods = json.desiredMoods.filter((value): value is ExperienceMood => typeof value === "string" && MOODS.includes(value as ExperienceMood));
    return result;
  } catch {
    return {};
  }
}

function question(key: Exclude<PlanningQuestionKey, null>, draft: PlanRequest): { reply: string; quickReplies: string[] } {
  const recipient = parseSituation(draft).recipient;
  if (key === "recipient") return { reply: "좋아요. 이번 하루는 누구와 함께 보내세요? 혼자여도 좋고, 상대방과의 관계만 편하게 말해 주세요.", quickReplies: ["혼자예요", "여자친구와 둘이요", "친구들과 가요"] };
  if (key === "tripLength") return { reply: "이번에는 당일치기로 다녀오고 싶으세요, 아니면 숙소가 있는 여행이 좋아요? 숙박이라면 몇 박인지 편하게 말해 주세요.", quickReplies: ["당일치기", "1박 2일", "2박 3일"] };
  if (key === "date") return { reply: "언제 떠나거나 만나실 예정인가요? 날짜를 아직 못 정했다면 ‘이번 주말로 추천해줘’라고 해도 괜찮아요.", quickReplies: ["오늘", "이번 토요일", "이번 주말로 추천해줘"] };
  if (key === "departure") return { reply: "어디에서 출발하세요? 출발지만 알려주시면 이동 시간이 무리 없는 여행지까지 제가 골라볼게요.", quickReplies: ["서울에서 출발해요", "인천에서 출발해요", "부산에서 출발해요"] };
  if (key === "region") return { reply: "어느 지역에서 보내고 싶으세요? 아직 정한 곳이 없다면 지금 계신 지역을 말해 주세요. 그 안에서 가장 잘 맞는 동네를 제가 추천할게요.", quickReplies: ["서울 안에서 추천해줘", "성수 쪽이 좋아요", "지역도 온이에게 맡길게요"] };
  if (key === "partySize") return { reply: "함께 가는 분은 모두 몇 명인가요? 인원에 맞춰 좌석과 숙소 방 구성을 확인할게요.", quickReplies: ["둘이 가요", "3명이에요", "4명이에요"] };
  if (key === "budget") return { reply: "전체 예산은 어느 정도로 생각하세요? 아직 모르겠다면 ‘적당한 선으로 추천해줘’라고 해도 돼요. 교통과 숙소가 있으면 모두 포함해서 맞출게요.", quickReplies: ["20만원 정도", "30만원 안으로", "적당한 선으로 추천해줘"] };
  if (key === "preference") return { reply: `${recipient}분이 좋아하는 음식이나 분위기, 해보고 싶어 한 것이 있나요? 생각나는 것만 말해 주세요. 잘 모르겠다면 제가 특별한 쪽으로 제안할게요.`, quickReplies: ["신비롭고 이색적으로", "재밌고 활동적으로", "조용하고 분위기 좋게"] };
  if (key === "lodgingPreference") return { reply: "숙소는 어떤 느낌이 좋으세요? 바다·야경 같은 전망, 조용함, 감성적인 공간, 위치 편한 곳처럼 중요하게 볼 것을 하나만 말해 주세요.", quickReplies: ["감성적이고 조용한 곳", "뷰가 좋은 곳", "위치와 청결이 우선"] };
  return { reply: "이동은 어떻게 하실 예정인가요? 차가 없다면 대중교통과 도보가 자연스럽게 이어지는 동선으로 맞출게요.", quickReplies: ["차 없어요", "자차로 가요", "대중교통 위주로"] };
}

export async function continuePlanningConversation(params: {
  messages: PlanningChatMessage[];
  draft?: Partial<PlanRequest>;
  currentQuestion?: PlanningQuestionKey;
}): Promise<PlanningConversationResult> {
  const userTexts = params.messages.filter((message) => message.role === "user").map((message) => message.text.trim()).filter(Boolean);
  const latest = userTexts.at(-1) ?? "";
  const fullText = userTexts.join("\n");
  const parsed = parseSituation({ request: fullText || "특별한 하루를 추천해줘" });
  let draft: PlanRequest = {
    request: fullText,
    ...params.draft,
    recipient: params.draft?.recipient ?? (parsed.recipient !== "함께할 사람" ? parsed.recipient : undefined),
    budget: params.draft?.budget ?? budgetIn(fullText),
    targetDate: params.draft?.targetDate ?? (hasDate(fullText) ? parsed.targetDate : undefined),
    partySize: params.draft?.partySize ?? partySizeIn(fullText),
    transport: params.draft?.transport ?? (parsed.transport !== "unknown" ? parsed.transport : undefined),
    desiredMoods: Array.from(new Set([...(params.draft?.desiredMoods ?? []), ...parsed.desiredMoods])),
    preferences: Array.from(new Set([...(params.draft?.preferences ?? []), ...parsed.preferences])),
    constraints: Array.from(new Set([...(params.draft?.constraints ?? []), ...parsed.constraints])),
    planScope: params.draft?.planScope ?? (/(여행|숙소|항공|렌터카|떠나|놀러\s*가)/.test(fullText) ? "trip" : parsed.planScope),
    tripDays: params.draft?.tripDays ?? parsed.tripDays,
    tripNights: params.draft?.tripNights ?? parsed.tripNights,
  };

  const foundRegion = regionIn(latest) ?? regionIn(fullText);
  if (params.currentQuestion === "departure" && foundRegion) draft.departureRegion = foundRegion;
  else if (!draft.region && foundRegion) draft.region = foundRegion;
  const updates = await aiUpdates(params.messages, draft);
  draft = {
    ...draft,
    ...updates,
    request: fullText,
    preferences: Array.from(new Set([...(draft.preferences ?? []), ...(updates.preferences ?? [])])),
    constraints: Array.from(new Set([...(draft.constraints ?? []), ...(updates.constraints ?? [])])),
    desiredMoods: Array.from(new Set([...(draft.desiredMoods ?? []), ...(updates.desiredMoods ?? [])])),
  };

  if (params.currentQuestion && isUndecided(latest)) {
    if (params.currentQuestion === "date") draft.targetDate = nextSaturday();
    if (params.currentQuestion === "tripLength") Object.assign(draft, { planScope: "trip", tripDays: 2, tripNights: 1 });
    if (params.currentQuestion === "region") draft.region = destinationFor(draft);
    if (params.currentQuestion === "budget") draft.budget = draft.planScope === "trip" ? 600_000 : 250_000;
    if (params.currentQuestion === "preference") {
      draft.preferences = Array.from(new Set([...(draft.preferences ?? []), "쉽게 찾기 어려운 특별한 경험"]));
      draft.desiredMoods = Array.from(new Set([...(draft.desiredMoods ?? []), "hidden", "playful"]));
    }
    if (params.currentQuestion === "lodgingPreference") draft.preferences = Array.from(new Set([...(draft.preferences ?? []), "숙소는 조용하고 위치 좋은 감성 공간"]));
    if (params.currentQuestion === "transport") draft.transport = "public_transit";
  }
  if (params.currentQuestion === "preference" && latest && !isUndecided(latest)) {
    draft.preferences = Array.from(new Set([...(draft.preferences ?? []), latest]));
  }
  if (params.currentQuestion === "lodgingPreference" && latest && !isUndecided(latest)) {
    draft.preferences = Array.from(new Set([...(draft.preferences ?? []), `숙소 취향: ${latest}`]));
  }
  if (params.currentQuestion === "region" && isUndecided(latest)) draft.region = destinationFor(draft);
  if (params.currentQuestion === "departure" && !draft.departureRegion && foundRegion) draft.departureRegion = foundRegion;
  if (draft.planScope === "trip" && draft.tripDays && draft.tripNights == null) draft.tripNights = Math.max(0, draft.tripDays - 1);
  if ((draft.tripNights ?? 0) > 0) {
    draft.checkInTime ??= "15:00";
    draft.checkOutTime ??= "11:00";
  }

  const situation = parseSituation(draft);
  const tripMention = /(여행|숙소|항공|렌터카|떠나|놀러\s*가)/.test(fullText);
  const asksUsToChooseStay = /당일치기인지|당일치기.{0,18}숙박.{0,18}(추천|모르|고민)|숙박.{0,18}당일치기.{0,18}(추천|모르|고민)/.test(fullText);
  const tripLengthKnown = !asksUsToChooseStay && (draft.tripDays != null || /당일치기|\d+\s*박/.test(fullText));
  const recipientKnown = situation.planScope === "single" || Boolean(draft.recipient && draft.recipient !== "함께할 사람");
  const profileTastes = situation.personProfile ? [...situation.personProfile.preferences, ...situation.personProfile.hobbies] : [];
  const preferenceKnown = substantivePreference([...(draft.preferences ?? []), ...profileTastes]) || situation.recipient === "함께할 사람";
  const lodgingPreferenceKnown = !situation.needsLodging || (draft.preferences ?? []).some((value) => /숙소|호텔|펜션|뷰|청결|위치|감성/.test(value));
  let questionKey: PlanningQuestionKey = null;
  if (!recipientKnown) questionKey = "recipient";
  else if (tripMention && !tripLengthKnown) questionKey = "tripLength";
  else if (!draft.targetDate) questionKey = "date";
  else if (draft.planScope === "trip" && !draft.departureRegion) questionKey = "departure";
  else if (!draft.region) questionKey = "region";
  else if (situation.recipient === "친구" && !hasPartySize(fullText) && !draft.partySize) questionKey = "partySize";
  else if (situation.planScope !== "single" && !draft.budget) questionKey = "budget";
  else if (!preferenceKnown) questionKey = "preference";
  else if (!lodgingPreferenceKnown) questionKey = "lodgingPreference";
  else if (situation.planScope !== "single" && !draft.transport) questionKey = "transport";

  const understanding = analyzeSituation(draft);
  if (questionKey) {
    const next = question(questionKey, draft);
    return { draft, understanding, reply: next.reply, ready: false, questionKey, quickReplies: next.quickReplies };
  }
  const tripSummary = situation.planScope === "trip"
    ? `${situation.tripNights ?? 0}박 ${situation.tripDays ?? 1}일 일정과 ${situation.needsLodging ? `${situation.checkInTime} 체크인 숙소` : "당일 동선"}`
    : situation.planScope === "single" ? "요청한 장소 하나" : "하루 전체 흐름";
  return {
    draft,
    understanding,
    reply: `좋아요. 필요한 내용은 충분히 이해했어요. ${tripSummary}, 실제 장소, 이동시간과 예산을 함께 맞춰볼게요.`,
    ready: true,
    questionKey: null,
    quickReplies: [],
  };
}
