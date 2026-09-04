import test from "node:test";
import assert from "node:assert/strict";

import { createDajeongPlan, replacePlanItem, restorePlanVersion, restoreReferencedCandidate, reviseDajeongPlan } from "../../dajeong/lib/plan-engine.ts";
import { applyDeterministicConversation, continuePlanningConversation, missingPlanningQuestions } from "../../dajeong/lib/planning-brain.ts";
import { analyzeSituation, parseSituation } from "../../dajeong/lib/situation.ts";
import { chainNameFor, haversineKm, kakaoCategoryMatches, rankRealPlaceCandidates } from "../../dajeong/lib/place-utils.ts";
import { createManualDajeongPlan, manualDefaults } from "../../dajeong/lib/manual-plan.ts";
import { handleExecutionInstruction } from "../../dajeong/lib/execution-conversation.ts";
import { applyProviderQuote, approvePayment, prepareReservationOrder, recordProviderExecutionResult, requestPaymentReview } from "../../dajeong/lib/reservation-engine.ts";
import { isIsolatedProductPath } from "../../lib/shell-route.ts";
import { clockToMinutes, lockPlanItem, scheduleDajeongPlan, setItemDuration } from "../../dajeong/lib/schedule-engine.ts";
import { classifyPlaceRequest, guessCategory, isSamePlaceName, stripRegionFromName } from "../../dajeong/lib/place-intent.ts";

test("상황 문장에서 대상·지역·예산·제약을 읽는다", () => {
  const situation = parseSituation({
    request: "내일 강남에서 여자친구 생일이야. 차 없고 술은 못 마시고 25만원 정도 생각해",
  });
  assert.equal(situation.recipient, "여자친구");
  assert.equal(situation.region, "강남");
  assert.equal(situation.budget, 250_000);
  assert.equal(situation.urgency, "tomorrow");
  assert.ok(situation.constraints.includes("논알코올"));
  assert.ok(situation.constraints.includes("차량 없이 이동"));
  assert.equal(situation.transport, "public_transit");
});

test("이미 말한 조건은 다시 묻지 않고 빠진 내용만 질문한다", () => {
  const understanding = analyzeSituation({ request: "내일 여자친구 생일인데 차 없이 특별하게 보내고 싶어" });
  assert.deepEqual(understanding.missing.sort(), ["budget", "region"]);
  assert.equal(understanding.recognized.some((fact) => fact.label === "날짜"), true);
  assert.equal(understanding.recognized.some((fact) => fact.value === "대중교통"), true);
});

test("이번 토요일처럼 요일로 말한 날짜를 다시 묻지 않는다", () => {
  const understanding = analyzeSituation({ request: "이번 토요일 성수에서 데이트, 20만원, 차 없음" });
  assert.equal(understanding.missing.includes("date"), false);
  assert.match(understanding.situation.targetDate, /^\d{4}-\d{2}-\d{2}$/);
});

test("모레와 차는 없고 같은 자연스러운 조사를 조건으로 이해한다", () => {
  const understanding = analyzeSituation({
    request: "모레 성수에서 남자친구 생일을 18만원 안으로 보내고 싶어. 차는 없고 조용한 곳을 좋아해.",
  });
  assert.deepEqual(understanding.missing, []);
  assert.equal(understanding.situation.transport, "public_transit");
  assert.equal(understanding.situation.recipient, "남자친구");
  assert.equal(understanding.situation.urgency, "soon");
});

test("계획 대화는 생성과 후속 요청을 시간순으로 기억한다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 여자친구와 20만원 데이트", budget: 200_000 });
  assert.equal(plan.conversation?.length, 2);
  assert.equal(plan.conversation?.[0].role, "user");
  const result = reviseDajeongPlan(plan, "이 장소들 주소는 어디야?");
  assert.equal(result.plan.conversation?.length, 4);
  assert.equal(result.plan.conversation?.at(-2)?.text, "이 장소들 주소는 어디야?");
  assert.equal(result.plan.conversation?.at(-1)?.role, "assistant");
});

test("기본 계획은 예산을 넘지 않고 준비 순서가 실제 동선에 맞다", () => {
  const plan = createDajeongPlan({
    request: "내일 여자친구 생일인데 아무것도 준비 못했어",
    budget: 180_000,
    targetDate: "2026-09-01",
    region: "서울",
  });
  assert.ok(plan.total <= plan.budget, `${plan.total}은 ${plan.budget} 이하여야 한다`);
  assert.equal(plan.items[0].category, "activity");
  assert.equal(plan.items.at(-1)?.category, "view");
  assert.equal(plan.items.find((item) => item.category === "meal")?.time, "18:30");
  assert.match(plan.items.find((item) => item.category === "meal")?.title ?? "", /이탈리안/);
  assert.ok(plan.items.every((item) => item.imageUrl && item.reason));
});

test("작은 예산에서는 필수 경험만 남겨도 상한을 지킨다", () => {
  const plan = createDajeongPlan({ request: "오늘 기념일을 준비해야 해", budget: 80_000 });
  assert.ok(plan.total <= 80_000, `8만원 계획이 ${plan.total}원이다`);
  assert.deepEqual(plan.items.map((item) => item.category), ["activity", "meal", "view"]);
});

test("항목을 교체하면 총액과 남은 예산을 다시 계산한다", () => {
  const plan = createDajeongPlan({ request: "이번 주말 데이트", budget: 220_000 });
  const meal = plan.items.find((item) => item.category === "meal");
  assert.ok(meal);
  const replacement = meal.alternatives[0];
  const next = replacePlanItem(plan, "meal", replacement.id);
  assert.equal(next.items.find((item) => item.category === "meal")?.id, replacement.id);
  assert.equal(next.budgetRemaining, next.budget - next.total);
});

test("실제 장소 후보를 직접 교체하면 이동거리와 이동시간도 같은 상태에서 다시 계산한다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 서울 여자친구 데이트 30만원", budget: 300_000, region: "서울" });
  const mealIndex = plan.items.findIndex((item) => item.category === "meal");
  const meal = plan.items[mealIndex];
  const previous = plan.items[mealIndex - 1];
  const replacement = meal.alternatives[0];
  assert.ok(previous && replacement);
  const withCoordinates = {
    ...plan,
    items: plan.items.map((item, index) => index === mealIndex - 1 ? {
      ...item,
      reality: { ...item.reality, latitude: 37.544, longitude: 127.055 },
    } : index === mealIndex ? {
      ...item,
      alternatives: item.alternatives.map((option, optionIndex) => optionIndex === 0 ? {
        ...option,
        reality: { ...option.reality, latitude: 37.566, longitude: 126.978 },
      } : option),
    } : item),
  };
  const next = replacePlanItem(withCoordinates, "meal", replacement.id, meal.id);
  const changedMeal = next.items.find((item) => item.category === "meal");
  assert.ok((changedMeal?.reality?.distanceFromPreviousKm ?? 0) > 5);
  assert.ok((changedMeal?.travelFromPrevious?.minutes ?? 0) > 20);
  assert.equal(changedMeal?.reality?.travelEstimateMinutes, changedMeal?.travelFromPrevious?.minutes);
});

test("자연어 수정은 요청한 일정만 바꾸고 나머지는 보존한다", () => {
  const plan = createDajeongPlan({ request: "서울에서 여자친구와 기념일 데이트 30만원", budget: 300_000 });
  const activity = plan.items.find((item) => item.category === "activity")?.id;
  const result = reviseDajeongPlan(plan, "저녁 식당만 바꿔줘");
  assert.ok(result.changedCategories.includes("meal"));
  assert.equal(result.plan.items.find((item) => item.category === "activity")?.id, activity);
  assert.notEqual(result.plan.items.find((item) => item.category === "meal")?.id, plan.items.find((item) => item.category === "meal")?.id);
});

test("실내 위주 수정은 야외 일정을 실내 대안으로 바꾼다", () => {
  const plan = createDajeongPlan({ request: "서울에서 기념일 데이트 30만원", budget: 300_000 });
  const result = reviseDajeongPlan(plan, "비가 오니까 실내 위주로 바꿔줘");
  assert.ok(result.plan.situation.constraints.includes("실내 위주"));
  assert.ok(result.plan.items.every((item) => item.venueType !== "outdoor"));
});

test("다정 경로는 기존 제품 셸과 격리된다", () => {
  assert.equal(isIsolatedProductPath("/dajeong"), true);
  assert.equal(isIsolatedProductPath("/dajeong/plan/demo"), true);
});

test("실제 장소 후보는 평점뿐 아니라 앞 일정과의 거리와 예산을 함께 반영한다", () => {
  const checkedAt = new Date().toISOString();
  const candidates = [
    { id: "far", name: "멀리 있는 고평점", address: "서울 강남", latitude: 37.50, longitude: 127.05, rating: 4.9, reviewCount: 1000, priceLevel: 4, openNow: true, openingHours: [], businessStatus: "operational", mapsUrl: "https://maps.google.com", source: "google_places", sourceLabel: "Google Places", checkedAt },
    { id: "near", name: "가까운 좋은 후보", address: "서울 성수", latitude: 37.545, longitude: 127.055, rating: 4.6, reviewCount: 320, priceLevel: 2, openNow: true, openingHours: [], businessStatus: "operational", mapsUrl: "https://maps.google.com", source: "google_places", sourceLabel: "Google Places", checkedAt },
  ];
  const ranked = rankRealPlaceCandidates(candidates, { latitude: 37.544, longitude: 127.055 }, "meal", 80_000, 72_000);
  assert.equal(ranked[0].id, "near");
  assert.ok((haversineKm(candidates[0], candidates[1]) ?? 0) > 3);
});

test("상대 취향과 음식 제약을 자유로운 문장에서 기억한다", () => {
  const situation = parseSituation({ request: "엄마 생일인데 매운 건 못 드시고 조용하게 대화할 수 있는 한식집이 좋아. 이번 토요일 성수, 20만원" });
  assert.equal(situation.recipient, "어머니");
  assert.ok(situation.preferences.includes("조용한 분위기"));
  assert.ok(situation.preferences.includes("한식"));
  assert.ok(situation.constraints.includes("맵지 않은 음식"));
});

test("흔한 체인과 지점형 매장을 로컬 후보로 오인하지 않는다", () => {
  assert.equal(chainNameFor("이삭토스트 성수점"), "이삭토스트");
  assert.equal(chainNameFor("어떤식당 성수점"), "지점형 매장");
  assert.equal(chainNameFor("맛차차"), undefined);
});

test("예약 제휴가 없을 때 자동 예약을 가장하지 않고 공식 경로로 넘긴다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 여자친구 생일 20만원", budget: 200_000, region: "성수", targetDate: "2026-09-05" });
  const order = prepareReservationOrder(plan);
  assert.ok(order.tasks.length > 0);
  assert.ok(order.tasks.every((task) => task.capability === "assisted"));
  assert.equal(order.status, "partially_manual");
});

test("여자친구 생일 요청은 취향과 특별함을 담은 하루 흐름으로 만든다", () => {
  const plan = createDajeongPlan({
    request: "여자친구 생일인데 서울에서 30만원 안으로 특별하게 보내고 싶어. 차 없어.",
    budget: 300_000,
    region: "서울",
    targetDate: "2026-09-05",
  });
  assert.equal(plan.situation.recipient, "여자친구");
  assert.equal(plan.situation.transport, "public_transit");
  assert.equal(plan.situation.planScope, "day");
  assert.ok(plan.total <= 300_000);
  assert.ok((plan.experienceFlow?.labels.length ?? 0) >= 3);
  assert.ok(plan.items.some((item) => item.id === plan.experienceFlow?.highlightItemId));
  assert.ok(plan.items.every((item) => (item.experience?.specialnessScore ?? 0) >= 45));
});

test("오늘 신비로운 데이트 요청을 감성 신호로 번역한다", () => {
  const situation = parseSituation({ request: "오늘 여자친구랑 뭔가 신비롭고 분위기 좋은 데 가고 싶어." });
  assert.equal(situation.urgency, "today");
  assert.ok(situation.desiredMoods.includes("mysterious"));
  assert.ok(situation.preferences.some((value) => /신비|몽환/.test(value)));
});

test("엄마 생신 요청은 나이보다 실제 이동 제약과 취향을 우선한다", () => {
  const situation = parseSituation({ request: "엄마 생신인데 60대시고 정원과 공연을 좋아해. 너무 많이 걷지 않고 특별하게 보내고 싶어. 이번 토요일 서울 25만원." });
  assert.equal(situation.recipient, "어머니");
  assert.equal(situation.ageBand, "60대 이상");
  assert.ok(situation.constraints.includes("도보 이동 최소화"));
  assert.ok(situation.preferences.some((value) => /정원|자연/.test(value)));
});

test("친구 4명의 평범하지 않은 주말을 인원과 재미 중심으로 이해한다", () => {
  const situation = parseSituation({ request: "이번 주말 친구 4명이 서울에서 평범하지 않게 놀고 싶어. 24만원 정도." });
  assert.equal(situation.partySize, 4);
  assert.ok(situation.desiredMoods.includes("playful"));
  assert.ok(situation.preferences.some((value) => /특별|흔하지|재미/.test(value)));
});

test("식당을 고정하고 놀거리만 바꾸면 다른 일정은 보존한다", () => {
  const plan = createDajeongPlan({ request: "서울에서 친구 4명이 평범하지 않게 놀고 싶어. 30만원", budget: 300_000 });
  const mealId = plan.items.find((item) => item.category === "meal")?.id;
  const activityId = plan.items.find((item) => item.category === "activity")?.id;
  const result = reviseDajeongPlan(plan, "식당은 그대로 두고 놀거리만 더 재밌는 걸로 바꿔줘.");
  assert.equal(result.plan.items.find((item) => item.category === "meal")?.id, mealId);
  assert.notEqual(result.plan.items.find((item) => item.category === "activity")?.id, activityId);
  assert.deepEqual(result.changedCategories, ["activity"]);
});

test("특별한 분위기와 공간성이 평점만 높은 평범한 후보보다 앞설 수 있다", () => {
  const checkedAt = new Date().toISOString();
  const situation = parseSituation({ request: "이번 토요일 성수에서 신비롭고 특별한 카페를 가고 싶어" });
  const ranked = rankRealPlaceCandidates([
    { id: "ordinary", name: "평범한 인기 카페", address: "서울 성수", latitude: 37.544, longitude: 127.055, rating: 4.8, reviewCount: 900, priceLevel: 2, openNow: true, openingHours: [], businessStatus: "operational", mapsUrl: "https://maps.google.com", source: "google_places", sourceLabel: "Google Places", checkedAt },
    { id: "special", name: "빛의 온실 미디어아트 카페", address: "서울 성수", latitude: 37.545, longitude: 127.055, rating: 4.5, reviewCount: 300, priceLevel: 2, openNow: true, openingHours: [], businessStatus: "operational", mapsUrl: "https://maps.google.com", source: "google_places", sourceLabel: "Google Places", checkedAt, editorialSummary: "몽환적인 빛과 정원을 경험하는 독립 로컬 공간", localIndependent: true },
  ], { latitude: 37.544, longitude: 127.055 }, "cafe", 40_000, 35_000, situation, "신비로운 특별한 카페");
  assert.equal(ranked[0].id, "special");
});

test("하나의 예약과 여행 요청을 같은 입력창에서 서로 다른 범위로 분류한다", () => {
  const reservation = createDajeongPlan({ request: "내일 저녁 7시 강남에서 4명 조용한 식당 찾아줘", region: "강남", targetDate: "2026-09-02" });
  const trip = createDajeongPlan({ request: "다음 달 여자친구랑 제주도 3박4일 여행 가고 싶어. 감성적인 숙소와 특별한 경험을 원해.", budget: 1_000_000, region: "제주", targetDate: "2026-10-10" });
  assert.equal(reservation.situation.planScope, "single");
  assert.deepEqual(reservation.items.map((item) => item.category), ["meal"]);
  assert.equal(reservation.situation.partySize, 4);
  assert.equal(trip.situation.planScope, "trip");
  assert.equal(trip.situation.tripDays, 4);
  assert.match(trip.title, /4일의 여행/);
});

test("숙박 여행은 체크인 숙소와 일차별 일정을 만들고 반복 일정도 고유하게 구분한다", () => {
  const trip = createDajeongPlan({
    request: "친구 4명이 가평으로 1박2일 여행을 가고 싶어. 차 없고 감성적인 숙소가 좋아.",
    recipient: "친구",
    planScope: "trip",
    tripDays: 2,
    tripNights: 1,
    region: "가평",
    budget: 600_000,
    targetDate: "2026-09-05",
    transport: "public_transit",
  });
  const lodging = trip.items.find((item) => item.category === "lodging");
  assert.ok(lodging);
  assert.equal(lodging.time, "15:00");
  assert.equal(lodging.dayNumber, 1);
  assert.ok(trip.items.some((item) => item.dayNumber === 2));
  assert.equal(new Set(trip.items.map((item) => item.id)).size, trip.items.length);
});

test("여행의 두 번째 날 후보만 바꾸면 첫날 같은 종류 일정은 유지한다", () => {
  const trip = createDajeongPlan({
    request: "여자친구와 제주 1박2일 특별한 여행",
    recipient: "여자친구",
    planScope: "trip",
    tripDays: 2,
    tripNights: 1,
    region: "제주",
    budget: 700_000,
    targetDate: "2026-10-10",
  });
  const activities = trip.items.filter((item) => item.category === "activity");
  assert.equal(activities.length, 2);
  const replacement = activities[1].alternatives[0];
  assert.ok(replacement);
  const changed = replacePlanItem(trip, "activity", replacement.id, activities[1].id);
  assert.equal(changed.items.find((item) => item.id === activities[0].id)?.title, activities[0].title);
  assert.ok(changed.items.some((item) => item.dayNumber === 2 && item.category === "activity" && item.title === replacement.title));
});

test("하루위드 멀티턴 여행 대화는 9턴의 조건을 잃지 않고 질문을 멈춘다", async () => {
  const turns = [
    "나 여친이랑 제주도 가고 싶은데 뭐하고 놀지",
    "2박3일",
    "일주일 뒤",
    "숙소까지 100만원",
    "렌터카",
    "오션뷰",
    "힐링이랑 액티비티 둘 다",
    "딱히 꼭 하고 싶은 건 없어",
    "도착 오후 3시, 돌아가는 것도 오후 3시쯤",
  ];
  const expectedQuestions = ["tripLength", "date", "budget", "transport", "lodgingPreference", "preference", "mustHave", "arrivalTime", null];
  let messages = [];
  let draft = {};
  let currentQuestion = null;
  let result;
  for (let index = 0; index < turns.length; index += 1) {
    messages.push({ role: "user", text: turns[index] });
    result = await continuePlanningConversation({ messages, draft, currentQuestion });
    assert.equal(result.questionKey, expectedQuestions[index]);
    messages.push({ role: "assistant", text: result.reply });
    draft = result.draft;
    currentQuestion = result.questionKey;
  }
  assert.equal(result.ready, true);
  assert.equal(result.draft.recipient, "여자친구");
  assert.equal(result.draft.region, "제주");
  assert.equal(result.draft.tripDays, 3);
  assert.equal(result.draft.tripNights, 2);
  assert.equal(result.draft.budget, 1_000_000);
  assert.equal(result.draft.transport, "car");
  assert.equal(result.draft.lodgingPreference, "오션뷰");
  assert.equal(result.draft.arrivalTime, "15:00");
  assert.equal(result.draft.returnDepartureTime, "15:00");
  assert.ok(result.draft.explicitUnknowns.includes("mustHave"));
});

test("한 문장에 제공한 날짜·동행·지역·예산·교통·선호·비선호를 다시 묻지 않는다", () => {
  const draft = applyDeterministicConversation([{ role: "user", text: "다음주 금요일 여자친구랑 서울에서 15만원 안으로 차 없이 놀고 싶어. 전시는 좋아하고 공방은 싫어." }], {});
  // 하루 코스에는 식사가 들어가므로 "몇 시에 먹을지"는 아직 물어야 한다 — 나머지는 다시 묻지 않는다.
  assert.deepEqual(missingPlanningQuestions(draft), ["mealTime"]);
  assert.equal(draft.budget, 150_000);
  assert.equal(draft.transport, "public_transit");
  assert.ok(draft.preferences.includes("전시"));
  assert.ok(draft.constraints.includes("공방 제외"));
  assert.ok(draft.personMemoryUpdate.likedActivities.includes("전시"));
  assert.ok(draft.personMemoryUpdate.dislikedActivities.includes("공방"));
});

test("식당과 꽃 요청은 각각 하나의 목적만 유지한다", () => {
  const restaurant = applyDeterministicConversation([{ role: "user", text: "성수에서 분위기 좋은 식당 찾아줘." }], {});
  const flower = applyDeterministicConversation([{ role: "user", text: "여친 줄 꽃다발 예약하고 싶어." }], {});
  assert.equal(restaurant.planScope, "single");
  assert.equal(restaurant.singleCategory, "meal");
  assert.deepEqual(missingPlanningQuestions(restaurant), ["budget", "mealTime", "preference"]);
  assert.equal(flower.planScope, "single");
  assert.equal(flower.singleCategory, "flower");
  assert.equal(flower.requestKind, "reservation");
  assert.equal(flower.recipient, "여자친구");
  assert.ok(missingPlanningQuestions(flower).includes("budget"));
});

test("선물/식당처럼 단일 항목 검색도 예산을 묻기 전엔 준비 완료로 넘어가지 않는다", () => {
  const gift = applyDeterministicConversation([{ role: "user", text: "성수에서 여자친구한테 줄 선물 찾아줘" }], {});
  assert.deepEqual(missingPlanningQuestions(gift).sort(), ["budget", "preference"]);
  const withBudget = applyDeterministicConversation(
    [{ role: "user", text: "성수에서 여자친구한테 줄 선물 찾아줘" }, { role: "assistant", text: "예산은 어느 정도로 생각해?" }, { role: "user", text: "10만원 정도, 로맨틱한 걸로" }],
    { ...gift },
    "budget",
  );
  assert.equal(withBudget.budget, 100_000);
  assert.deepEqual(missingPlanningQuestions(withBudget), []);
});

test("넓은 지역(인천 등)만 말하면 동네를 한 번 더 물어본다", () => {
  const first = applyDeterministicConversation([{ role: "user", text: "인천에서 맛있는 식당 찾아줘" }], {});
  assert.equal(first.region, "인천");
  assert.ok(missingPlanningQuestions(first).includes("region"));
  const narrowed = applyDeterministicConversation(
    [{ role: "user", text: "인천에서 맛있는 식당 찾아줘" }, { role: "assistant", text: "인천은 넓은데 동네를 알려줄 수 있어?" }, { role: "user", text: "성수" }],
    { ...first },
    "region",
  );
  assert.equal(narrowed.region, "성수");
  assert.ok(!missingPlanningQuestions(narrowed).includes("region"));

  const stillBroad = applyDeterministicConversation(
    [{ role: "user", text: "인천에서 맛있는 식당 찾아줘" }, { role: "assistant", text: "인천은 넓은데 동네를 알려줄 수 있어?" }, { role: "user", text: "그냥 인천이요" }],
    { ...first },
    "region",
  );
  assert.equal(stillBroad.region, "인천");
  assert.ok(stillBroad.explicitUnknowns.includes("regionNarrowed"));
  assert.ok(!missingPlanningQuestions(stillBroad).includes("region"));
});

test("생일이라는 이유만으로 요청하지 않은 꽃·선물·케이크를 끼워 넣지 않는다", () => {
  const plan = createDajeongPlan({ request: "다음주 금요일 서울에서 여자친구 생일 데이트 40만원", budget: 400_000, region: "서울" });
  assert.equal(plan.items.some((item) => ["flower", "gift", "cake"].includes(item.category)), false);
});

test("처음 계획 버전은 장소·시간표·예산을 통째로 복원한다", () => {
  const initial = createDajeongPlan({ request: "이번 토요일 서울 여자친구 데이트 30만원", budget: 300_000, region: "서울" });
  const changed = reviseDajeongPlan(initial, "저녁 식당만 바꿔줘").plan;
  assert.ok((changed.versions?.length ?? 0) >= 2);
  const restored = restorePlanVersion(changed, changed.versions[0], "처음 걸로 돌아가자");
  assert.deepEqual(restored.items.map((item) => item.title), initial.items.map((item) => item.title));
  assert.equal(restored.total, initial.total);
  assert.equal(restored.budgetRemaining, initial.budgetRemaining);
});

test("아까 두 번째 후보 문맥은 직전 수정 카테고리의 실제 후보를 복원한다", () => {
  const initial = createDajeongPlan({ request: "이번 토요일 서울 여자친구 데이트 30만원", budget: 300_000, region: "서울" });
  const changed = reviseDajeongPlan(initial, "식당만 바꿔줘").plan;
  const mealBeforeRestore = changed.items.find((item) => item.category === "meal");
  const expected = mealBeforeRestore?.alternatives[0];
  const restored = restoreReferencedCandidate(changed, "아까 두 번째가 더 좋아");
  assert.ok(expected);
  assert.ok(restored);
  assert.equal(restored.category, "meal");
  assert.equal(restored.plan.items.find((item) => item.category === "meal")?.title, expected.title);
  assert.deepEqual(
    restored.plan.items.filter((item) => item.category !== "meal").map((item) => item.id),
    changed.items.filter((item) => item.category !== "meal").map((item) => item.id),
  );
});

test("도착과 귀가 시간이 있는 여행은 체크인·체크아웃·짐·출발 물류를 만든다", () => {
  const trip = createDajeongPlan({
    request: "여자친구와 제주 2박3일 여행",
    recipient: "여자친구",
    planScope: "trip",
    tripDays: 3,
    tripNights: 2,
    region: "제주",
    budget: 1_000_000,
    targetDate: "2026-09-08",
    transport: "public_transit",
    arrivalTime: "15:00",
    returnDepartureTime: "15:00",
  });
  assert.ok(trip.logistics.some((item) => item.kind === "arrival" && item.time === "15:00"));
  assert.ok(trip.logistics.some((item) => item.kind === "checkout"));
  assert.ok(trip.logistics.some((item) => item.kind === "luggage"));
  assert.ok(trip.logistics.some((item) => item.kind === "departure" && item.time === "15:00"));
  assert.ok(trip.items.filter((item) => item.dayNumber === 3).every((item) => item.time < "15:00"));
});

test("10턴 넘게 조건을 추가해도 앞의 구조화 상태가 유지된다", () => {
  const turns = ["여자친구랑", "서울에서", "다음주 금요일", "15만원", "차 없이", "전시 좋아", "공방 싫어", "야경 좋아", "사람 많은 곳 싫어", "많이 걷기는 싫어", "조용한 식당", "카페는 빼줘"];
  let draft = {};
  const messages = [];
  for (const text of turns) {
    messages.push({ role: "user", text });
    draft = applyDeterministicConversation(messages, draft);
  }
  assert.equal(draft.recipient, "여자친구");
  assert.equal(draft.region, "서울");
  assert.equal(draft.budget, 150_000);
  assert.equal(draft.transport, "public_transit");
  assert.ok(draft.constraints.includes("공방 제외"));
  assert.ok(draft.excludedCategories.includes("cafe"));
});

test("멀티턴의 최신 명시 조건은 이전 초안보다 우선한다", () => {
  const firstMessages = [{ role: "user", text: "다음주 금요일 여자친구랑 서울에서 15만원으로 전시 보고 싶어" }];
  const first = applyDeterministicConversation(firstMessages, {});
  const messages = [...firstMessages, { role: "assistant", text: "좋아" }, { role: "user", text: "아, 남자친구랑 부산에서 야경 보는 걸로 바꿀게" }];
  const changed = applyDeterministicConversation(messages, first);
  assert.equal(changed.recipient, "남자친구");
  assert.equal(changed.region, "부산");
  assert.ok(changed.preferences.some((value) => /야경/.test(value)));
  assert.match(changed.request, /부산에서 야경/);
});

test("카페 제거는 실제 항목·총예산·시간표 상태에 함께 반영된다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 서울 여자친구 데이트 30만원", budget: 300_000, region: "서울" });
  const result = reviseDajeongPlan(plan, "카페 빼줘");
  assert.equal(result.plan.items.some((item) => item.category === "cafe"), false);
  assert.ok(result.plan.total < plan.total);
  assert.equal(result.plan.budgetRemaining, result.plan.budget - result.plan.total);
});

test("평범하다는 수정은 조건을 유지하면서 핵심 경험 후보만 강화한다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 서울 여자친구 데이트 40만원", budget: 400_000, region: "서울" });
  const result = reviseDajeongPlan(plan, "너무 평범한데? 좀 더 특별하게 해줘");
  assert.equal(result.plan.situation.region, plan.situation.region);
  assert.equal(result.plan.situation.targetDate, plan.situation.targetDate);
  assert.ok(result.changedCategories.every((category) => ["activity", "meal", "view"].includes(category)));
});

test("현실 실행 1: 성수 식당 요청은 식당 하나만 실행 대상으로 유지한다", () => {
  const plan = createDajeongPlan({ request: "성수에서 오늘 저녁 분위기 좋은 식당 찾아줘.", region: "성수", targetDate: "2026-09-02" });
  const order = prepareReservationOrder(plan);
  assert.deepEqual(plan.items.map((item) => item.category), ["meal"]);
  assert.equal(order.tasks.filter((task) => task.kind !== "logistics").length, 1);
  assert.equal(order.tasks[0].itemId, plan.items[0].id);
});

test("현실 실행 2: 이거 예약해줘는 현재 선택 식당의 방식 확인 상태로 연결한다", () => {
  const plan = createDajeongPlan({ request: "성수에서 오늘 저녁 분위기 좋은 식당 찾아줘.", region: "성수", targetDate: "2026-09-02" });
  const result = handleExecutionInstruction(plan, "이거 예약해줘");
  assert.equal(result.handled, true);
  assert.deepEqual(result.targetItemIds, [plan.items[0].id]);
  assert.notEqual(result.plan.execution?.tasks[0].status, "booked");
  assert.match(result.message, /완료|확인|예약 방식/);
});

test("현실 실행 3: 전화 예약만 가능한 곳은 전화 문구를 만들고 완료로 가장하지 않는다", () => {
  const base = createDajeongPlan({ request: "성수에서 오늘 저녁 분위기 좋은 식당 찾아줘.", region: "성수", targetDate: "2026-09-02" });
  const plan = {
    ...base,
    items: base.items.map((item) => ({
      ...item,
      reality: { ...item.reality, bookingMethod: "phone_only", phoneNumber: "02-1234-5678", phoneHours: ["11:00-20:00"] },
    })),
  };
  const order = prepareReservationOrder(plan);
  assert.equal(order.tasks[0].status, "phone_required");
  assert.equal(order.tasks[0].confirmation, undefined);
  assert.match(order.tasks[0].phoneScript ?? "", /가능한지 문의/);
});

test("현실 실행 4: 꽃다발 요청은 꽃 탐색과 주문 준비만 만든다", () => {
  const plan = createDajeongPlan({ request: "여친 줄 꽃다발 5만원 안으로 내일 픽업하고 싶어.", budget: 50_000, targetDate: "2026-09-03" });
  const execution = handleExecutionInstruction(plan, "이 꽃다발 주문해줘").plan.execution;
  assert.deepEqual(plan.items.map((item) => item.category), ["flower"]);
  assert.equal(execution?.tasks.length, 1);
  assert.equal(execution?.tasks[0].kind, "purchase");
});

test("현실 실행 5: 제주 여행 실행 계획은 렌터카·숙소·체크아웃·귀가편을 연결한다", () => {
  const plan = createDajeongPlan({
    request: "여자친구와 제주도 2박3일 여행",
    recipient: "여자친구",
    planScope: "trip",
    tripDays: 3,
    tripNights: 2,
    region: "제주",
    budget: 1_000_000,
    targetDate: "2026-09-09",
    transport: "car",
    arrivalTime: "15:00",
    returnDepartureTime: "15:00",
    lodgingPreference: "오션뷰",
  });
  const order = prepareReservationOrder(plan, { includeTravel: true });
  assert.ok(order.tasks.some((task) => task.kind === "lodging"));
  assert.ok(order.tasks.some((task) => task.title.includes("렌터카 수령")));
  assert.ok(order.tasks.some((task) => task.title.includes("체크아웃")));
  assert.ok(order.tasks.some((task) => task.title.includes("렌터카 반납") && task.time === "13:00"));
  assert.ok(order.tasks.some((task) => task.title.includes("귀가편") && task.time === "15:00"));
});

test("현실 실행 6: 첫날 저녁만 바꾸면 다른 날 실행 대상과 일정은 보존한다", () => {
  const plan = createDajeongPlan({ request: "제주 2박3일 여행", planScope: "trip", tripDays: 3, tripNights: 2, region: "제주", budget: 1_000_000, targetDate: "2026-09-09" });
  const firstMeal = plan.items.find((item) => item.category === "meal" && item.dayNumber === 1);
  const otherIds = plan.items.filter((item) => item.id !== firstMeal?.id).map((item) => item.id);
  assert.ok(firstMeal);
  const withAlternative = {
    ...plan,
    items: plan.items.map((item) => item.id === firstMeal.id ? { ...item, alternatives: [{ ...item, id: `${item.id}-alternative`, title: "첫날 저녁 대안", price: item.price - 5_000 }] } : item),
  };
  const executing = { ...withAlternative, execution: prepareReservationOrder(withAlternative, { includeTravel: true }) };
  const unaffectedTaskIds = executing.execution.tasks.filter((task) => task.itemId !== firstMeal.id).map((task) => task.id);
  const changed = reviseDajeongPlan(executing, "첫날 저녁만 바꿔줘").plan;
  assert.deepEqual(changed.items.filter((item) => item.dayNumber !== 1 || item.category !== "meal").map((item) => item.id), otherIds);
  assert.ok(unaffectedTaskIds.every((taskId) => changed.execution?.tasks.some((task) => task.id === taskId)));
  assert.equal(changed.execution?.tasks.some((task) => task.itemId === firstMeal.id), false);
});

test("현실 실행 7: 결제 요청은 정확한 항목과 금액을 먼저 보여주고 승인 대기한다", () => {
  const plan = createDajeongPlan({ request: "오늘 볼 전시 찾아줘", targetDate: "2026-09-02" });
  let order = prepareReservationOrder(plan);
  order = applyProviderQuote(order, order.tasks[0].id, { available: true, confirmedTotalAmount: 72_000, prepayAmount: 72_000, onsiteAmount: 0, quoteId: "quote-72", checkedAt: new Date().toISOString() });
  const result = handleExecutionInstruction({ ...plan, execution: order }, "이걸로 결제해");
  order = result.plan.execution;
  assert.equal(order.status, "needs_approval");
  assert.equal(order.approval?.amount, 72_000);
  assert.equal(order.approval?.state, "requested");
});

test("현실 실행 8: 좋네 같은 애매한 긍정은 결제 승인이 아니다", () => {
  const plan = createDajeongPlan({ request: "오늘 볼 전시 찾아줘", targetDate: "2026-09-02" });
  let order = prepareReservationOrder(plan);
  order = requestPaymentReview(applyProviderQuote(order, order.tasks[0].id, { available: true, confirmedTotalAmount: 72_000, prepayAmount: 72_000, onsiteAmount: 0, quoteId: "quote-72", checkedAt: new Date().toISOString() }));
  const result = handleExecutionInstruction({ ...plan, execution: order }, "좋네");
  assert.equal(result.handled, true);
  assert.equal(result.plan.execution?.approval?.state, "requested");
});

test("현실 실행 9: 승인 뒤 가격이 오르면 자동 결제하지 않고 재승인 상태가 된다", () => {
  const plan = createDajeongPlan({ request: "오늘 볼 전시 찾아줘", targetDate: "2026-09-02" });
  let order = prepareReservationOrder(plan);
  order = requestPaymentReview(applyProviderQuote(order, order.tasks[0].id, { available: true, confirmedTotalAmount: 72_000, prepayAmount: 72_000, onsiteAmount: 0, quoteId: "quote-72", checkedAt: new Date().toISOString() }));
  order = approvePayment(order, `${order.tasks[0].title} 72000원 결제 승인에 동의합니다`);
  assert.equal(order.approval?.state, "granted");
  order = applyProviderQuote(order, order.tasks[0].id, { available: true, confirmedTotalAmount: 80_000, prepayAmount: 80_000, onsiteAmount: 0, quoteId: "quote-80", checkedAt: new Date().toISOString() });
  assert.equal(order.approval?.state, "reapproval_required");
  assert.equal(order.status, "needs_approval");
});

test("현실 실행 10: 여러 실행 중 하나가 실패하면 성공과 실패를 각각 보존한다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 서울 여자친구 데이트 30만원", budget: 300_000, region: "서울" });
  let order = prepareReservationOrder(plan);
  assert.ok(order.tasks.length >= 2);
  order = recordProviderExecutionResult(order, order.tasks[0].id, { ok: true, confirmationId: "confirmed-1", confirmedAt: new Date().toISOString() });
  order = recordProviderExecutionResult(order, order.tasks[1].id, { ok: false, reason: "매진", alternativeRequired: true });
  assert.equal(order.status, "partially_completed");
  assert.ok(order.tasks.some((task) => ["booked", "purchased"].includes(task.status)));
  assert.ok(order.tasks.some((task) => task.status === "alternative_required"));
});

test("현실 일정 A: 토요일 14시부터 22시를 기억하고 시간과 지역을 다시 묻지 않는다", () => {
  const draft = applyDeterministicConversation([{ role: "user", text: "토요일 2시부터 10시까지 성수에서 여친이랑 놀 거야." }], {});
  assert.equal(draft.region, "성수");
  assert.equal(draft.availabilityStartTime, "14:00");
  assert.equal(draft.availabilityEndTime, "22:00");
  const missing = missingPlanningQuestions(draft);
  assert.equal(missing.includes("region"), false);
  assert.equal(missing.includes("date"), false);
  assert.equal(missing.includes("availabilityTime"), false);
  const withoutTime = applyDeterministicConversation([{ role: "user", text: "토요일 여친이랑 성수에서 놀려고." }], {});
  assert.equal(missingPlanningQuestions(withoutTime).includes("availabilityTime"), true);
});

test("현실 일정 B: 알찬 일정도 최소 체류시간 아래로 줄이거나 장소를 과하게 넣지 않는다", () => {
  const plan = createDajeongPlan({ request: "토요일 2시부터 10시까지 성수에서 여자친구랑 알차게 놀 거야", region: "성수", budget: 250_000, scheduleDensity: "compact", densitySpecified: true });
  assert.ok(plan.items.length <= 5);
  assert.ok(plan.items.every((item) => item.durationMinutes >= item.durationRange.minimumMinutes));
  assert.ok(clockToMinutes(plan.schedule.estimatedEndTime) <= clockToMinutes("22:00"));
});

test("현실 일정 C: 여유로운 일정은 장소 수와 이동을 줄이고 체류·완충시간을 늘린다", () => {
  const base = { region: "성수", budget: 250_000, availabilityStartTime: "14:00", availabilityEndTime: "22:00", densitySpecified: true };
  const compact = createDajeongPlan({ ...base, request: "성수에서 알차게 데이트", scheduleDensity: "compact" });
  const relaxed = createDajeongPlan({ ...base, request: "성수에서 여유롭게 데이트", scheduleDensity: "relaxed" });
  assert.ok(relaxed.items.length <= compact.items.length);
  assert.ok(relaxed.items.every((item) => item.durationMinutes >= item.durationRange.recommendedMinutes));
  assert.ok(relaxed.items.slice(0, -1).every((item) => item.bufferAfterMinutes >= 25));
});

test("현실 일정 D: 선택한 식당 체류시간을 늘리면 앞 일정은 보존하고 뒤 시간만 연쇄 조정한다", () => {
  const plan = createDajeongPlan({ request: "토요일 2시부터 10시까지 성수 데이트", region: "성수", budget: 250_000, availabilityStartTime: "14:00", availabilityEndTime: "22:00" });
  const meal = plan.items.find((item) => item.category === "meal");
  const beforeMeal = plan.items.filter((item) => clockToMinutes(item.time) < clockToMinutes(meal.time)).map((item) => ({ id: item.id, time: item.time }));
  const after = plan.items.find((item) => clockToMinutes(item.time) > clockToMinutes(meal.time));
  const changed = setItemDuration(plan, meal.id, meal.durationMinutes + 30);
  assert.equal(changed.items.find((item) => item.id === meal.id).durationMinutes, meal.durationMinutes + 30);
  assert.deepEqual(changed.items.filter((item) => beforeMeal.some((before) => before.id === item.id)).map((item) => ({ id: item.id, time: item.time })), beforeMeal);
  if (after) assert.ok(clockToMinutes(changed.items.find((item) => item.id === after.id).time) >= clockToMinutes(after.time));
});

test("현실 일정 E: 카페 2시간과 마지막 야경 고정을 동시에 만족한다", () => {
  let plan = createDajeongPlan({ request: "토요일 2시부터 10시까지 성수 데이트", region: "성수", budget: 250_000, availabilityStartTime: "14:00", availabilityEndTime: "22:00" });
  const cafe = plan.items.find((item) => item.category === "cafe");
  const view = plan.items.find((item) => item.category === "view");
  plan = setItemDuration(plan, cafe.id, 120);
  plan = lockPlanItem(plan, view.id, "place", "마지막 야경은 꼭 유지");
  assert.equal(plan.items.find((item) => item.id === cafe.id).durationMinutes, 120);
  assert.equal(plan.items.find((item) => item.id === view.id).placeLocked, true);
  assert.ok(plan.items.some((item) => item.id === view.id));
});

test("현실 일정 F: 오늘 피곤함은 이번 일정 밀도만 낮추고 사람 프로필을 바꾸지 않는다", () => {
  const profile = { id: "p", name: "여자친구", relation: "여자친구", ageBand: "20대", preferences: ["전시"], constraints: [], likedFoods: [], dislikedFoods: [], hobbies: [], moodPreferences: [], visitedPlaceIds: [], likedPlaceIds: [], dislikedPlaceIds: [], notes: [], updatedAt: new Date().toISOString() };
  const plan = createDajeongPlan({ request: "오늘 서울에서 여자친구와 데이트", region: "서울", budget: 200_000, personProfile: profile });
  const tired = scheduleDajeongPlan({ ...plan, situation: { ...plan.situation, temporaryCondition: { energy: "low", walkingLimited: false, notes: ["오늘 피곤함"] } } });
  assert.equal(tired.schedule.density, "relaxed");
  assert.deepEqual(tired.situation.personProfile, profile);
  assert.deepEqual(tired.situation.personMemoryUpdate, plan.situation.personMemoryUpdate);
});

test("현실 일정 G: 23시 귀가는 마지막 장소가 아니라 예상 귀가시간으로 역산한다", () => {
  const plan = createDajeongPlan({ request: "토요일 성수에서 여자친구랑 놀고 11시까지 집에 가야 돼", region: "성수", budget: 250_000, homeTravelMinutes: 45 });
  assert.equal(plan.situation.homeByTime, "23:00");
  assert.ok(clockToMinutes(plan.schedule.estimatedHomeArrival) <= clockToMinutes("23:00"));
  assert.equal(plan.schedule.dayWindows[0].endTime, "22:15");
});

test("현실 일정 H: 비 예보는 실내 여부뿐 아니라 도보 노출과 이동 피로도에 반영한다", () => {
  const plan = createDajeongPlan({ request: "오늘 서울에서 여자친구와 걸어서 데이트", region: "서울", budget: 200_000, transport: "walking", targetDate: "2026-09-02" });
  const positioned = plan.items.map((item, index) => ({ ...item, reality: { ...item.reality, latitude: 37.5 + index * .025, longitude: 127 + index * .025 } }));
  const weather = { status: "verified", sourceLabel: "테스트 예보", checkedAt: new Date().toISOString(), days: [{ date: "2026-09-02", hours: [], precipitationProbabilityMax: 90, precipitationMm: 12, windKphMax: 20, impact: "high" }], message: "강한 비 예보 확인" };
  const scheduled = scheduleDajeongPlan({ ...plan, items: positioned, schedule: { ...plan.schedule, weather } });
  assert.ok(scheduled.items.slice(1).some((item) => item.travelFromPrevious.weatherExposure === "high"));
  assert.ok(scheduled.items.slice(1).some((item) => item.travelFromPrevious.fatigue === "high"));
});

test("현실 일정 I: 제주 여행의 나쁜 날씨 날짜만 실내외 일정을 서로 재배치한다", () => {
  const plan = createDajeongPlan({ request: "제주 2박3일 여행", planScope: "trip", tripDays: 3, tripNights: 2, region: "제주", budget: 900_000, targetDate: "2026-09-09", arrivalTime: "11:00", returnDepartureTime: "18:00" });
  const outdoor = plan.items.find((item) => item.dayNumber === 1 && item.category === "activity");
  const indoor = plan.items.find((item) => item.dayNumber === 2 && item.category === "activity");
  const items = plan.items.map((item) => item.id === outdoor.id ? { ...item, venueType: "outdoor" } : item.id === indoor.id ? { ...item, venueType: "indoor" } : item);
  const weather = { status: "verified", sourceLabel: "테스트 예보", checkedAt: new Date().toISOString(), days: [{ date: "2026-09-09", hours: [], impact: "high" }, { date: "2026-09-10", hours: [], impact: "low" }, { date: "2026-09-11", hours: [], impact: "medium" }], message: "날짜별 예보" };
  const scheduled = scheduleDajeongPlan({ ...plan, items, schedule: { ...plan.schedule, weather } });
  assert.equal(scheduled.items.find((item) => item.id === outdoor.id).dayNumber, 2);
  assert.equal(scheduled.items.find((item) => item.id === indoor.id).dayNumber, 1);
  assert.equal(scheduled.logistics.find((item) => item.kind === "departure").time, plan.logistics.find((item) => item.kind === "departure").time);
});

test("현실 일정 J: 사용자가 꼭 간다고 고정한 장소는 일반 재추천에서 삭제하거나 교체하지 않는다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 서울 여자친구 데이트 30만원", budget: 300_000, region: "서울" });
  const activity = plan.items.find((item) => item.category === "activity");
  const locked = lockPlanItem(plan, activity.id, "place", "여긴 꼭 갈 거야");
  const revised = reviseDajeongPlan(locked, "너무 평범한데 더 특별하게 바꿔줘").plan;
  assert.equal(revised.items.find((item) => item.id === activity.id).title, activity.title);
  assert.equal(revised.items.find((item) => item.id === activity.id).placeLocked, true);
});

test("꽃집을 찾을 때 구청·장례식장은 후보에서 걸러진다", () => {
  // 실제로 겪은 문제: "인천 꽃집"을 찾았는데 미추홀구청이 후보로 올라왔다.
  assert.equal(kakaoCategoryMatches("가정,생활 > 꽃집,꽃배달", "봄날플라워", "flower"), true);
  assert.equal(kakaoCategoryMatches("사회,공공기관 > 행정기관 > 구청", "인천 미추홀구청", "flower"), false);
  assert.equal(kakaoCategoryMatches("의료,건강 > 장례식장", "○○장례식장 화환", "flower"), false);
});

test("업종 그룹코드가 맞으면 식당·카페로 인정한다", () => {
  assert.equal(kakaoCategoryMatches("음식점 > 양식 > 파스타", "리스토란테", "meal", "FD6"), true);
  assert.equal(kakaoCategoryMatches("음식점 > 카페 > 커피전문점", "동네커피", "cafe", "CE7"), true);
  assert.equal(kakaoCategoryMatches("사회,공공기관 > 행정기관", "주민센터", "meal", "PO3"), false);
});

test("평점을 아는 곳과 모르는 곳을 함께 줘도 낮은 평점은 밀린다", () => {
  const base = { address: "서울 성동구 성수일로 10", openNow: null, openingHours: [], businessStatus: "operational", mapsUrl: "https://place.map.kakao.com/1", checkedAt: new Date().toISOString(), latitude: 37.54, longitude: 127.05 };
  const ranked = rankRealPlaceCandidates([
    { ...base, id: "bad", name: "평점 낮은 집", rating: 3.2, reviewCount: 400, source: "google_places", sourceLabel: "Google" },
    { ...base, id: "good", name: "평점 좋은 집", rating: 4.6, reviewCount: 320, source: "google_places", sourceLabel: "Google" },
    { ...base, id: "kakao", name: "카카오만 아는 집", phoneNumber: "02-1234-5678", source: "kakao_local", sourceLabel: "카카오맵 등록 정보" },
  ], undefined, "meal", 80_000, 50_000);
  assert.equal(ranked[0].id, "good");
  assert.equal(ranked.some((place) => place.id === "bad"), false);
});

test("직접 고른 장소로 만든 계획도 시간순으로 정렬되고 합계가 맞는다", () => {
  const defaults = manualDefaults("meal");
  assert.ok(defaults.durationMinutes > 0);
  const plan = createManualDajeongPlan({
    request: "직접 만든 계획",
    region: "성수",
    budget: 200_000,
    picks: [
      { placeId: "b", name: "저녁 식당", address: "성수동 2가", category: "meal", time: "19:00", durationMinutes: 90, price: 80_000, mapsUrl: "https://place.map.kakao.com/2" },
      { placeId: "a", name: "오후 카페", address: "성수동 1가", category: "cafe", time: "15:00", durationMinutes: 60, price: 20_000, mapsUrl: "https://place.map.kakao.com/1" },
    ],
  });
  assert.equal(plan.items.length, 2);
  assert.equal(plan.items[0].title, "오후 카페");
  assert.equal(plan.items[1].title, "저녁 식당");
  // 직접 정한 시간은 스케줄러가 옮기지 않는다.
  assert.equal(plan.items[0].time, "15:00");
  assert.equal(plan.items[1].time, "19:00");
  assert.equal(plan.total, 100_000);
  assert.equal(plan.budgetRemaining, 100_000);
  assert.equal(plan.items[0].reality.detailsUrl, "https://place.map.kakao.com/1");
});

test("식사 시간과 선물 픽업 시간을 묻고, 모른다고 하면 다시 묻지 않는다", () => {
  const meal = applyDeterministicConversation([{ role: "user", text: "성수에서 분위기 좋은 식당 찾아줘" }], {});
  assert.ok(missingPlanningQuestions(meal).includes("mealTime"));

  const answered = applyDeterministicConversation(
    [{ role: "user", text: "성수에서 분위기 좋은 식당 찾아줘" }, { role: "assistant", text: "식사는 몇 시쯤이 좋아?" }, { role: "user", text: "아무때나" }],
    { ...meal },
    "mealTime",
  );
  assert.ok(!missingPlanningQuestions(answered).includes("mealTime"));

  const flower = applyDeterministicConversation([{ role: "user", text: "성수에서 여친 줄 꽃다발 예약하고 싶어" }], {});
  assert.ok(missingPlanningQuestions(flower).includes("pickupTime"));
});

// ── 지목 검색: "인천 까사올리브 찾아줘"에 엉뚱한 가게가 나오던 사고의 회귀 테스트 ─────────

test("상호명을 지목한 말과 조건만 말한 말을 구분한다", () => {
  const named = classifyPlaceRequest("인천 까사올리브 찾아줘");
  assert.equal(named.kind, "specific");
  // "찾아줘"가 검색어에 남으면 카카오는 문장 전체를 상호명처럼 보고 0건을 준다.
  assert.equal(named.placeName, "인천 까사올리브");

  const conditional = classifyPlaceRequest("조용하고 분위기 좋은 파스타집 찾아줘");
  assert.equal(conditional.kind, "conditional");
  assert.equal(conditional.keywords.includes("찾아줘"), false);

  assert.equal(classifyPlaceRequest("카페").kind, "conditional");
  assert.equal(classifyPlaceRequest("대림창고 가고 싶어").kind, "specific");
  assert.equal(classifyPlaceRequest("대림창고 가고 싶어").placeName, "대림창고");
});

test("날짜·인원·관계 같은 평범한 대답을 상호명으로 오해하지 않는다", () => {
  for (const text of ["이번 주 토요일", "둘이 가요", "여자친구랑 갈 거야", "3명이에요", "20만원 정도", "아무거나 추천해줘"]) {
    assert.equal(classifyPlaceRequest(text).kind, "conditional", `${text}는 상호명이 아니다`);
  }
});

test("지목한 이름과 다른 가게는 같은 가게로 인정하지 않는다", () => {
  assert.equal(isSamePlaceName("까사올리브", "까사올리브 송도점"), true);
  // "까사"/"카사"처럼 표기만 다른 건 같은 가게로 본다(Casa Olive). 이름이 다른 가게는 아래처럼 막는다.
  assert.equal(isSamePlaceName("까사올리브", "카사올리브"), true);
  assert.equal(isSamePlaceName("명동교자", "명동만두"), false);
  assert.equal(isSamePlaceName("까사올리브", "일류짬뽕"), false);
  assert.equal(isSamePlaceName("까사올리브", "어.참새다"), false);
});

test("지목한 이름에서 지역어를 떼어낸다", () => {
  assert.equal(stripRegionFromName("인천 까사올리브", ["인천", "서울"]), "까사올리브");
  assert.equal(stripRegionFromName("까사올리브", ["인천"]), "까사올리브");
});

test("자연어만으로 업종을 짚어내 카테고리 버튼을 강요하지 않는다", () => {
  assert.equal(guessCategory("꽃다발 하나 사고 싶어"), "flower");
  assert.equal(guessCategory("조용한 카페"), "cafe");
  assert.equal(guessCategory("분위기 좋은 파스타집"), "meal");
  assert.equal(guessCategory("전시 보러 가고 싶어"), "activity");
  assert.equal(guessCategory("그냥 좋은 데"), undefined);
});

test("가게 이름을 말하면 그 이름을 기억하고 분위기를 되묻지 않는다", () => {
  const draft = applyDeterministicConversation(
    [{ role: "user", text: "인천 까사올리브 찾아줘" }],
    {},
    undefined,
  );
  assert.deepEqual(draft.namedPlaces, ["까사올리브"]);
  const questions = missingPlanningQuestions(draft);
  // 이름을 콕 집어 말한 사람에게 "어떤 분위기가 좋아?"를 묻는 건 대화가 아니라 방해다.
  assert.equal(questions.includes("preference"), false);
  // 넓은 지역이어도 이름으로 바로 찾으면 되니 동네를 더 좁히라고 하지 않는다.
  assert.equal(questions.includes("region"), false);
});

test("가게 이름이 없으면 넓은 지역은 여전히 좁혀 묻는다", () => {
  const draft = applyDeterministicConversation(
    [{ role: "user", text: "인천에서 분위기 좋은 식당 찾아줘" }],
    {},
    undefined,
  );
  assert.deepEqual(draft.namedPlaces, []);
  assert.equal(missingPlanningQuestions(draft).includes("region"), true);
});

test("대화 중의 평범한 대답을 상호명으로 잡아채지 않는다", () => {
  // "렌터카", "일주일 뒤"는 질문에 대한 대답이지 가게 이름이 아니다.
  for (const text of ["렌터카", "일주일 뒤", "오션뷰", "숙소까지 100만원"]) {
    const draft = applyDeterministicConversation([{ role: "user", text }], {}, undefined);
    assert.deepEqual(draft.namedPlaces, [], `${text}는 상호명이 아니다`);
  }
});

test("한 번 말한 가게 이름은 다음 대화에서도 유지된다", () => {
  const first = applyDeterministicConversation([{ role: "user", text: "까사올리브 예약해줘" }], {}, undefined);
  const second = applyDeterministicConversation(
    [{ role: "user", text: "까사올리브 예약해줘" }, { role: "user", text: "저녁 7시" }],
    first,
    "mealTime",
  );
  assert.deepEqual(second.namedPlaces, ["까사올리브"]);
});
