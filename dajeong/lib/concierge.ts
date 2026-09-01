import "server-only";

import { openAiTextCompletion } from "@/lib/openai-chat";
import { getOptions } from "./catalog";
import { discoverOptionsForItem, enrichDajeongPlanWithRealPlaces } from "./place-discovery";
import { attachCuratedReality, haversineKm, travelMinutes } from "./place-utils";
import { appendPlanConversation, reviseDajeongPlan } from "./plan-engine";
import { parseSituation } from "./situation";
import { buildExperienceFlow } from "./experience";
import type { DajeongPlan, PlanCategory, PlanChangeProposal, PlanItem, PlanOption, PlanRevisionResult } from "./types";

type ConciergeAction = "replace" | "add" | "remove" | "cheaper" | "indoor" | "reorder" | "refine" | "explain";

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
const VALID_ACTIONS = new Set<ConciergeAction>(["replace", "add", "remove", "cheaper", "indoor", "reorder", "refine", "explain"]);

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
  const action: ConciergeAction = /왜|이유|설명|어떤 곳|뭐가 좋|어때|어디|주소|위치|얼마|몇 시|언제|평점|리뷰|(?:가격|비용|예산).{0,6}(확실|맞|알려|어떻|남)|시간.{0,5}(알려|어떻)|예약.{0,5}(돼|가능|필요|알려)|영업.{0,5}(해|시간)/.test(instruction) ? "explain"
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
    : /자차|운전|차로/.test(instruction) ? "car" as const
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
    },
  };
}

function parseJsonObject(value: string): Record<string, unknown> | null {
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

export async function interpretConciergeInstruction(
  plan: DajeongPlan,
  instruction: string,
  requestedCategory?: PlanCategory,
): Promise<ConciergeIntent> {
  const fallback = fallbackIntent(plan, instruction, requestedCategory);
  if (!process.env.OPENAI_API_KEY) return fallback;
  try {
    const response = await openAiTextCompletion({
      timeoutMs: 7_000,
      temperature: 0.05,
      messages: [
        {
          role: "system",
          content: "너는 실행형 개인 컨시어지의 대화 이해 엔진이다. 사용자가 정해진 명령어를 쓰지 않아도 문장 전체의 의미, 대명사(여기/저곳/그다음), 부정 표현, 상대 취향, 유지하고 싶은 조건과 바꾸고 싶은 범위를 이해한다. 기존 대화와 일정을 문맥으로 사용하고, 사용자가 요청하지 않은 일정은 보존한다. 감성 표현(신비롭게, 영화처럼, 와 할 만하게, 덜 힙하게)도 구체적인 탐색 조건으로 번역한다. 질문에는 일정을 바꾸지 말고 근거만 답한다. 장소명이나 가격, 영업·예약 사실은 만들지 않는다. JSON 객체만 반환한다. action은 replace/add/remove/cheaper/indoor/reorder/refine/explain 중 하나다. 단순 질문은 explain이다. targetCategory는 activity/cafe/meal/view/lodging/cake/flower/gift/moment/null 중 하나다. 숙소를 찾아달라거나 추가해달라는 말은 targetCategory=lodging, action=add다. searchQuery는 장소 검색에 쓸 자연스러운 한국어 의도를 담는다. preferences에는 좋아하는 분위기·음식·경험을, constraints에는 금지·알레르기·이동 제약처럼 반드시 지킬 조건을 넣는다. updates 객체에는 사용자가 바꾸라고 한 값만 budget(원 단위 숫자), region, targetDate(YYYY-MM-DD), transport(public_transit/car/walking/unknown), recipient로 담고 나머지는 생략한다.",
        },
        {
          role: "user",
          content: `사용자 상황: ${plan.sourceRequest}\n상대: ${plan.situation.recipient}\n상대 프로필: ${plan.situation.personProfile ? JSON.stringify(plan.situation.personProfile) : "없음"}\n기억 중인 취향: ${plan.situation.preferences.join(", ") || "없음"}\n원하는 감성: ${plan.situation.desiredMoods.join(", ") || "없음"}\n기억 중인 제약: ${plan.situation.constraints.join(", ") || "없음"}\n지역: ${plan.situation.region}\n예산: ${plan.budget}\n현재 일정: ${plan.items.map((item) => `${item.category}:${item.title}(${item.time}, ${item.location})`).join(" | ")}\n최근 실제 대화: ${(plan.conversation ?? []).slice(-8).map((message) => `${message.role}:${message.text}`).join(" / ") || "없음"}\n최근 수정 결과: ${(plan.revisions ?? []).slice(0, 4).map((revision) => `${revision.instruction} → ${revision.summary}`).join(" / ") || "없음"}\n사용자가 화면에서 선택한 일정: ${requestedCategory ?? "없음"}\n사용자의 자유로운 표현: ${instruction}`,
        },
      ],
    });
    const parsed = parseJsonObject(response);
    if (!parsed) return fallback;
    const action = typeof parsed.action === "string" && VALID_ACTIONS.has(parsed.action as ConciergeAction) ? parsed.action as ConciergeAction : fallback.action;
    const category = typeof parsed.targetCategory === "string" && VALID_CATEGORIES.has(parsed.targetCategory as PlanCategory)
      ? parsed.targetCategory as PlanCategory
      : parsed.targetCategory === null ? null : fallback.targetCategory;
    const preferences = Array.isArray(parsed.preferences) ? parsed.preferences.filter((value): value is string => typeof value === "string" && Boolean(value.trim())).slice(0, 5) : fallback.preferences;
    const constraints = Array.isArray(parsed.constraints) ? parsed.constraints.filter((value): value is string => typeof value === "string").slice(0, 5) : fallback.constraints;
    const searchQuery = typeof parsed.searchQuery === "string" && parsed.searchQuery.trim() ? parsed.searchQuery.trim().slice(0, 80) : fallback.searchQuery;
    const rawUpdates = parsed.updates && typeof parsed.updates === "object" && !Array.isArray(parsed.updates) ? parsed.updates as Record<string, unknown> : {};
    const transport = typeof rawUpdates.transport === "string" && ["public_transit", "car", "walking", "unknown"].includes(rawUpdates.transport) ? rawUpdates.transport as DajeongPlan["situation"]["transport"] : fallback.updates.transport;
    const budget = typeof rawUpdates.budget === "number" && rawUpdates.budget >= 50_000 && rawUpdates.budget <= 2_000_000 ? Math.round(rawUpdates.budget) : fallback.updates.budget;
    const region = typeof rawUpdates.region === "string" && rawUpdates.region.trim() ? rawUpdates.region.trim().slice(0, 40) : fallback.updates.region;
    const targetDate = typeof rawUpdates.targetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawUpdates.targetDate) ? rawUpdates.targetDate : undefined;
    const recipient = typeof rawUpdates.recipient === "string" && rawUpdates.recipient.trim() ? rawUpdates.recipient.trim().slice(0, 30) : undefined;
    return { action, targetCategory: requestedCategory ?? category, searchQuery, preferences, constraints, updates: { budget, region, targetDate, transport, recipient } };
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
  return {
    ...plan,
    items,
    subtotal: total,
    total,
    reserve: Math.max(0, plan.budget - total),
    budgetRemaining: plan.budget - total,
    status: "draft",
    experienceFlow: buildExperienceFlow(items),
  };
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
  const revised: DajeongPlan = {
    ...plan,
    revisions: [{
      id: `rev_${Date.now().toString(36)}`,
      instruction,
      summary: message,
      createdAt: new Date().toISOString(),
      changedCategories: categories,
    }, ...(plan.revisions ?? [])].slice(0, 12),
  };
  return appendPlanConversation(revised, instruction, message);
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

export async function reviseDajeongPlanWithDiscovery(
  plan: DajeongPlan,
  instruction: string,
  requestedCategory?: PlanCategory,
  requestedItemId?: string,
): Promise<PlanRevisionResult> {
  const intent = await interpretConciergeInstruction(plan, instruction, requestedCategory);
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
    },
  };
  const target = intent.targetCategory;
  const hasOverallUpdate = Boolean(intent.updates.budget || intent.updates.region || intent.updates.targetDate || intent.updates.transport || intent.updates.recipient);
  const hasPersonalizationUpdate = intent.preferences.length > 0 || intent.constraints.length > 0;

  if (intent.action === "explain") {
    const message = explainSelection(contextualPlan, target, instruction);
    return { plan: appendPlanConversation(contextualPlan, instruction, message), message, changedCategories: [] };
  }

  if (intent.action === "reorder") {
    const changedIndex = target ? contextualPlan.items.findIndex((item) => item.category === target) : -1;
    const routeProposal = changedIndex >= 0
      ? proposalForRoute(contextualPlan, changedIndex, target as PlanCategory)
      : proposalForWholeRoute(contextualPlan);
    const message = routeProposal?.message ?? "현재 순서가 장소 사이 이동을 가장 적게 만드는 흐름이에요. 식사 시간과 마지막 일정도 지금 그대로 두는 편이 자연스러워요.";
    const recorded = appendPlanConversation(contextualPlan, instruction, message);
    const proposal = routeProposal ? { ...routeProposal, plan: { ...routeProposal.plan, conversation: recorded.conversation } } : undefined;
    return { plan: recorded, message, changedCategories: [], proposal };
  }

  if (!target && (hasOverallUpdate || hasPersonalizationUpdate)) {
    let updated = contextualPlan;
    const shouldRefreshPlaces = Boolean(intent.updates.region || hasPersonalizationUpdate);
    if (shouldRefreshPlaces) updated = await enrichDajeongPlanWithRealPlaces(updated);
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
    return { plan: addRevision(updated, instruction, message, changed), message, changedCategories: changed };
  }

  if (!target || ["remove", "indoor"].includes(intent.action)) {
    const fallback = reviseDajeongPlan(contextualPlan, instruction);
    if (fallback.changedCategories.length) return fallback;
    const message = "말씀하신 뜻을 일정에 연결할 대상을 아직 확실히 고르지 못했어요. 장소 이름이나 ‘두 번째 일정’, ‘저녁 이후’처럼 편한 방식으로 가리켜 주세요.";
    return { plan: appendPlanConversation(contextualPlan, instruction, message), message, changedCategories: [] };
  }

  if (intent.action === "cheaper") {
    const fallback = reviseDajeongPlan(contextualPlan, instruction);
    if (fallback.changedCategories.length) {
      return { ...fallback, message: `${fallback.message} 실제 후보의 표시 가격과 링크에서 결제 전 금액을 다시 확인해 주세요.` };
    }
  }

  const existingIndex = requestedItemId
    ? contextualPlan.items.findIndex((item) => item.id === requestedItemId)
    : contextualPlan.items.findIndex((item) => item.category === target);
  const existing = existingIndex >= 0 ? contextualPlan.items[existingIndex] : undefined;
  const base = existing ?? getOptions(target, contextualPlan.situation)[0];
  if (!base) return reviseDajeongPlan(contextualPlan, instruction);
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
      return { plan: next, message, changedCategories: [target], searchedRealPlaces: 0 };
    }
    const fallback = reviseDajeongPlan(contextualPlan, instruction);
    if (fallback.changedCategories.length) return { ...fallback, message: `${fallback.message} 다만 지금은 실시간 장소 검색 결과가 없어 기본 후보로 조정했어요.`, searchedRealPlaces: 0 };
    const message = `${plan.situation.region}에서 조건에 맞는 실제 후보를 지금 확인하지 못했어요. 지역이나 원하는 분위기를 조금 다르게 말해 주세요.`;
    return { plan: appendPlanConversation(contextualPlan, instruction, message), message, changedCategories: [], searchedRealPlaces: 0 };
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
  };
}
