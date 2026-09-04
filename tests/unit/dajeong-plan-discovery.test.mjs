import test from "node:test";
import assert from "node:assert/strict";

import { createDajeongPlan } from "../../dajeong/lib/plan-engine.ts";
import { overlapsPlanDate, planDateRange } from "../../dajeong/lib/discovery-engine.ts";

function discoveryItem(overrides = {}) {
  return {
    id: "culture-1",
    title: "경복궁 야간개장",
    source: "culture_data",
    sourceLabel: "문화데이터광장 등록 정보",
    confidence: "official",
    signals: [],
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("당일 일정은 그날 하루만 범위로 잡는다", () => {
  const plan = createDajeongPlan({ request: "이번 토요일 성수에서 여자친구와 데이트", budget: 200_000 });
  const range = planDateRange(plan);
  assert.ok(range);
  assert.equal(range.start.toDateString(), range.end.toDateString());
  assert.equal(plan.situation.targetDate.startsWith(String(range.start.getFullYear())), true);
});

test("여행 일정은 tripDays만큼 범위가 늘어난다", () => {
  const plan = createDajeongPlan({
    request: "다음 주 부산으로 2박 3일 여행 가고 싶어",
    planScope: "trip",
    tripDays: 3,
    targetDate: "2026-09-10",
    budget: 800_000,
  });
  const range = planDateRange(plan);
  assert.ok(range);
  // 9/10~9/12, 사흘치라 마지막 날은 시작일보다 이틀 뒤여야 한다.
  assert.equal(Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000), 2);
});

test("행사 기간이 계획 날짜와 하루라도 겹치면 넣는다", () => {
  const range = { start: new Date("2026-09-10T00:00:00+09:00"), end: new Date("2026-09-10T00:00:00+09:00") };
  // 행사가 계획 날짜를 포함하는 긴 기간.
  assert.equal(overlapsPlanDate(discoveryItem({ startDate: "2026-09-01", endDate: "2026-09-30" }), range), true);
  // 행사가 계획 날짜 전에 이미 끝난 경우.
  assert.equal(overlapsPlanDate(discoveryItem({ startDate: "2026-08-01", endDate: "2026-09-09" }), range), false);
  // 행사가 계획 날짜 이후에나 시작하는 경우.
  assert.equal(overlapsPlanDate(discoveryItem({ startDate: "2026-09-11", endDate: "2026-09-20" }), range), false);
  // 마지막 날 겹치는 경우도 인정해야 한다(경계값).
  assert.equal(overlapsPlanDate(discoveryItem({ startDate: "2026-09-05", endDate: "2026-09-10" }), range), true);
});

test("날짜를 모르는 항목(추정)은 날짜 매칭에서 아예 뺀다", () => {
  const range = { start: new Date("2026-09-10T00:00:00+09:00"), end: new Date("2026-09-10T00:00:00+09:00") };
  // 추정 항목은 확인된 기간이 없다 — 겹치는지 판단할 근거가 없으니 넣지 않는다.
  assert.equal(overlapsPlanDate(discoveryItem({ startDate: undefined, endDate: undefined, confidence: "inferred" }), range), false);
});
