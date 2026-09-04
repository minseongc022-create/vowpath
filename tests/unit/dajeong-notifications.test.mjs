import test from "node:test";
import assert from "node:assert/strict";

import { createDajeongPlan } from "../../dajeong/lib/plan-engine.ts";
import { applyPrepInstruction } from "../../dajeong/lib/prep-conversation.ts";
import {
  applyQuietHours,
  computeNotificationDrafts,
  defaultNotificationPreferences,
  discoveryIdsFromDrafts,
  kstToUtc,
  secretRelatedItemIds,
  weatherDigestFor,
} from "../../dajeong/lib/notification-engine.ts";
import { contentHiddenCopy } from "../../dajeong/lib/notification-copy.ts";

function birthdayPlan() {
  return createDajeongPlan({ request: "다음 주 여자친구 생일 데이트 짜고 싶어", budget: 250_000, region: "서울" });
}

function baseInput(plan, overrides = {}) {
  return {
    plan,
    targetPersonId: "person_A",
    now: new Date(),
    prefs: defaultNotificationPreferences("person_A"),
    previousWeatherDigest: [],
    previousNotifiedDiscoveryIds: [],
    ownerSecretItemIds: new Set(),
    ...overrides,
  };
}

// ── kstToUtc / timezone ──────────────────────────────────────────────────

test("[TEST P-1] kstToUtc: 한국 시간 09:00은 UTC 00:00이다 (서버 프로세스 TZ와 무관)", () => {
  const utc = kstToUtc("2026-09-12", "09:00");
  assert.equal(utc.toISOString(), "2026-09-12T00:00:00.000Z");
});

test("[TEST P-2] kstToUtc: 자정 근처 날짜 경계도 정확히 변환된다", () => {
  const utc = kstToUtc("2026-01-01", "05:00");
  assert.equal(utc.toISOString(), "2025-12-31T20:00:00.000Z");
});

// ── departure ─────────────────────────────────────────────────────────────

test("[TEST 27] 출발 알림: 이동시간+버퍼를 고려해 적절한 리드타임에 생성된다", () => {
  const plan = birthdayPlan();
  const item = plan.items[0];
  const dateKey = plan.situation.targetDate;
  const arrival = kstToUtc(dateKey, item.time);
  const withTravel = { ...plan, items: plan.items.map((entry) => entry.id === item.id ? { ...entry, travelFromPrevious: { minutes: 20, mode: "대중교통", note: "" } } : entry) };
  // now = 45분 전 (여유 있음) → priority normal, 출발 안내
  const now = new Date(arrival.getTime() - 45 * 60_000);
  const drafts = computeNotificationDrafts(baseInput(withTravel, { now }));
  const departure = drafts.find((draft) => draft.relatedItemId === item.id);
  assert.ok(departure, "출발 알림이 생성되어야 한다");
  assert.equal(departure.kind, "departure");
  assert.match(departure.body, /여유|출발/);
});

test("[TEST 27-2] 출발 알림: 지금 출발해도 늦을 상황이면 reservation_risk(critical)로 승격된다", () => {
  const plan = birthdayPlan();
  const item = plan.items[0];
  const dateKey = plan.situation.targetDate;
  const arrival = kstToUtc(dateKey, item.time);
  const withTravel = { ...plan, items: plan.items.map((entry) => entry.id === item.id ? { ...entry, travelFromPrevious: { minutes: 30, mode: "대중교통", note: "" } } : entry) };
  const now = new Date(arrival.getTime() - 5 * 60_000); // 이동시간(30분)보다 훨씬 촉박
  const drafts = computeNotificationDrafts(baseInput(withTravel, { now }));
  const risk = drafts.find((draft) => draft.relatedItemId === item.id);
  assert.ok(risk);
  assert.equal(risk.kind, "reservation_risk");
  assert.equal(risk.priority, "critical");
});

test("[TEST R] 이미 지난(liveState done) 항목은 출발 알림을 만들지 않는다", () => {
  const plan = birthdayPlan();
  const item = plan.items[0];
  const done = { ...plan, items: plan.items.map((entry) => entry.id === item.id ? { ...entry, liveState: "done" } : entry) };
  const now = kstToUtc(plan.situation.targetDate, item.time);
  const drafts = computeNotificationDrafts(baseInput(done, { now }));
  assert.equal(drafts.some((draft) => draft.relatedItemId === item.id && draft.kind !== "prep_deadline" && draft.kind !== "prep_pickup"), false);
});

// ── prep ──────────────────────────────────────────────────────────────────

test("[TEST 28] prep 마감 알림: 리드타임 안이고 완료 전이면 생성된다", () => {
  let plan = birthdayPlan();
  plan = applyPrepInstruction(plan, "케이크 준비해줘").plan;
  const cake = plan.prep.find((item) => item.category === "cake");
  const deadlinePlan = { ...plan, prep: plan.prep.map((item) => item.id === cake.id ? { ...item, orderDeadline: plan.situation.targetDate } : item) };
  const now = kstToUtc(plan.situation.targetDate, "10:00");
  const drafts = computeNotificationDrafts(baseInput(deadlinePlan, { now }));
  const deadline = drafts.find((draft) => draft.relatedItemId === cake.id && draft.kind === "prep_deadline");
  assert.ok(deadline, "prep 마감 알림이 있어야 한다");
  assert.match(deadline.body, /오늘까지|골라볼까/);
});

test("[TEST R-2] prep 완료(picked_up) 상태면 더 이상 알림이 생성되지 않는다", () => {
  let plan = birthdayPlan();
  plan = applyPrepInstruction(plan, "케이크 준비해줘").plan;
  const cake = plan.prep.find((item) => item.category === "cake");
  const donePlan = { ...plan, prep: plan.prep.map((item) => item.id === cake.id ? { ...item, status: "picked_up", orderDeadline: plan.situation.targetDate, date: plan.situation.targetDate, time: "18:00" } : item) };
  const now = kstToUtc(plan.situation.targetDate, "17:30");
  const drafts = computeNotificationDrafts(baseInput(donePlan, { now }));
  assert.equal(drafts.some((draft) => draft.relatedItemId === cake.id), false, "완료된 준비물은 더 이상 알리지 않아야 한다");
});

// ── secret / privacy (TEST M, B) ────────────────────────────────────────

test("[TEST M] secretPrivacyLevel content_hidden이면 비밀 항목 알림의 제목·본문이 일반 문구로 대체된다", () => {
  const plan = birthdayPlan();
  const secretItem = plan.items[0];
  const withTravel = { ...plan, items: plan.items.map((entry) => entry.id === secretItem.id ? { ...entry, visibility: "secret", travelFromPrevious: { minutes: 20, mode: "대중교통", note: "" } } : entry) };
  const now = new Date(kstToUtc(plan.situation.targetDate, secretItem.time).getTime() - 45 * 60_000);
  const prefs = { ...defaultNotificationPreferences("person_A"), secretPrivacyLevel: "content_hidden" };
  const drafts = computeNotificationDrafts(baseInput(withTravel, { now, prefs, ownerSecretItemIds: secretRelatedItemIds(withTravel) }));
  const draft = drafts.find((entry) => entry.relatedItemId === secretItem.id);
  assert.ok(draft);
  assert.equal(draft.privacyAtSend, "content_hidden");
  const expected = contentHiddenCopy(draft.kind);
  assert.equal(draft.title, expected.title);
  assert.equal(draft.body, expected.body);
});

test("[TEST M-2] secretPrivacyLevel off이면 비밀 항목 알림 자체가 만들어지지 않는다", () => {
  const plan = birthdayPlan();
  const secretItem = plan.items[0];
  const withTravel = { ...plan, items: plan.items.map((entry) => entry.id === secretItem.id ? { ...entry, visibility: "secret", travelFromPrevious: { minutes: 20, mode: "대중교통", note: "" } } : entry) };
  const now = new Date(kstToUtc(plan.situation.targetDate, secretItem.time).getTime() - 45 * 60_000);
  const prefs = { ...defaultNotificationPreferences("person_A"), secretPrivacyLevel: "off" };
  const drafts = computeNotificationDrafts(baseInput(withTravel, { now, prefs, ownerSecretItemIds: secretRelatedItemIds(withTravel) }));
  assert.equal(drafts.some((entry) => entry.relatedItemId === secretItem.id), false);
});

test("[TEST B] secretRelatedItemIds가 비공개 prep도 함께 포함한다", () => {
  let plan = birthdayPlan();
  plan = applyPrepInstruction(plan, "케이크 준비해줘").plan;
  const cake = plan.prep.find((item) => item.category === "cake");
  const secretPlan = { ...plan, prep: plan.prep.map((item) => item.id === cake.id ? { ...item, visibility: "secret" } : item) };
  const ids = secretRelatedItemIds(secretPlan);
  assert.ok(ids.has(cake.id));
});

// ── weather (TEST G, H) ──────────────────────────────────────────────────

test("[TEST G] 날씨: 강수 확률이 크게 오르면(low→high) 알림이 생성된다", () => {
  const plan = birthdayPlan();
  const outdoorItem = { ...plan.items[0], venueType: "outdoor" };
  const dateKey = plan.situation.targetDate;
  const withWeather = {
    ...plan,
    items: [outdoorItem, ...plan.items.slice(1)],
    schedule: { density: "balanced", dayWindows: [], estimatedEndTime: "21:00", reserveRatio: .85, warnings: [], weather: { status: "verified", sourceLabel: "test", days: [{ date: dateKey, hours: [], precipitationProbabilityMax: 80, precipitationMm: 5, windKphMax: 10, temperatureMinC: 20, temperatureMaxC: 25, impact: "high" }] } },
  };
  const now = new Date(kstToUtc(dateKey, outdoorItem.time).getTime() - 60 * 60_000);
  const previousWeatherDigest = [{ date: dateKey, impact: "low", rainMax: 10 }];
  const drafts = computeNotificationDrafts(baseInput(withWeather, { now, previousWeatherDigest }));
  assert.ok(drafts.some((draft) => draft.kind === "weather_change"), "의미 있는 날씨 변화는 알림을 만들어야 한다");
});

test("[TEST H] 날씨: 미미한 변화(강수 확률 몇 % 차이)는 알림을 만들지 않는다", () => {
  const plan = birthdayPlan();
  const outdoorItem = { ...plan.items[0], venueType: "outdoor" };
  const dateKey = plan.situation.targetDate;
  const withWeather = {
    ...plan,
    items: [outdoorItem, ...plan.items.slice(1)],
    schedule: { density: "balanced", dayWindows: [], estimatedEndTime: "21:00", reserveRatio: .85, warnings: [], weather: { status: "verified", sourceLabel: "test", days: [{ date: dateKey, hours: [], precipitationProbabilityMax: 32, precipitationMm: 1, windKphMax: 10, temperatureMinC: 20, temperatureMaxC: 25, impact: "medium" }] } },
  };
  const now = new Date(kstToUtc(dateKey, outdoorItem.time).getTime() - 60 * 60_000);
  const previousWeatherDigest = [{ date: dateKey, impact: "medium", rainMax: 28 }];
  const drafts = computeNotificationDrafts(baseInput(withWeather, { now, previousWeatherDigest }));
  assert.equal(drafts.some((draft) => draft.kind === "weather_change"), false, "몇 %포인트 차이의 미미한 변화는 알림을 만들면 안 된다");
});

test("weatherDigestFor는 현재 계획의 날씨를 다음 비교를 위한 digest로 요약한다", () => {
  const plan = birthdayPlan();
  const dateKey = plan.situation.targetDate;
  const withWeather = { ...plan, schedule: { density: "balanced", dayWindows: [], estimatedEndTime: "21:00", reserveRatio: .85, warnings: [], weather: { status: "verified", sourceLabel: "test", days: [{ date: dateKey, hours: [], precipitationProbabilityMax: 50, precipitationMm: 2, windKphMax: 10, temperatureMinC: 20, temperatureMaxC: 25, impact: "medium" }] } } };
  const digest = weatherDigestFor(withWeather);
  assert.deepEqual(digest, [{ date: dateKey, impact: "medium", rainMax: 50 }]);
});

// ── quiet hours (TEST K, L) ──────────────────────────────────────────────

test("[TEST K] quiet hours: 일반 우선순위 알림은 방해금지 시간이 끝난 뒤로 미뤄진다", () => {
  const scheduledFor = kstToUtc("2026-09-12", "23:30").toISOString();
  const delayed = applyQuietHours(scheduledFor, "normal", { startTime: "22:00", endTime: "08:00" });
  assert.equal(delayed, kstToUtc("2026-09-13", "08:00").toISOString());
});

test("[TEST L] quiet hours: critical 알림은 방해금지 시간에도 그대로 발송된다", () => {
  const scheduledFor = kstToUtc("2026-09-12", "23:30").toISOString();
  const unchanged = applyQuietHours(scheduledFor, "critical", { startTime: "22:00", endTime: "08:00" });
  assert.equal(unchanged, scheduledFor);
});

test("quiet hours 밖의 시간은 그대로 유지된다", () => {
  const scheduledFor = kstToUtc("2026-09-12", "14:00").toISOString();
  const unchanged = applyQuietHours(scheduledFor, "normal", { startTime: "22:00", endTime: "08:00" });
  assert.equal(unchanged, scheduledFor);
});

// ── homebound ─────────────────────────────────────────────────────────────

test("[TEST 29] 귀가 알림: homeByTime을 이동시간만큼 역산해 생성된다", () => {
  const plan = birthdayPlan();
  const withHome = { ...plan, situation: { ...plan.situation, homeByTime: "22:00", homeTravelMinutes: 40 } };
  const departAt = kstToUtc(plan.situation.targetDate, "22:00");
  const now = new Date(departAt.getTime() - 40 * 60_000 - 10 * 60_000);
  const drafts = computeNotificationDrafts(baseInput(withHome, { now }));
  const home = drafts.find((draft) => draft.kind === "homebound");
  assert.ok(home);
  assert.match(home.body, /22:00/);
});

// ── category toggles ──────────────────────────────────────────────────────

test("카테고리 토글이 꺼져 있으면 해당 종류의 알림이 생성되지 않는다", () => {
  const plan = birthdayPlan();
  const item = plan.items[0];
  const withTravel = { ...plan, items: plan.items.map((entry) => entry.id === item.id ? { ...entry, travelFromPrevious: { minutes: 20, mode: "대중교통", note: "" } } : entry) };
  const now = new Date(kstToUtc(plan.situation.targetDate, item.time).getTime() - 45 * 60_000);
  const prefs = { ...defaultNotificationPreferences("person_A"), categories: { ...defaultNotificationPreferences("person_A").categories, departure: false, execution: false } };
  const drafts = computeNotificationDrafts(baseInput(withTravel, { now, prefs }));
  assert.equal(drafts.some((draft) => draft.kind === "departure" || draft.kind === "reservation_risk"), false);
});

test("masterEnabled이 false면 어떤 알림도 생성되지 않는다", () => {
  const plan = birthdayPlan();
  const prefs = { ...defaultNotificationPreferences("person_A"), masterEnabled: false };
  const drafts = computeNotificationDrafts(baseInput(plan, { prefs }));
  assert.equal(drafts.length, 0);
});

// ── 발견(discovery) 알림 — "요즘 뜨는 것" ────────────────────────────────────

function discoveredEvent(overrides = {}) {
  return {
    id: "culture-1",
    title: "경복궁 야간개장",
    source: "culture_data",
    sourceLabel: "문화데이터광장 등록 정보",
    confidence: "official",
    region: "서울",
    startDate: "2026-09-01",
    endDate: "2026-09-10",
    signals: [],
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("[TEST 30] 기관 등록 행사가 14일 이내로 다가오면 알림이 생성된다", () => {
  const plan = { ...birthdayPlan(), discoveredEvents: [discoveredEvent()] };
  const now = new Date("2026-09-08T09:00:00+09:00"); // 종료까지 2일 남음
  const drafts = computeNotificationDrafts(baseInput(plan, { now }));
  const discovery = drafts.find((draft) => draft.kind === "discovery_event");
  assert.ok(discovery, "발견 알림이 생성되어야 한다");
  assert.match(discovery.body, /2일/);
  assert.equal(discovery.dedupeKey, `discovery:${plan.id}:culture-1`);
});

test("아직 넉넉히 남은(14일 초과) 행사는 알리지 않는다", () => {
  const plan = { ...birthdayPlan(), discoveredEvents: [discoveredEvent({ endDate: "2026-12-31" })] };
  const now = new Date("2026-09-05T09:00:00+09:00");
  const drafts = computeNotificationDrafts(baseInput(plan, { now }));
  assert.equal(drafts.some((draft) => draft.kind === "discovery_event"), false);
});

test("추정(inferred) 항목은 화제성만으로 먼저 알리지 않는다", () => {
  const plan = { ...birthdayPlan(), discoveredEvents: [discoveredEvent({ confidence: "inferred", startDate: undefined, endDate: undefined })] };
  const now = new Date("2026-09-05T09:00:00+09:00");
  const drafts = computeNotificationDrafts(baseInput(plan, { now }));
  assert.equal(drafts.some((draft) => draft.kind === "discovery_event"), false);
});

test("이미 알린 발견 항목은 다시 알리지 않는다 — 종료 전까지 매 스윕마다 반복되면 안 된다", () => {
  const plan = { ...birthdayPlan(), discoveredEvents: [discoveredEvent()] };
  const now = new Date("2026-09-05T09:00:00+09:00");
  const drafts = computeNotificationDrafts(baseInput(plan, { now, previousNotifiedDiscoveryIds: ["culture-1"] }));
  assert.equal(drafts.some((draft) => draft.kind === "discovery_event"), false);
});

test("proactiveSuggestions 토글이 꺼져 있으면 발견 알림을 만들지 않는다", () => {
  const plan = { ...birthdayPlan(), discoveredEvents: [discoveredEvent()] };
  const now = new Date("2026-09-05T09:00:00+09:00");
  const prefs = { ...defaultNotificationPreferences("person_A"), categories: { ...defaultNotificationPreferences("person_A").categories, proactiveSuggestions: false } };
  const drafts = computeNotificationDrafts(baseInput(plan, { now, prefs }));
  assert.equal(drafts.some((draft) => draft.kind === "discovery_event"), false);
});

test("discoveryIdsFromDrafts: 방금 생성된 발견 알림 draft에서 항목 id만 뽑아낸다", () => {
  const plan = { ...birthdayPlan(), discoveredEvents: [discoveredEvent(), discoveredEvent({ id: "culture-2", endDate: "2026-12-31" })] };
  const now = new Date("2026-09-05T09:00:00+09:00");
  const drafts = computeNotificationDrafts(baseInput(plan, { now }));
  assert.deepEqual(discoveryIdsFromDrafts(drafts, plan.id), ["culture-1"]);
});
