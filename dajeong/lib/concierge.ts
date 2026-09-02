import "server-only";

import { openAiStructuredCompletion, type OpenAiJsonSchema } from "@/lib/openai-chat";
import { getOptions } from "./catalog";
import { discoverOptionsForItem, enrichDajeongPlanWithRealPlaces } from "./place-discovery";
import { attachCuratedReality, haversineKm, travelMinutes } from "./place-utils";
import { appendPlanConversation, appendPlanVersion, buildPlanLogistics, restorePlanVersion, restoreReferencedCandidate, reviseDajeongPlan } from "./plan-engine";
import { parseSituation } from "./situation";
import { buildExperienceFlow } from "./experience";
import { handleExecutionInstruction } from "./execution-conversation";
import { reconcileReservationOrder } from "./reservation-engine";
import { scheduleDajeongPlan, setItemDuration, weatherContextFromUser } from "./schedule-engine";
import { enrichPlanWithWeather } from "./weather";
import { applyDelayReport, applyLeaveEarly, applySkipNext, applyStayLonger, DELAY_PATTERN, LEAVE_EARLY_PATTERN, SKIP_NEXT_PATTERN, STAY_LONGER_PATTERN } from "./live-engine";
import { applySecrecyInstruction } from "./secrecy-actions";
import { classifyPaceFeedback } from "./pace";
import type { DajeongPlan, PersonMemoryUpdate, PlanCategory, PlanChangeProposal, PlanItem, PlanOption, PlanRevisionResult } from "./types";

type ConciergeAction = "replace" | "add" | "remove" | "cheaper" | "indoor" | "reorder" | "refine" | "reschedule" | "explain" | "execute" | "payment_review";

export type ConciergeIntent = {
  action: ConciergeAction;
  targetCategory: PlanCategory | null;
  searchQuery: string;
  preferences: string[];
  constraints: string[];
  updates: {
    budget?: number;
    region?: string;
    targetDate?: string;
    transport?: DajeongPlan["situation"]["transport"];
    recipient?: string;
    scheduleDensity?: "compact" | "balanced" | "relaxed";
    availabilityStartTime?: string;
    availabilityEndTime?: string;
    homeByTime?: string;
    durationMinutes?: number;
    bufferAfterMinutes?: number;
    lockPlace?: boolean;
    lockTime?: boolean;
    temporaryCondition?: "tired" | "walking_limited";
  };
};

const CATEGORY_LABEL: Record<PlanCategory, string> = {
  activity: "경험",
  cafe: "카페",
  meal: "저녁 식사",
  view: "야경",
  lodging: "숙소",
  cake: "케이크",
  flower: "꽃",
  gift: "소품샵·선물",
  moment: "마음 한 조각",
};

const VALID_CATEGORIES = new Set<PlanCategory>(["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift", "moment"]);
const VALID_ACTIONS = new Set<ConciergeAction>(["replace", "add", "remove", "cheaper", "indoor", "reorder", "refine", "reschedule", "explain", "execute", "payment_review"]);

const CONCIERGE_INTENT_SCHEMA: OpenAiJsonSchema = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["replace", "add", "remove", "cheaper", "indoor", "reorder", "refine", "reschedule", "explain", "execute", "payment_review"] },
    targetCategory: { anyOf: [{ type: "string", enum: ["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift", "moment"] }, { type: "null" }] },
    searchQuery: { type: "string" },
    preferences: { type: "array", items: { type: "string" } },
    constraints: { type: "array", items: { type: "string" } },
    updates: {
      type: "object",
      properties: {
        budget: { anyOf: [{ type: "number" }, { type: "null" }] },
        region: { anyOf: [{ type: "string" }, { type: "null" }] },
        targetDate: { anyOf: [{ type: "string" }, { type: "null" }] },
        transport: { anyOf: [{ type: "string", enum: ["public_transit", "car", "walking", "unknown"] }, { type: "null" }] },
        recipient: { anyOf: [{ type: "string" }, { type: "null" }] },
        scheduleDensity: { anyOf: [{ type: "string", enum: ["compact", "balanced", "relaxed"] }, { type: "null" }] },
        availabilityStartTime: { anyOf: [{ type: "string" }, { type: "null" }] },
        availabilityEndTime: { anyOf: [{ type: "string" }, { type: "null" }] },
        homeByTime: { anyOf: [{ type: "string" }, { type: "null" }] },
        durationMinutes: { anyOf: [{ type: "number" }, { type: "null" }] },
        bufferAfterMinutes: { anyOf: [{ type: "number" }, { type: "null" }] },
        lockPlace: { anyOf: [{ type: "boolean" }, { type: "null" }] },
        lockTime: { anyOf: [{ type: "boolean" }, { type: "null" }] },
        temporaryCondition: { anyOf: [{ type: "string", enum: ["tired", "walking_limited"] }, { type: "null" }] },
      },
      required: ["budget", "region", "targetDate", "transport", "recipient", "scheduleDensity", "availabilityStartTime", "availabilityEndTime", "homeByTime", "durationMinutes", "bufferAfterMinutes", "lockPlace", "lockTime", "temporaryCondition"],
      additionalProperties: false,
    },
  },
  required: ["action", "targetCategory", "searchQuery", "preferences", "constraints", "updates"],
  additionalProperties: false,
};

function explicitCategory(instruction: string): PlanCategory | null {
  const focus = instruction.match(/(?:그대로|유지)[^,.!?]*(?:두고|하고)\s*(.+)$/)?.[1] ?? instruction;
  return /소품|편집샵|독립서점|선물/.test(focus) ? "gift"
    : /식당|저녁|식사|밥|매운|맵지|한식|일식|중식|양식|파스타|고기|채식|비건|맛있/.test(focus) ? "meal"
      : /카페|커피|디저트|빵|베이커리/.test(focus) ? "cafe"
        : /숙소|호텔|펜션|체크인|숙박/.test(focus) ? "lodging"
        : /야경|전망/.test(focus) ? "view"
          : /케이크/.test(focus) ? "cake"
            : /꽃/.test(focus) ? "flower"
              : /전시|체험|클래스|놀거리|활동|공연|뮤지컬|연극/.test(focus) ? "activity"
                : /편지|카드|마음/.test(focus) ? "moment"
                  : null;
}

function categoryFromConversation(plan: DajeongPlan, instruction: string, requestedCategory?: PlanCategory): PlanCategory | null {
  if (requestedCategory) return requestedCategory;
  const explicit = explicitCategory(instruction);
  if (explicit) return explicit;
  const compact = instruction.replace(/\s+/g, "");
  const named = plan.items.find((item) => compact.includes(item.title.replace(/\s+/g, "")));
  if (named) return named.category;
  if (/첫\s*(?:번째)?|처음/.test(instruction)) return plan.items[0]?.category ?? null;
  if (/두\s*번째|2\s*번째/.test(instruction)) return plan.items[1]?.category ?? null;
  if (/세\s*번째|3\s*번째/.test(instruction)) return plan.items[2]?.category ?? null;
  if (/네\s*번째|4\s*번째/.test(instruction)) return plan.items[3]?.category ?? null;
  if (/마지막|맨\s*끝/.test(instruction)) return plan.items.at(-1)?.category ?? null;
  const timeMatch = instruction.match(/(\d{1,2})(?::(\d{2}))?\s*시/);
  if (timeMatch) {
    const hour = Number(timeMatch[1]);
    const minute = timeMatch[2] ?? "00";
    const found = plan.items.find((item) => item.time === `${String(hour).padStart(2, "0")}:${minute}`
      || item.time === `${String(hour + (hour < 12 && /오후|저녁/.test(instruction) ? 12 : 0)).padStart(2, "0")}:${minute}`);
    if (found) return found.category;
  }
  if (/여기|거기|그곳|저곳|이곳|이거|그거|그 일정|아까|방금|말고|대신/.test(instruction)) {
    return plan.revisions?.[0]?.changedCategories?.[0] ?? null;
  }
  return null;
}

function fallbackIntent(plan: DajeongPlan, instruction: string, requestedCategory?: PlanCategory): ConciergeIntent {
  const category = categoryFromConversation(plan, instruction, requestedCategory);
  const action: ConciergeAction = /시간.{0,8}(짧|길|늘|널널)|오래\s*(있|머물)|알차게|여유롭게|피곤|까지\s*(집|귀가)|꼭\s*(가|유지)/.test(instruction) ? "reschedule"
    : /(?:결제|구매).{0,8}(?:해|하자|진행|할게)/.test(instruction) ? "payment_review"
    : /예약.{0,10}(?:해|부탁|진행|잡|원해)|예매.{0,10}(?:해|부탁|진행|원해)|주문.{0,10}(?:해|부탁|진행|원해)/.test(instruction) ? "execute"
      : /왜|이유|설명|어떤 곳|뭐가 좋|어때|어디|주소|위치|얼마|몇 시|언제|평점|리뷰|(?:가격|비용|예산).{0,6}(확실|맞|알려|어떻|남)|시간.{0,5}(알려|어떻)|예약.{0,5}(돼|가능|필요|알려)|영업.{0,5}(해|시간)/.test(instruction) ? "explain"
    : /빼|제외|없애|삭제/.test(instruction) ? "remove"
    : /싸게|저렴|예산.*줄|비용.*줄/.test(instruction) ? "cheaper"
      : /실내|비가|비 와|추워|더워/.test(instruction) ? "indoor"
        : /순서|동선/.test(instruction) ? "reorder"
          : category && /추가|넣|가고 싶|가고싶|찾아줘|찾아 줘|잡아줘|예약해/.test(instruction) ? "add"
            : /분위기|취향|붐비|한적|아늑|힙|세련|로컬|신비|몽환|로맨틱|재밌|특별|평범|고급|편안|따뜻|자연|숨은|와.{0,3}(할|소리)/.test(instruction) ? "refine"
              : "replace";
  const preferences = [
    /조용|대화하기 좋|시끄럽지 않/.test(instruction) ? "조용한 분위기" : null,
    /아늑|포근/.test(instruction) ? "아늑한 분위기" : null,
    /힙|트렌디|세련/.test(instruction) ? "세련되고 감각적인 분위기" : null,
    /고급|격식|우아/.test(instruction) ? "고급스럽고 특별한 분위기" : null,
    /사진|인스타|감성|예쁜/.test(instruction) ? "사진과 분위기 중요" : null,
    /맛있|맛집/.test(instruction) ? "맛과 리뷰가 검증된 곳" : null,
    /붐비|한적|사람.{0,4}(적|없)/.test(instruction) ? "붐비지 않고 여유로운 곳" : null,
    /로컬|동네.{0,4}(가게|맛집)|프랜차이즈.{0,5}(싫|제외)/.test(instruction) ? "로컬 독립 매장" : null,
    /신비|몽환|빛|미디어아트/.test(instruction) ? "신비롭고 몰입되는 경험" : null,
    /로맨틱|낭만/.test(instruction) ? "로맨틱한 분위기" : null,
    /재밌|신나|활동적/.test(instruction) ? "함께 즐기는 재미있는 경험" : null,
    /특별|평범하지|흔하지|와.{0,3}(할|소리)/.test(instruction) ? "쉽게 찾기 어려운 특별한 경험" : null,
    /정원|숲|자연/.test(instruction) ? "자연과 공간감이 느껴지는 곳" : null,
    /빠지|수상레저|웨이크보드|물놀이/.test(instruction) ? "수상레저와 가깝고 이동이 편한 곳" : null,
  ].filter((value): value is string => Boolean(value));
  const constraints = [
    /매운.{0,6}(못|안|싫)|맵지 않/.test(instruction) ? "맵지 않은 음식" : null,
    /알레르기|알러지/.test(instruction) ? "알레르기 확인" : null,
    /프랜차이즈|체인/.test(instruction) ? "프랜차이즈 제외" : null,
    /걷기|많이 걷|다리/.test(instruction) ? "도보 이동 최소화" : null,
  ].filter((value): value is string => Boolean(value));
  const budgetMatch = instruction.match(/(\d{1,3})\s*만\s*원?/);
  const region = ["강남", "성수", "홍대", "연남", "여의도", "잠실", "광화문", "종로", "용산", "이태원", "서울", "인천", "수원", "성남", "분당", "부산", "대구", "대전", "광주", "제주"].find((value) => instruction.includes(value));
  const transport = /(?:차|자차)(?:는|가)?\s*(?:없|없이)|운전(?:은|을)?\s*(?:못|안)|뚜벅|대중교통/.test(instruction) ? "public_transit" as const
    : /자차|운전|차로|택시/.test(instruction) ? "car" as const
      : /걸어서|도보/.test(instruction) ? "walking" as const
        : undefined;
  const dateMentioned = /오늘|내일|모레|(?:이번|다음|다다음) ?주|주말|(?:이번|다음|다다음)?\s*(?:주\s*)?(?:월|화|수|목|금|토|일)요일|\d{1,2}[.\-/월]\s*\d{1,2}일?/.test(instruction);
  const recipient = /남자친구/.test(instruction) ? "남자친구"
    : /여자친구/.test(instruction) ? "여자친구"
      : /남편/.test(instruction) ? "남편"
        : /아내/.test(instruction) ? "아내"
          : /엄마|어머니/.test(instruction) ? "어머니"
            : /아빠|아버지/.test(instruction) ? "아버지"
              : /부모님/.test(instruction) ? "부모님"
                : undefined;
  return {
    action,
    targetCategory: category,
    searchQuery: instruction,
    preferences,
    constraints,
    updates: {
      budget: budgetMatch ? Number(budgetMatch[1]) * 10_000 : undefined,
      region,
      targetDate: dateMentioned ? parseSituation({ request: instruction }).targetDate : undefined,
      transport,
      recipient,
      scheduleDensity: /여유|널널|천천히|쉬엄/.test(instruction) ? "relaxed" : /알차게|여기저기|꽉\s*차게/.test(instruction) ? "compact" : undefined,
      durationMinutes: durationMinutesInInstruction(instruction),
      bufferAfterMinutes: /바로\s*(다음|이동|가)|다음.{0,8}(쉬|휴식)/.test(instruction) ? 30 : undefined,
      lockPlace: /꼭\s*(가|유지)|무조건/.test(instruction) || undefined,
      lockTime: /시간.{0,8}(유지|꼭)/.test(instruction) || undefined,
      temporaryCondition: /발.{0,5}아프/.test(instruction) ? "walking_limited" : /피곤|컨디션.{0,5}(별로|안\s*좋)/.test(instruction) ? "tired" : undefined,
    },
  };
}

export async function interpretConciergeInstruction(
  plan: DajeongPlan,
  instruction: string,
  requestedCategory?: PlanCategory,
): Promise<ConciergeIntent> {
  const fallback = fallbackIntent(plan, instruction, requestedCategory);
  if (!process.env.OPENAI_API_KEY) return fallback;
  try {
    const parsed = await openAiStructuredCompletion<Record<string, unknown>>({
      name: "haruon_plan_action",
      schema: CONCIERGE_INTENT_SCHEMA,
      timeoutMs: 7_000,
      temperature: 0.05,
      messages: [
        {
          role: "system",
          content: "너는 실행형 개인 컨시어지의 대화 이해 엔진이다. 사용자가 정해진 명령어를 쓰지 않아도 문장 전체의 의미, 대명사, 부정 표현, 상대 취향, 유지할 조건과 바꿀 범위를 이해한다. 기존 대화와 일정이 문맥이다. 사용자가 요청하지 않은 일정은 보존한다. 체류시간·완충시간·일정 밀도·귀가시간·오늘 컨디션·고정 장소/시간 수정은 reschedule로 분류하고 정확한 updates를 채운다. 오늘 피곤하다는 말은 장기 취향이 아니라 temporaryCondition이다. 질문에는 일정을 바꾸지 말고 근거만 답한다. 장소명·가격·영업·예약 사실은 만들지 않는다. 특정 현재 후보를 실제로 예약·예매·주문해 달라는 요청은 execute, 결제해 달라는 요청은 payment_review다. 단순히 예약 가능 여부를 묻는 질문은 explain이다. 숙소를 찾아달라면 targetCategory=lodging, action=add다. updates에는 사용자가 이번 문장에서 바꾸라고 한 값만 넣고 나머지는 null로 둔다.",
        },
        {
          role: "user",
          content: `사용자 상황: ${plan.sourceRequest}\n상대: ${plan.situation.recipient}\n상대 프로필: ${plan.situation.personProfile ? JSON.stringify(plan.situation.personProfile) : "없음"}\n기억 중인 취향: ${plan.situation.preferences.join(", ") || "없음"}\n원하는 감성: ${plan.situation.desiredMoods.join(", ") || "없음"}\n기억 중인 제약: ${plan.situation.constraints.join(", ") || "없음"}\n지역: ${plan.situation.region}\n예산: ${plan.budget}\n현재 일정: ${plan.items.map((item) => `${item.category}:${item.title}(${item.time}, ${item.location})`).join(" | ")}\n최근 실제 대화: ${(plan.conversation ?? []).slice(-8).map((message) => `${message.role}:${message.text}`).join(" / ") || "없음"}\n최근 수정 결과: ${(plan.revisions ?? []).slice(0, 4).map((revision) => `${revision.instruction} → ${revision.summary}`).join(" / ") || "없음"}\n사용자가 화면에서 선택한 일정: ${requestedCategory ?? "없음"}\n사용자의 자유로운 표현: ${instruction}`,
        },
      ],
    });
    const action = typeof parsed.action === "string" && VALID_ACTIONS.has(parsed.action as ConciergeAction) ? parsed.action as ConciergeAction : fallback.action;
    const category = typeof parsed.targetCategory === "string" && VALID_CATEGORIES.has(parsed.targetCategory as PlanCategory)
      ? parsed.targetCategory as PlanCategory
      : parsed.targetCategory === null ? null : fallback.targetCategory;
    const preferences = Array.isArray(parsed.preferences) ? parsed.preferences.filter((value): value is string => typeof value === "string" && Boolean(value.trim())).slice(0, 5) : fallback.preferences;
    const constraints = Array.isArray(parsed.constraints) ? parsed.constraints.filter((value): value is string => typeof value === "string").slice(0, 5) : fallback.constraints;
    const searchQuery = typeof parsed.searchQuery === "string" && parsed.searchQuery.trim() ? parsed.searchQuery.trim().slice(0, 80) : fallback.searchQuery;
    const rawUpdates = parsed.updates && typeof parsed.updates === "object" && !Array.isArray(parsed.updates) ? parsed.updates as Record<string, unknown> : {};
    const transport = typeof rawUpdates.transport === "string" && ["public_transit", "car", "walking", "unknown"].includes(rawUpdates.transport) ? rawUpdates.transport as DajeongPlan["situation"]["transport"] : fallback.updates.transport;
    const budget = typeof rawUpdates.budget === "number" && rawUpdates.budget >= 10_000 && rawUpdates.budget <= 5_000_000 ? Math.round(rawUpdates.budget) : fallback.updates.budget;
    const region = typeof rawUpdates.region === "string" && rawUpdates.region.trim() ? rawUpdates.region.trim().slice(0, 40) : fallback.updates.region;
    const targetDate = typeof rawUpdates.targetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawUpdates.targetDate) ? rawUpdates.targetDate : undefined;
    const recipient = typeof rawUpdates.recipient === "string" && rawUpdates.recipient.trim() ? rawUpdates.recipient.trim().slice(0, 30) : undefined;
    const safeClock = (value: unknown) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : undefined;
    const scheduleDensity = typeof rawUpdates.scheduleDensity === "string" && ["compact", "balanced", "relaxed"].includes(rawUpdates.scheduleDensity) ? rawUpdates.scheduleDensity as "compact" | "balanced" | "relaxed" : fallback.updates.scheduleDensity;
    const durationMinutes = typeof rawUpdates.durationMinutes === "number" && rawUpdates.durationMinutes >= 10 && rawUpdates.durationMinutes <= 240 ? Math.round(rawUpdates.durationMinutes) : fallback.updates.durationMinutes;
    const bufferAfterMinutes = typeof rawUpdates.bufferAfterMinutes === "number" && rawUpdates.bufferAfterMinutes >= 0 && rawUpdates.bufferAfterMinutes <= 120 ? Math.round(rawUpdates.bufferAfterMinutes) : fallback.updates.bufferAfterMinutes;
    const temporaryCondition = rawUpdates.temporaryCondition === "tired" || rawUpdates.temporaryCondition === "walking_limited" ? rawUpdates.temporaryCondition : fallback.updates.temporaryCondition;
    return { action, targetCategory: requestedCategory ?? category, searchQuery, preferences, constraints, updates: { budget, region, targetDate, transport, recipient, scheduleDensity, availabilityStartTime: safeClock(rawUpdates.availabilityStartTime), availabilityEndTime: safeClock(rawUpdates.availabilityEndTime), homeByTime: safeClock(rawUpdates.homeByTime), durationMinutes, bufferAfterMinutes, lockPlace: typeof rawUpdates.lockPlace === "boolean" ? rawUpdates.lockPlace : fallback.updates.lockPlace, lockTime: typeof rawUpdates.lockTime === "boolean" ? rawUpdates.lockTime : fallback.updates.lockTime, temporaryCondition } };
  } catch {
    return fallback;
  }
}

function itemCoordinates(item?: PlanItem) {
  const reality = item?.reality;
  return reality?.latitude != null && reality.longitude != null
    ? { latitude: reality.latitude, longitude: reality.longitude }
    : undefined;
}

function routeDistance(items: PlanItem[]): number {
  let total = 0;
  for (let index = 1; index < items.length; index += 1) {
    total += haversineKm(itemCoordinates(items[index - 1]), itemCoordinates(items[index])) ?? 0;
  }
  return total;
}

function transportLabel(plan: DajeongPlan): NonNullable<PlanItem["travelFromPrevious"]>["mode"] {
  return plan.situation.transport === "car" ? "차량" : plan.situation.transport === "walking" ? "도보" : "대중교통";
}

function withTimesAndTravel(plan: DajeongPlan, ordered: PlanItem[], timeSlots?: string[]): DajeongPlan {
  const multiDay = ordered.some((item) => (item.dayNumber ?? 1) > 1);
  const slots = timeSlots ?? plan.items.map((item) => item.time).sort();
  const items = ordered.map((item, index) => {
    const previous = ordered[index - 1];
    const sameDay = !previous || (previous.dayNumber ?? 1) === (item.dayNumber ?? 1);
    const distance = sameDay ? haversineKm(itemCoordinates(previous), itemCoordinates(item)) : undefined;
    const minutes = travelMinutes(distance, plan.situation.transport);
    return {
      ...item,
      time: multiDay ? item.time : slots[index] ?? item.time,
      travelFromPrevious: index === 0 || !sameDay ? undefined : minutes == null ? item.travelFromPrevious : {
        minutes,
        mode: transportLabel(plan),
        note: "직선거리 기반 예상 · 실제 경로는 지도에서 확인",
      },
    };
  });
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return scheduleDajeongPlan({
    ...plan,
    items,
    logistics: buildPlanLogistics(plan.situation),
    subtotal: total,
    total,
    reserve: Math.max(0, plan.budget - total),
    budgetRemaining: plan.budget - total,
    status: "draft",
    experienceFlow: buildExperienceFlow(items),
  });
}

function bestRouteForMovableItem(items: PlanItem[], movableIndex: number): { items: PlanItem[]; index: number; improvement: number } {
  const originalDistance = routeDistance(items);
  const movable = items[movableIndex];
  const rest = items.filter((_, index) => index !== movableIndex);
  let best = items;
  let bestIndex = movableIndex;
  let bestDistance = originalDistance;
  for (let index = 0; index <= rest.length; index += 1) {
    const candidate = [...rest.slice(0, index), movable, ...rest.slice(index)];
    const distance = routeDistance(candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestIndex = index;
      bestDistance = distance;
    }
  }
  return { items: best, index: bestIndex, improvement: originalDistance - bestDistance };
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, index) => permutations(items.filter((_, current) => current !== index))
    .map((rest) => [item, ...rest]));
}

function proposalForWholeRoute(plan: DajeongPlan): PlanChangeProposal | undefined {
  if (plan.situation.planScope === "trip") return undefined;
  const firstAnchor = plan.items.findIndex((item) => ["meal", "view", "moment"].includes(item.category));
  const movableCount = firstAnchor < 0 ? plan.items.length : firstAnchor;
  const movable = plan.items.slice(0, movableCount);
  const anchors = plan.items.slice(movableCount);
  if (movable.length < 2 || movable.length > 6 || movable.some((item) => !itemCoordinates(item))) return undefined;
  const originalDistance = routeDistance(plan.items);
  let bestItems = plan.items;
  let bestDistance = originalDistance;
  for (const order of permutations(movable)) {
    const candidate = [...order, ...anchors];
    const distance = routeDistance(candidate);
    if (distance < bestDistance) {
      bestItems = candidate;
      bestDistance = distance;
    }
  }
  const improvement = originalDistance - bestDistance;
  if (improvement < 0.2 || bestItems.every((item, index) => item.id === plan.items[index]?.id)) return undefined;
  const reordered = withTimesAndTravel(plan, bestItems, plan.items.map((item) => item.time).sort());
  return {
    id: `proposal_${Date.now().toString(36)}`,
    message: "지금 장소들은 유지하면서 이동이 덜 끊기는 순서를 찾았어요. 식사와 마지막 일정의 흐름은 건드리지 않았어요. 이 순서로 바꿀까요?",
    reason: `직선거리 기준 예상 이동을 약 ${improvement.toFixed(1)}km 줄일 수 있어요. 실제 길찾기 시간은 출발 전에 다시 확인합니다.`,
    plan: reordered,
  };
}

function explainSelection(plan: DajeongPlan, category: PlanCategory | null, instruction: string): string {
  if (!category) {
    if (/주소|어디|위치/.test(instruction)) {
      return plan.items.map((item) => `${item.time} ${item.title}: ${item.reality?.address || item.location || "지도에서 위치 확인 필요"}`).join("\n");
    }
    if (/예약/.test(instruction)) {
      const required = plan.items.filter((item) => item.reservationRequired);
      return required.length
        ? `예약 확인이 필요한 곳은 ${required.map((item) => `‘${item.title}’(${item.reality?.reservationLabel || "가능 여부 확인 필요"})`).join(", ")}예요. 계획을 확정하면 한 번에 확인 순서로 정리해 드려요.`
        : "현재 계획에는 미리 예약해야 하는 일정이 없어요.";
    }
    if (/가격|얼마|비용|예산/.test(instruction)) {
      return `전체 예상 비용은 ${plan.total.toLocaleString("ko-KR")}원이고 예산 ${plan.budget.toLocaleString("ko-KR")}원 중 ${plan.budgetRemaining.toLocaleString("ko-KR")}원을 남겨뒀어요. 장소별 금액은 결제 직전에 다시 확인해요.`;
    }
    if (/시간|몇 시|언제/.test(instruction)) {
      return plan.items.map((item) => `${item.time} ${item.title} · 약 ${item.durationMinutes}분`).join("\n");
    }
    const realCount = plan.items.filter((item) => item.reality?.source !== "curated").length;
    return `${plan.situation.region} 안에서 ${plan.situation.preferences.join(", ") || "전체 분위기"}, ${plan.budget.toLocaleString("ko-KR")}원 예산, 일정 사이 이동을 함께 맞췄어요. 현재 ${plan.items.length}개 일정 중 실제 지도 장소는 ${realCount}곳이고 총 예상 비용은 ${plan.total.toLocaleString("ko-KR")}원이에요.`;
  }
  const item = plan.items.find((entry) => entry.category === category);
  if (!item) return `${CATEGORY_LABEL[category]} 일정은 현재 계획에 들어 있지 않아요.`;
  const reality = item.reality;
  const facts = [
    `${item.time}부터 약 ${item.durationMinutes}분 일정`,
    reality?.address || item.location || null,
    item.reason,
    reality?.rating ? `평점 ${reality.rating.toFixed(1)}${reality.reviewCount ? `, 리뷰 ${reality.reviewCount.toLocaleString("ko-KR")}개` : ""}` : "평점과 리뷰는 지도에서 확인해야 해요",
    reality?.distanceFromPreviousKm != null ? `앞 일정에서 약 ${reality.distanceFromPreviousKm.toFixed(1)}km` : null,
    reality?.priceConfidence === "provider" ? `연결된 가격대 기준 ${reality.priceLabel}` : `현재 비용은 ${reality?.priceLabel || `${item.price.toLocaleString("ko-KR")}원 예상`}이라 결제 전 확인이 필요해요`,
    reality?.openNow === true ? "현재 영업 중" : reality?.openNow === false ? "현재는 영업 종료" : "방문 시간 영업 여부는 다시 확인해야 해요",
    reality?.reservationLabel || (item.reservationRequired ? "예약 가능 여부를 확인해야 해요" : "예약 없이 방문하는 일정이에요"),
  ].filter((value): value is string => Boolean(value));
  return `‘${item.title}’ 선택 근거는 ${facts.join(" · ")}`;
}

function addRevision(plan: DajeongPlan, instruction: string, message: string, categories: PlanCategory[]): DajeongPlan {
  const synchronized = reconcileReservationOrder(plan);
  const revised: DajeongPlan = {
    ...synchronized,
    revisions: [{
      id: `rev_${Date.now().toString(36)}`,
      instruction,
      summary: message,
      createdAt: new Date().toISOString(),
      changedCategories: categories,
    }, ...(plan.revisions ?? [])].slice(0, 12),
  };
  return appendPlanVersion(appendPlanConversation(revised, instruction, message), instruction, message);
}

function createAddedItem(plan: DajeongPlan, category: PlanCategory, option: PlanOption): PlanItem {
  const lastTime = plan.items.at(-1)?.time ?? plan.situation.startTime;
  return {
    ...option,
    category,
    categoryLabel: CATEGORY_LABEL[category],
    icon: category,
    id: `${option.id}-d${plan.items.at(-1)?.dayNumber ?? 1}-${plan.items.length}`,
    time: category === "lodging" ? plan.situation.checkInTime ?? "15:00" : lastTime,
    dayNumber: plan.items.at(-1)?.dayNumber ?? 1,
    status: "proposed",
    alternatives: [],
  };
}

function proposalForRoute(plan: DajeongPlan, changedIndex: number, category: PlanCategory): PlanChangeProposal | undefined {
  if (plan.situation.planScope === "trip") return undefined;
  const candidate = plan.items[changedIndex];
  const previousDistance = candidate.reality?.distanceFromPreviousKm ?? 0;
  const best = bestRouteForMovableItem(plan.items, changedIndex);
  if (best.index === changedIndex || (previousDistance < 4.5 && best.improvement < 1.2)) return undefined;
  const reordered = withTimesAndTravel(plan, best.items, plan.items.map((item) => item.time).sort());
  return {
    id: `proposal_${Date.now().toString(36)}`,
    message: `${CATEGORY_LABEL[category]} 후보는 마음에 들 만하지만 지금 순서로는 이동이 길어져요. 동선이 자연스럽도록 일정 순서를 함께 바꿀까요?`,
    reason: `예상 이동거리를 약 ${best.improvement.toFixed(1)}km 줄일 수 있어요. 실제 교통 상황은 지도에서 마지막으로 확인합니다.`,
    plan: reordered,
  };
}

function dayNumberInInstruction(instruction: string): number | undefined {
  if (/첫\s*날|첫째\s*날|1\s*일차/.test(instruction)) return 1;
  if (/둘째\s*날|두\s*번째\s*날|2\s*일차/.test(instruction)) return 2;
  if (/셋째\s*날|세\s*번째\s*날|3\s*일차/.test(instruction)) return 3;
  const match = instruction.match(/(\d{1,2})\s*일차/);
  return match ? Number(match[1]) : undefined;
}

function durationMinutesInInstruction(instruction: string): number | undefined {
  if (/두\s*시간|2\s*시간/.test(instruction)) return 120;
  if (/한\s*시간\s*반|1\s*시간\s*반/.test(instruction)) return 90;
  const hours = instruction.match(/(\d{1,2})(?:\.5)?\s*시간/);
  if (hours) return Math.min(240, Number(hours[1]) * 60 + (/\.5/.test(hours[0]) ? 30 : 0));
  const minutes = instruction.match(/(\d{2,3})\s*분/);
  return minutes ? Math.min(240, Number(minutes[1])) : undefined;
}

function scheduleTarget(plan: DajeongPlan, instruction: string, requestedItemId?: string): PlanItem | undefined {
  if (requestedItemId) return plan.items.find((item) => item.id === requestedItemId);
  const category = explicitCategory(instruction);
  if (category) return plan.items.find((item) => item.category === category && (!dayNumberInInstruction(instruction) || item.dayNumber === dayNumberInInstruction(instruction)));
  if (/마지막|맨\s*끝/.test(instruction)) return plan.items.at(-1);
  const compact = instruction.replace(/\s+/g, "");
  return plan.items.find((item) => compact.includes(item.title.replace(/\s+/g, "")));
}

async function applyScheduleInstruction(plan: DajeongPlan, instruction: string, requestedItemId?: string, updates?: ConciergeIntent["updates"]): Promise<{ plan: DajeongPlan; message: string; categories: PlanCategory[] } | null> {
  const asksDuration = updates?.durationMinutes != null || /시간.{0,8}(짧|늘|길|널널)|오래\s*(있|보고|머물)|빨리\s*(봐|보고)|\d{2,3}\s*분|\d(?:\.5)?\s*시간|두\s*시간|한\s*시간\s*반/.test(instruction);
  const asksBuffer = updates?.bufferAfterMinutes != null || /바로\s*(다음|이동|가)|다음.{0,8}(쉬|휴식)|밥\s*먹고.{0,12}(바로|쉬)/.test(instruction);
  const asksLock = updates?.lockPlace === true || updates?.lockTime === true || /꼭\s*(가|유지|지켜|넣)|무조건|이\s*시간.{0,6}(유지|꼭)|여기.{0,6}꼭/.test(instruction);
  const asksUnlock = /고정.{0,8}해제|꼭.{0,6}(안\s*가|해제)|유지.{0,6}안\s*해도/.test(instruction);
  const asksDensity = updates?.scheduleDensity != null || /알차게|여유롭게|널널하게|천천히|쉬엄/.test(instruction);
  const asksCondition = updates?.temporaryCondition != null || /오늘.{0,8}피곤|여친.{0,8}발.{0,5}아프|남친.{0,8}발.{0,5}아프|발.{0,5}아프|컨디션.{0,6}(별로|안\s*좋)/.test(instruction);
  const asksHome = updates?.homeByTime != null || /\d{1,2}(?::\d{2})?\s*시?\s*까지\s*(?:집|귀가|들어가)/.test(instruction);
  const asksAvailability = updates?.availabilityStartTime != null || updates?.availabilityEndTime != null;
  const asksWeather = /비.{0,6}(?:온|와|오|예보)|눈.{0,6}(?:온|와|예보)|강풍|날씨.{0,8}(괜찮|안\s*좋|나쁘)/.test(instruction);
  if (!asksDuration && !asksBuffer && !asksLock && !asksUnlock && !asksDensity && !asksCondition && !asksHome && !asksAvailability && !asksWeather) return null;

  let next = plan;
  const changed = new Set<PlanCategory>();
  const details: string[] = [];
  const target = scheduleTarget(plan, instruction, requestedItemId);
  if (asksUnlock && target) {
    next = scheduleDajeongPlan({ ...next, items: next.items.map((item) => item.id === target.id ? { ...item, placeLocked: false, timeLocked: false, lockReason: undefined } : item) });
    changed.add(target.category);
    details.push(`${target.title}의 사용자 고정을 해제했어요.`);
  }
  if (asksDuration && target) {
    const explicit = updates?.durationMinutes ?? durationMinutesInInstruction(instruction);
    const range = target.durationRange;
    const duration = explicit ?? (/빨리\s*(봐|보고)|짧게/.test(instruction) ? range?.minimumMinutes ?? Math.max(20, target.durationMinutes - 20) : range?.leisurelyMinutes ?? target.durationMinutes + 30);
    next = setItemDuration(next, target.id, duration);
    changed.add(target.category);
    details.push(`${target.title} 체류시간을 ${duration}분으로 맞추고 뒤 일정을 연쇄 조정했어요.`);
  }
  if (asksBuffer) {
    const bufferTarget = target ?? next.items.find((item) => item.category === "meal");
    if (bufferTarget) {
      const buffer = updates?.bufferAfterMinutes ?? 30;
      next = scheduleDajeongPlan({ ...next, items: next.items.map((item) => item.id === bufferTarget.id ? { ...item, bufferAfterMinutes: Math.max(item.bufferAfterMinutes ?? 0, buffer) } : item) });
      changed.add(bufferTarget.category);
      details.push(`${bufferTarget.title} 다음에 최소 30분의 숨 돌릴 여유를 뒀어요.`);
    }
  }
  if (asksLock) {
    const lockTarget = /마지막/.test(instruction) ? next.items.at(-1) : target;
    if (lockTarget) {
      const lockTime = updates?.lockTime === true || /시간.{0,8}(유지|꼭)/.test(instruction);
      next = scheduleDajeongPlan({ ...next, items: next.items.map((item) => item.id === lockTarget.id ? { ...item, placeLocked: true, timeLocked: lockTime || item.timeLocked, lockReason: instruction.slice(0, 120) } : item) });
      changed.add(lockTarget.category);
      details.push(`${lockTarget.title}은 사용자가 해제하기 전까지 유지하는 강한 조건으로 고정했어요.`);
    }
  }
  if (asksDensity) {
    const density = updates?.scheduleDensity ?? (/여유|널널|천천히|쉬엄/.test(instruction) ? "relaxed" as const : "compact" as const);
    next = scheduleDajeongPlan({ ...next, situation: { ...next.situation, scheduleDensity: density, densitySpecified: true } });
    next.items.forEach((item) => changed.add(item.category));
    details.push(density === "compact" ? "최소 체류시간을 침범하지 않는 선에서 공백과 이동을 줄였어요." : "장소 수와 이동 부담을 줄이고 체류·완충시간을 늘렸어요.");
  }
  if (asksCondition) {
    const walkingLimited = updates?.temporaryCondition === "walking_limited" || /발.{0,5}아프/.test(instruction);
    next = scheduleDajeongPlan({ ...next, situation: { ...next.situation, temporaryCondition: { energy: "low", walkingLimited: walkingLimited || next.situation.temporaryCondition.walkingLimited, notes: [...new Set([...next.situation.temporaryCondition.notes, instruction.slice(0, 100)])] } } });
    next.items.forEach((item) => changed.add(item.category));
    details.push("오늘 컨디션에만 적용해 이동 강도를 낮추고 휴식 여유를 늘렸어요. 장기 취향에는 저장하지 않았어요.");
  }
  if (asksHome) {
    const parsed = parseSituation({ request: instruction, homeTravelMinutes: next.situation.homeTravelMinutes });
    const homeByTime = updates?.homeByTime ?? parsed.homeByTime;
    if (homeByTime) {
      next = scheduleDajeongPlan({ ...next, situation: { ...next.situation, homeByTime } });
      next.items.forEach((item) => changed.add(item.category));
      details.push(`${homeByTime} 장소 종료가 아니라 예상 귀가 기준으로 마지막 일정을 역산했어요.`);
    }
  }
  if (asksAvailability) {
    next = scheduleDajeongPlan({ ...next, situation: { ...next.situation, startTime: updates?.availabilityStartTime ?? next.situation.startTime, availabilityEndTime: updates?.availabilityEndTime ?? next.situation.availabilityEndTime } });
    next.items.forEach((item) => changed.add(item.category));
    details.push(`${next.situation.startTime}${next.situation.availabilityEndTime ? `~${next.situation.availabilityEndTime}` : "부터"} 가용시간 안으로 다시 맞췄어요.`);
  }
  if (asksWeather) {
    const checked = await enrichPlanWithWeather(next);
    next = checked.schedule?.weather.status === "verified"
      ? checked
      : scheduleDajeongPlan({ ...checked, schedule: { ...checked.schedule!, weather: weatherContextFromUser(instruction) } });
    next.items.forEach((item) => changed.add(item.category));
    details.push(next.schedule?.weather.status === "verified" ? "시간대별 실제 예보와 도보 노출을 확인해 영향받는 일정만 다시 배치했어요." : "말해준 날씨를 이번 일정 조건으로 반영했지만, 외부 예보로 확인된 사실처럼 표시하지 않았어요.");
  }
  return { plan: next, message: details.join(" "), categories: [...changed] };
}

function shiftClock(value: string, minutes: number): string {
  const [hour, minute] = value.split(":").map(Number);
  const total = Math.max(0, Math.min(23 * 60 + 59, hour * 60 + minute + minutes));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function memoryUpdateForInstruction(instruction: string, intent: ConciergeIntent): PersonMemoryUpdate | undefined {
  const dislikedFoods = [
    /매운.{0,8}(못|안|싫)|맵지 않/.test(instruction) ? "매운 음식" : null,
  ].filter((value): value is string => Boolean(value));
  const likedActivities = [
    /전시.{0,8}(좋|좋아)/.test(instruction) ? "전시" : null,
    /야경.{0,8}(좋|좋아)/.test(instruction) ? "야경" : null,
  ].filter((value): value is string => Boolean(value));
  const dislikedActivities = [
    /공방.{0,8}(싫|별로|안\s*좋)/.test(instruction) ? "공방" : null,
  ].filter((value): value is string => Boolean(value));
  const likedAtmospheres = [
    /조용.{0,8}(좋|좋아)/.test(instruction) ? "조용한 분위기" : null,
    /야경.{0,8}(좋|좋아)/.test(instruction) ? "야경이 보이는 분위기" : null,
  ].filter((value): value is string => Boolean(value));
  const dislikedAtmospheres = [
    /사람.{0,6}(많|붐비).{0,6}(싫|피)/.test(instruction) ? "혼잡한 분위기" : null,
    /시끄럽.{0,6}(싫|피)/.test(instruction) ? "시끄러운 분위기" : null,
  ].filter((value): value is string => Boolean(value));
  const preferences = [...new Set([...intent.preferences, ...likedActivities, ...likedAtmospheres])];
  const constraints = [...new Set([...intent.constraints, ...dislikedFoods.map((value) => `${value} 제외`), ...dislikedActivities.map((value) => `${value} 제외`), ...dislikedAtmospheres.map((value) => `${value} 제외`)])];
  if (!preferences.length && !constraints.length && !likedActivities.length && !dislikedActivities.length && !dislikedAtmospheres.length) return undefined;
  return {
    preferences,
    constraints,
    likedFoods: [],
    dislikedFoods,
    hobbies: likedActivities,
    likedActivities,
    dislikedActivities,
    likedAtmospheres,
    dislikedAtmospheres,
    crowdTolerance: dislikedAtmospheres.includes("혼잡한 분위기") ? "low" : "unknown",
    walkingTolerance: /많이.{0,4}(못 걸|걷지)|걷.{0,8}(싫|힘)/.test(instruction) ? "low" : "unknown",
    notes: [],
  };
}

function categoriesOf(plan: DajeongPlan, ids: string[]): PlanCategory[] {
  return [...new Set(plan.items.filter((item) => ids.includes(item.id)).map((item) => item.category))];
}

export async function reviseDajeongPlanWithDiscovery(
  plan: DajeongPlan,
  instruction: string,
  requestedCategory?: PlanCategory,
  requestedItemId?: string,
): Promise<PlanRevisionResult> {
  const result = await reviseDajeongPlanWithDiscoveryCore(plan, instruction, requestedCategory, requestedItemId);
  const paceUpdate = classifyPaceFeedback(instruction);
  return paceUpdate ? { ...result, paceUpdate } : result;
}

async function reviseDajeongPlanWithDiscoveryCore(
  plan: DajeongPlan,
  instruction: string,
  requestedCategory?: PlanCategory,
  requestedItemId?: string,
): Promise<PlanRevisionResult> {
  const normalizedInstruction = instruction.trim();
  const executionResult = handleExecutionInstruction(plan, normalizedInstruction, requestedItemId);
  if (executionResult.handled) {
    const next = appendPlanConversation(executionResult.plan, normalizedInstruction, executionResult.message);
    return { plan: next, message: executionResult.message, changedCategories: [] };
  }

  // Day-of instructions ("우리 아직 밥 먹고 있어", "여기 더 있고 싶어", "집에 좀 일찍 갈래", "다음 거 빼자")
  // stay in this same conversation instead of a separate live-tracking feature — they reuse the
  // existing cascading scheduler, just anchored on the real current item instead of the whole day.
  if (STAY_LONGER_PATTERN.test(normalizedInstruction)) {
    const extraMatch = normalizedInstruction.match(/(\d{1,3})\s*분\s*더|(\d)\s*시간\s*더/);
    const extraMinutes = extraMatch ? (extraMatch[1] ? Number(extraMatch[1]) : Number(extraMatch[2]) * 60) : undefined;
    const live = applyStayLonger(plan, { itemId: requestedItemId, extraMinutes, reason: normalizedInstruction });
    const next = live.changedItemIds.length ? addRevision(live.plan, normalizedInstruction, live.message, categoriesOf(live.plan, live.changedItemIds)) : appendPlanConversation(live.plan, normalizedInstruction, live.message);
    return { plan: next, message: live.message, changedCategories: [] };
  }
  if (DELAY_PATTERN.test(normalizedInstruction)) {
    const minutesMatch = normalizedInstruction.match(/(\d{1,3})\s*분\s*(정도\s*)?늦/);
    const live = applyDelayReport(plan, { itemId: requestedItemId, extraMinutes: minutesMatch ? Number(minutesMatch[1]) : undefined, reason: normalizedInstruction });
    const next = live.changedItemIds.length ? addRevision(live.plan, normalizedInstruction, live.message, categoriesOf(live.plan, live.changedItemIds)) : appendPlanConversation(live.plan, normalizedInstruction, live.message);
    return { plan: next, message: live.message, changedCategories: [] };
  }
  if (LEAVE_EARLY_PATTERN.test(normalizedInstruction) && !/\d{1,2}(:\d{2})?\s*시?\s*까지/.test(normalizedInstruction)) {
    const live = applyLeaveEarly(plan, { reason: normalizedInstruction });
    const next = addRevision(live.plan, normalizedInstruction, live.message, categoriesOf(live.plan, live.changedItemIds));
    return { plan: next, message: live.message, changedCategories: [] };
  }
  if (SKIP_NEXT_PATTERN.test(normalizedInstruction)) {
    const live = applySkipNext(plan, { itemId: requestedItemId, reason: normalizedInstruction });
    const next = live.changedItemIds.length ? addRevision(live.plan, normalizedInstruction, live.message, categoriesOf(plan, live.changedItemIds)) : appendPlanConversation(live.plan, normalizedInstruction, live.message);
    return { plan: next, message: live.message, changedCategories: [] };
  }

  // Secrecy commands ("이거 비밀로 해줘", "이제 공개해도 돼") mutate the same items/messages a UI
  // toggle would, so natural language and buttons can never land the plan in different states.
  const secrecy = applySecrecyInstruction(plan, normalizedInstruction, requestedItemId);
  if (secrecy.handled) {
    return { plan: secrecy.plan, message: secrecy.message, changedCategories: [] };
  }

  if (/처음.{0,8}(걸|계획|상태).{0,8}(돌아|복원)|처음으로\s*돌아/.test(normalizedInstruction)) {
    const initial = plan.versions?.[0];
    if (initial) {
      const message = "처음 만들었던 계획으로 돌아왔어요. 시간표·장소·예산도 모두 그 상태로 복원했어요.";
      const restored = appendPlanConversation(restorePlanVersion(plan, initial, normalizedInstruction), normalizedInstruction, message);
      return { plan: restored, message, changedCategories: [...new Set([...plan.items.map((item) => item.category), ...restored.items.map((item) => item.category)])] };
    }
  }
  if (/(?:이전|직전|아까).{0,10}(계획|상태|걸).{0,8}(돌아|복원)/.test(normalizedInstruction)) {
    const versions = plan.versions ?? [];
    const previous = versions.at(-2) ?? versions[0];
    if (previous) {
      const message = "바로 이전 계획으로 돌아왔어요. 화면의 일정과 총비용도 함께 복원했어요.";
      const restored = appendPlanConversation(restorePlanVersion(plan, previous, normalizedInstruction), normalizedInstruction, message);
      return { plan: restored, message, changedCategories: [...new Set([...plan.items.map((item) => item.category), ...restored.items.map((item) => item.category)])] };
    }
  }
  if (/아까.{0,8}(두\s*번째|2\s*번째).{0,8}(좋|선택|걸로)/.test(normalizedInstruction)) {
    const restoredCandidate = restoreReferencedCandidate(plan, normalizedInstruction);
    if (restoredCandidate) {
      const message = `아까 봤던 두 번째 후보 ‘${restoredCandidate.title}’로 돌아왔어요. 다른 일정은 그대로예요.`;
      return { plan: addRevision(restoredCandidate.plan, normalizedInstruction, message, [restoredCandidate.category]), message, changedCategories: [restoredCandidate.category] };
    }
  }
  const scheduleChange = await applyScheduleInstruction(plan, normalizedInstruction, requestedItemId);
  if (scheduleChange) {
    const revised = addRevision(scheduleChange.plan, normalizedInstruction, scheduleChange.message, scheduleChange.categories);
    return { plan: revised, message: scheduleChange.message, changedCategories: scheduleChange.categories };
  }
  const shiftedDay = dayNumberInInstruction(normalizedInstruction);
  if (shiftedDay && /늦게\s*시작|시작.{0,5}늦|천천히\s*시작/.test(normalizedInstruction)) {
    const affected = plan.items.filter((item) => (item.dayNumber ?? 1) === shiftedDay);
    if (affected.length) {
      const shifted = plan.items.map((item) => (item.dayNumber ?? 1) === shiftedDay ? { ...item, time: shiftClock(item.time, 60) } : item);
      const next = withTimesAndTravel(plan, shifted);
      const categories = [...new Set(affected.map((item) => item.category))];
      const message = `${shiftedDay}일차 시작을 한 시간 늦추고 그날 시간표와 이동 흐름을 함께 다시 맞췄어요.`;
      return { plan: addRevision(next, normalizedInstruction, message, categories), message, changedCategories: categories };
    }
  }
  const intent = await interpretConciergeInstruction(plan, instruction, requestedCategory);
  if (intent.action === "reschedule") {
    const targetItemId = requestedItemId ?? (intent.targetCategory ? plan.items.find((item) => item.category === intent.targetCategory)?.id : undefined);
    const structuredSchedule = await applyScheduleInstruction(plan, normalizedInstruction, targetItemId, intent.updates);
    if (structuredSchedule) {
      const revised = addRevision(structuredSchedule.plan, normalizedInstruction, structuredSchedule.message, structuredSchedule.categories);
      return { plan: revised, message: structuredSchedule.message, changedCategories: structuredSchedule.categories };
    }
  }
  if (intent.action === "execute" || intent.action === "payment_review") {
    const targetItemId = requestedItemId ?? (intent.targetCategory ? plan.items.find((item) => item.category === intent.targetCategory)?.id : undefined);
    const execution = handleExecutionInstruction(plan, intent.action === "execute" ? "이거 예약해줘" : "이걸로 결제해", targetItemId);
    if (execution.handled) {
      const next = appendPlanConversation(execution.plan, normalizedInstruction, execution.message);
      return { plan: next, message: execution.message, changedCategories: [] };
    }
  }
  const profileUpdate = memoryUpdateForInstruction(instruction, intent);
  const addsLodging = intent.targetCategory === "lodging" && intent.action === "add" && !plan.items.some((item) => item.category === "lodging");
  const rememberedConstraints = [...new Set([...plan.situation.constraints, ...intent.constraints])];
  const rememberedPreferences = [...new Set([...plan.situation.preferences, ...intent.preferences])];
  const instructionMoods = parseSituation({ request: instruction }).desiredMoods;
  const rememberedMoods = [...new Set([...plan.situation.desiredMoods, ...instructionMoods])];
  const nextBudget = intent.updates.budget ?? plan.budget;
  const contextualPlan: DajeongPlan = {
    ...plan,
    budget: nextBudget,
    budgetRemaining: nextBudget - plan.total,
    reserve: Math.max(0, nextBudget - plan.total),
    situation: {
      ...plan.situation,
      budget: nextBudget,
      region: intent.updates.region ?? plan.situation.region,
      targetDate: intent.updates.targetDate ?? plan.situation.targetDate,
      transport: intent.updates.transport ?? plan.situation.transport,
      recipient: intent.updates.recipient ?? plan.situation.recipient,
      planScope: addsLodging ? "trip" : plan.situation.planScope,
      tripDays: addsLodging ? Math.max(2, plan.situation.tripDays ?? 2) : plan.situation.tripDays,
      tripNights: addsLodging ? Math.max(1, plan.situation.tripNights ?? 1) : plan.situation.tripNights,
      needsLodging: addsLodging ? true : plan.situation.needsLodging,
      checkInTime: addsLodging ? plan.situation.checkInTime ?? "15:00" : plan.situation.checkInTime,
      checkOutTime: addsLodging ? plan.situation.checkOutTime ?? "11:00" : plan.situation.checkOutTime,
      constraints: rememberedConstraints,
      preferences: rememberedPreferences,
      desiredMoods: rememberedMoods,
      personMemoryUpdate: profileUpdate ?? plan.situation.personMemoryUpdate,
    },
  };
  const target = intent.targetCategory;
  const hasOverallUpdate = Boolean(intent.updates.budget || intent.updates.region || intent.updates.targetDate || intent.updates.transport || intent.updates.recipient);
  const hasPersonalizationUpdate = intent.preferences.length > 0 || intent.constraints.length > 0;

  if (intent.action === "explain") {
    const message = explainSelection(contextualPlan, target, instruction);
    return { plan: appendPlanConversation(contextualPlan, instruction, message), message, changedCategories: [], profileUpdate };
  }

  if (intent.action === "reorder") {
    const changedIndex = target ? contextualPlan.items.findIndex((item) => item.category === target) : -1;
    const routeProposal = changedIndex >= 0
      ? proposalForRoute(contextualPlan, changedIndex, target as PlanCategory)
      : proposalForWholeRoute(contextualPlan);
    const message = routeProposal?.message ?? "현재 순서가 장소 사이 이동을 가장 적게 만드는 흐름이에요. 식사 시간과 마지막 일정도 지금 그대로 두는 편이 자연스러워요.";
    const recorded = appendPlanConversation(contextualPlan, instruction, message);
    const proposal = routeProposal ? { ...routeProposal, plan: { ...routeProposal.plan, conversation: recorded.conversation } } : undefined;
    return { plan: recorded, message, changedCategories: [], proposal, profileUpdate };
  }

  if (!target && (hasOverallUpdate || hasPersonalizationUpdate)) {
    let updated = contextualPlan;
    const shouldRefreshPlaces = Boolean(intent.updates.region || intent.updates.transport || hasPersonalizationUpdate);
    if (shouldRefreshPlaces) updated = await enrichDajeongPlanWithRealPlaces(updated);
    if (intent.updates.transport) updated = withTimesAndTravel(updated, updated.items);
    if (updated.total > updated.budget) updated = reviseDajeongPlan(updated, "분위기를 최대한 유지하면서 전체 비용을 줄여줘", { recordConversation: false }).plan;
    const changed = shouldRefreshPlaces ? updated.items.map((item) => item.category) : [];
    const details = [
      intent.updates.region ? `지역을 ${updated.situation.region}(으)로 바꾸고 장소를 다시 찾았어요.` : null,
      intent.updates.budget ? `전체 예산은 ${updated.budget.toLocaleString("ko-KR")}원으로 맞췄어요.` : null,
      intent.updates.targetDate ? `날짜는 ${updated.situation.targetDate}로 바꿨어요.` : null,
      intent.updates.transport ? "이동수단을 전체 동선에 반영했어요." : null,
      intent.preferences.length ? `${intent.preferences.join(", ")} 취향을 기억하고 전체 후보를 다시 비교했어요.` : null,
      intent.constraints.length ? `${intent.constraints.join(", ")} 조건은 이후 수정에서도 계속 지킬게요.` : null,
    ].filter((value): value is string => Boolean(value));
    const message = details.join(" ") || "말씀하신 조건을 전체 일정에 반영했어요.";
    return { plan: addRevision(updated, instruction, message, changed), message, changedCategories: changed, profileUpdate };
  }

  if (!target || ["remove", "indoor"].includes(intent.action)) {
    const fallback = reviseDajeongPlan(contextualPlan, instruction);
    if (fallback.changedCategories.length) return { ...fallback, profileUpdate };
    const message = "말씀하신 뜻을 일정에 연결할 대상을 아직 확실히 고르지 못했어요. 장소 이름이나 ‘두 번째 일정’, ‘저녁 이후’처럼 편한 방식으로 가리켜 주세요.";
    return { plan: appendPlanConversation(contextualPlan, instruction, message), message, changedCategories: [], profileUpdate };
  }

  if (intent.action === "cheaper") {
    const fallback = reviseDajeongPlan(contextualPlan, instruction);
    if (fallback.changedCategories.length) {
      return { ...fallback, message: `${fallback.message} 실제 후보의 표시 가격과 링크에서 결제 전 금액을 다시 확인해 주세요.`, profileUpdate };
    }
  }

  const requestedDay = dayNumberInInstruction(instruction);
  const existingIndex = requestedItemId
    ? contextualPlan.items.findIndex((item) => item.id === requestedItemId)
    : contextualPlan.items.findIndex((item) => item.category === target && (!requestedDay || item.dayNumber === requestedDay));
  const existing = existingIndex >= 0 ? contextualPlan.items[existingIndex] : undefined;
  if (existing?.placeLocked && !/고정.{0,8}해제|꼭.{0,6}(안\s*가|해제)|바꿔도\s*돼/.test(normalizedInstruction)) {
    const message = `‘${existing.title}’은 꼭 유지할 장소로 고정되어 있어요. 바꾸려면 “이 장소 고정 해제해줘”라고 말해 주세요.`;
    return { plan: appendPlanConversation(contextualPlan, normalizedInstruction, message), message, changedCategories: [], profileUpdate };
  }
  const base = existing ?? getOptions(target, contextualPlan.situation)[0];
  if (!base) return { ...reviseDajeongPlan(contextualPlan, instruction), profileUpdate };
  const previous = existingIndex > 0 ? contextualPlan.items[existingIndex - 1] : contextualPlan.items.at(-1);
  const discoveredOptions = await discoverOptionsForItem({ plan: contextualPlan, category: target, query: [intent.searchQuery, ...intent.preferences, ...intent.constraints].join(" "), base, previous });
  const options = existing ? discoveredOptions.filter((option) => option.id !== existing.id) : discoveredOptions;
  if (!options.length) {
    if (!existing && intent.action === "add") {
      const reference = attachCuratedReality(base);
      let next = withTimesAndTravel(contextualPlan, [...contextualPlan.items, { ...createAddedItem(contextualPlan, target, reference), alternatives: getOptions(target, contextualPlan.situation).filter((option) => option.id !== base.id).map(attachCuratedReality) }]);
      const message = target === "lodging"
        ? `숙소 체크인을 일정에 넣었어요. 다만 지금은 실제 숙소 검색 연결이 없어 특정 숙소를 확정하지 않고, ${intent.preferences.join(", ") || "말씀하신 조건"}에 맞는 후보 탐색 기준으로 표시했어요. 지도 연결이 준비되면 실제 객실·후기·가격으로 바로 바뀝니다.`
        : `${CATEGORY_LABEL[target]}을 일정에 넣었어요. 지금은 실시간 장소 검색 결과가 없어 실제 후보 확정 전 탐색 기준으로 표시합니다.`;
      next = addRevision(next, instruction, message, [target]);
      return { plan: next, message, changedCategories: [target], searchedRealPlaces: 0, profileUpdate };
    }
    const fallback = reviseDajeongPlan(contextualPlan, instruction);
    if (fallback.changedCategories.length) return { ...fallback, message: `${fallback.message} 다만 지금은 실시간 장소 검색 결과가 없어 기본 후보로 조정했어요.`, searchedRealPlaces: 0, profileUpdate };
    const message = `${plan.situation.region}에서 조건에 맞는 실제 후보를 지금 확인하지 못했어요. 지역이나 원하는 분위기를 조금 다르게 말해 주세요.`;
    return { plan: appendPlanConversation(contextualPlan, instruction, message), message, changedCategories: [], searchedRealPlaces: 0, profileUpdate };
  }

  const selected = options[0];
  let nextItems: PlanItem[];
  let changedIndex: number;
  if (existing) {
    nextItems = contextualPlan.items.map((item, index) => index === existingIndex ? {
      ...item,
      ...selected,
      id: item.id,
      dayNumber: item.dayNumber,
      category: item.category,
      categoryLabel: item.categoryLabel,
      icon: item.icon,
      time: item.time,
      status: item.status,
      alternatives: [...options.slice(1), ...item.alternatives.filter((option) => option.id !== selected.id).slice(0, 1)],
    } : item);
    changedIndex = existingIndex;
  } else {
    nextItems = [...contextualPlan.items, { ...createAddedItem(contextualPlan, target, selected), alternatives: options.slice(1) }];
    changedIndex = nextItems.length - 1;
  }

  let next = withTimesAndTravel(contextualPlan, nextItems);
  const message = existing
    ? `${CATEGORY_LABEL[target]}만 실제 장소 ‘${selected.title}’로 바꿨어요. 나머지 일정과 조건은 그대로 두었습니다.`
    : `동선 가까이에 실제 장소 ‘${selected.title}’를 새 일정으로 넣었어요.`;
  const routeProposal = proposalForRoute(next, changedIndex, target);
  const responseMessage = routeProposal?.message ?? message;
  next = addRevision(next, instruction, responseMessage, [target]);
  next = {
    ...next,
    discovery: {
      status: next.discovery?.status === "unavailable" ? "partial" : next.discovery?.status ?? "partial",
      sourceLabel: selected.reality?.sourceLabel ?? "장소 탐색 서비스",
      checkedAt: new Date().toISOString(),
      realPlaceCount: Math.max(next.discovery?.realPlaceCount ?? 0, next.items.filter((item) => item.reality && item.reality.source !== "curated").length),
      message: "수정 요청에 맞춰 실제 장소를 다시 탐색했어요.",
    },
  };

  const proposal = routeProposal ? { ...routeProposal, plan: { ...routeProposal.plan, conversation: next.conversation, revisions: next.revisions } } : undefined;
  return {
    plan: next,
    message: responseMessage,
    changedCategories: [target],
    proposal,
    searchedRealPlaces: options.length,
    profileUpdate,
  };
}
