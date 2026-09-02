import test from "node:test";
import assert from "node:assert/strict";

import { createDajeongPlan, replacePlanItem, restorePlanVersion, restoreReferencedCandidate, reviseDajeongPlan } from "../../dajeong/lib/plan-engine.ts";
import { applyDeterministicConversation, continuePlanningConversation, missingPlanningQuestions } from "../../dajeong/lib/planning-brain.ts";
import { analyzeSituation, parseSituation } from "../../dajeong/lib/situation.ts";
import { chainNameFor, haversineKm, rankRealPlaceCandidates } from "../../dajeong/lib/place-utils.ts";
import { prepareReservationOrder } from "../../dajeong/lib/reservation-engine.ts";
import { isIsolatedProductPath } from "../../lib/shell-route.ts";

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

test("하루온 멀티턴 여행 대화는 9턴의 조건을 잃지 않고 질문을 멈춘다", async () => {
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
  assert.deepEqual(missingPlanningQuestions(draft), []);
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
  assert.deepEqual(missingPlanningQuestions(restaurant), []);
  assert.equal(flower.planScope, "single");
  assert.equal(flower.singleCategory, "flower");
  assert.equal(flower.requestKind, "reservation");
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
