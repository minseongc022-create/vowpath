import assert from "node:assert/strict";
import test from "node:test";

import { parseWithRules } from "../../chaebi/lib/parse-rules.ts";
import { buildPlan, swapItem, toggleItem } from "../../chaebi/lib/plan-engine.ts";
import { candidatesFor, isFeasible, priceFor } from "../../chaebi/lib/recommend.ts";
import { getCatalogItem, CATALOG } from "../../chaebi/lib/catalog.ts";
import { advancePlan, cancelPlan, confirmPlan } from "../../chaebi/lib/fulfillment.ts";
import {
  addDays,
  formatKoreanTime,
  hoursUntil,
  seoulDateISO,
  seoulEpoch,
  timeToMinutes,
} from "../../chaebi/lib/datetime.ts";
import { detectRegion } from "../../chaebi/lib/regions.ts";
import { formatKrw, planProgress } from "../../chaebi/lib/format.ts";

/**
 * 엔진 테스트.
 *
 * 화면은 손으로 확인할 수 있지만, "오늘 저녁 7시"라는 말에서 무엇이 가능하고
 * 무엇이 이미 늦었는지를 계산하는 부분은 눈으로 못 본다. 그래서 시각·예산·
 * 실행 상태 세 갈래를 여기서 못 박는다.
 */

// 기준 시각: 2026-08-30(일) 오전 10시 KST
const NOW = new Date(Date.UTC(2026, 7, 30, 1, 0, 0));
const TODAY = seoulDateISO(NOW);

test("서울 기준 날짜 — UTC 서버에서도 오늘이 밀리지 않는다", () => {
  assert.equal(TODAY, "2026-08-30");
  // UTC로는 아직 29일 오후지만 서울은 이미 30일 오전이다
  const lateUtc = new Date(Date.UTC(2026, 7, 29, 16, 30, 0));
  assert.equal(seoulDateISO(lateUtc), "2026-08-30");
  assert.equal(seoulEpoch("2026-08-30", "19:00"), Date.UTC(2026, 7, 30, 10, 0));
});

test("상황 한 줄에서 날짜·상대·항목을 뽑는다", () => {
  const brief = parseWithRules("내일 여자친구 생일인데 아무것도 준비 못했어", NOW);
  assert.equal(brief.occasion, "birthday");
  assert.equal(brief.relation, "girlfriend");
  assert.equal(brief.dateISO, addDays(TODAY, 1));
  assert.equal(brief.urgency, "tomorrow");
  assert.ok(brief.needs.includes("restaurant"));
  assert.ok(brief.needs.includes("cake"));
  assert.ok(brief.needs.includes("gift"));
  assert.equal(brief.headcount, 2);
});

test("예산·지역·인원을 말하면 그대로 받는다", () => {
  const brief = parseWithRules("이번 주 토요일 부모님 생신, 분당에서 4명, 30만원 정도로", NOW);
  assert.equal(brief.relation, "parent");
  assert.equal(brief.budgetKrw, 300_000);
  assert.equal(brief.budgetStated, true);
  assert.equal(brief.regionKey, "gyeonggi-pangyo");
  assert.equal(brief.headcount, 4);
  // 2026-08-30이 일요일 → 다음 토요일은 9월 5일
  assert.equal(brief.dateISO, "2026-09-05");
});

test("이미 준비한 항목은 빼고, 명시한 시각은 그대로 쓴다", () => {
  const brief = parseWithRules("내일 저녁 7시 반 기념일인데 선물은 이미 샀어", NOW);
  assert.equal(brief.startTime, "19:30");
  assert.equal(brief.timeOfDay, "evening");
  assert.ok(!brief.needs.includes("gift"));
});

test("오늘인데 그 시각이 지났으면 남은 시간 안으로 민다", () => {
  const evening = new Date(Date.UTC(2026, 7, 30, 11, 0, 0)); // 서울 20:00
  const brief = parseWithRules("오늘 저녁 7시에 밥 먹자", evening);
  assert.equal(brief.dateISO, seoulDateISO(evening));
  assert.ok(
    timeToMinutes(brief.startTime) >= timeToMinutes("21:00"),
    `밀린 시각이 ${brief.startTime}로 잡혔다`,
  );
});

test("지역 별칭 — 긴 이름이 짧은 이름을 이긴다", () => {
  assert.equal(detectRegion("가로수길에서 보기로 했어")?.key, "seoul-gangnam");
  assert.equal(detectRegion("연남동 근처")?.key, "seoul-hongdae");
  assert.equal(detectRegion("해운대 앞바다")?.key, "busan-haeundae");
  assert.equal(detectRegion("아무 데나"), null);
});

test("준비 시간이 모자라면 후보에서 아예 빠진다", () => {
  const brief = parseWithRules("오늘 저녁에 케이크 필요해", NOW);
  const soon = { ...brief, dateISO: TODAY, startTime: "13:00" }; // 3시간 뒤
  for (const candidate of candidatesFor({ need: "cake", brief: soon, allocated: 80_000, now: NOW })) {
    assert.ok(
      candidate.item.leadTimeHours <= hoursUntil(soon.dateISO, soon.startTime, NOW),
      `${candidate.item.name}은 준비 시간이 모자란다`,
    );
  }
});

test("예산을 말했으면 그 한도를 넘는 조합을 만들지 않는다", () => {
  const brief = parseWithRules("내일 저녁 여자친구 생일, 강남에서 20만원으로", NOW);
  const plan = buildPlan({ brief, ownerId: "owner-1", planId: "p1", now: NOW });
  assert.ok(plan.items.length >= 2, "항목이 최소 두 개는 잡혀야 한다");
  assert.ok(
    plan.totalKrw <= brief.budgetKrw,
    `총액 ${plan.totalKrw}이 예산 ${brief.budgetKrw}을 넘었다`,
  );
});

test("말한 지역 안에서 먼저 고른다 — 이웃 지역으로 새지 않는다", () => {
  const brief = parseWithRules("내일 저녁 7시 여자친구 생일, 강남에서 30만원 정도로", NOW);
  assert.equal(brief.regionKey, "seoul-gangnam");

  const plan = buildPlan({ brief, ownerId: "owner-1", planId: "region1", now: NOW });
  for (const item of plan.items) {
    const catalog = getCatalogItem(item.catalogId);
    assert.ok(
      catalog.regionKey === "seoul-gangnam" || catalog.regionKey === "nationwide",
      `${catalog.name}이 ${catalog.regionLabel}에서 잡혔다 (강남을 요청했는데)`,
    );
  }
});

test("항목별 배분이 제대로 된 선택지를 밀어내지 않는다", () => {
  // 30만원 생일에서 케이크 배분은 4만원이 안 되지만, 동네 케이크집(4만6천원)이
  // 기프티콘(3만5천원)에 밀리면 안 된다 — 총액이 예산 안이면 되는 일이다.
  const brief = parseWithRules("내일 저녁 7시 여자친구 생일, 강남에서 30만원 정도로", NOW);
  const plan = buildPlan({ brief, ownerId: "owner-1", planId: "budget1", now: NOW });

  const cake = plan.items.find((item) => item.need === "cake");
  assert.ok(cake, "케이크가 빠졌다");
  const catalog = getCatalogItem(cake.catalogId);
  assert.equal(catalog.fulfillment, "pickup", `케이크가 ${catalog.name}으로 잡혔다`);
  assert.ok(plan.totalKrw <= brief.budgetKrw, "그래도 총액은 예산 안이어야 한다");
});

test("예산이 빠듯해도 총액 한도는 지킨다", () => {
  for (const budget of [120_000, 200_000, 400_000, 800_000]) {
    const brief = {
      ...parseWithRules("내일 저녁 7시 여자친구 생일, 강남에서", NOW),
      budgetKrw: budget,
      budgetStated: true,
    };
    const plan = buildPlan({ brief, ownerId: "owner-1", planId: `b${budget}`, now: NOW });
    assert.ok(
      plan.totalKrw <= budget,
      `예산 ${budget}에서 총액이 ${plan.totalKrw}로 나왔다`,
    );
    assert.ok(plan.items.length > 0, `예산 ${budget}에서 아무것도 못 잡았다`);
  }
});

test("식당 가격은 인원수만큼 곱해진다", () => {
  const restaurant = CATALOG.find((item) => item.need === "restaurant");
  assert.ok(restaurant);
  assert.equal(priceFor(restaurant, 4), restaurant.priceKrw * 4);

  const giftItem = CATALOG.find((item) => item.need === "gift");
  assert.ok(giftItem);
  assert.equal(priceFor(giftItem, 4), giftItem.priceKrw);
});

test("동선 — 픽업은 자리 시작 전에, 다음 코스는 이후에 놓인다", () => {
  const brief = parseWithRules("내일 저녁 7시 여자친구 생일, 성수에서 케이크랑 코스도", NOW);
  const plan = buildPlan({ brief, ownerId: "owner-1", planId: "p2", now: NOW });

  const start = timeToMinutes(plan.brief.startTime);
  const cake = plan.items.find((item) => item.need === "cake");
  if (cake) {
    assert.ok(cake.scheduledAt, "케이크에 픽업 시각이 없다");
    assert.ok(timeToMinutes(cake.scheduledAt) < start, "케이크 픽업이 식사 시작 뒤로 잡혔다");
  }
  const activity = plan.items.find((item) => item.need === "activity");
  if (activity) {
    assert.ok(timeToMinutes(activity.scheduledAt) > start, "다음 코스가 식사 전으로 잡혔다");
  }
  // 타임라인은 항상 시간순
  const times = plan.timeline.map((entry) => timeToMinutes(entry.at));
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

test("항목 교체·제외가 총액에 즉시 반영된다", () => {
  const brief = parseWithRules("내일 저녁 기념일, 강남에서 40만원", NOW);
  const plan = buildPlan({ brief, ownerId: "owner-1", planId: "p3", now: NOW });

  const target = plan.items.find((item) => item.alternativeIds.length > 0);
  assert.ok(target, "대안이 있는 항목이 하나는 있어야 한다");

  const swapped = swapItem(plan, target.id, target.alternativeIds[0]);
  assert.ok(swapped);
  const swappedItem = swapped.items.find((item) => item.id === target.id);
  assert.equal(swappedItem.catalogId, target.alternativeIds[0]);
  assert.equal(swappedItem.userPicked, true);
  assert.equal(
    swapped.totalKrw,
    swapped.items.reduce((sum, item) => (item.status === "skipped" ? sum : sum + item.priceKrw), 0),
  );

  const removed = toggleItem(swapped, target.id, true);
  assert.ok(removed);
  assert.equal(removed.totalKrw, swapped.totalKrw - swappedItem.priceKrw);

  // 다른 종류로는 못 바꾼다
  const wrongKind = CATALOG.find((item) => item.need !== target.need);
  assert.equal(swapItem(plan, target.id, wrongKind.id), null);
});

test("확정하면 상태가 시간에 따라 저절로 흐른다 (멱등)", () => {
  const brief = parseWithRules("내일 저녁 7시 여자친구 생일, 강남에서 30만원", NOW);
  const plan = buildPlan({ brief, ownerId: "owner-1", planId: "p4", now: NOW });

  const confirmedAt = NOW.getTime();
  const running = confirmPlan(plan, confirmedAt);
  assert.equal(running.status, "running");
  assert.ok(running.items.every((item) => item.status === "requested"));

  // 2분 뒤 — 예약이 확정돼 있어야 한다
  const later = advancePlan(running, confirmedAt + 120_000).plan;
  for (const item of later.items) {
    assert.ok(
      ["confirmed", "in_transit", "ready", "done", "reassigned"].includes(item.status),
      `${item.need}이 ${item.status}에 머물러 있다`,
    );
    assert.ok(item.reference, "예약번호가 없다");
  }

  // 같은 시각으로 몇 번을 계산해도 결과가 같다
  const again = advancePlan(later, confirmedAt + 120_000);
  assert.equal(again.changed, false);
});

test("자리가 막히면 대안으로 자동 교체된다", () => {
  const brief = parseWithRules("내일 저녁 7시 여자친구 생일, 강남에서 30만원", NOW);

  // 교체는 계획 id 해시로 결정된다 — 여러 id를 돌려 한 번은 나오는지 본다
  let sawReassign = false;
  for (let i = 0; i < 40 && !sawReassign; i += 1) {
    const plan = buildPlan({ brief, ownerId: "owner-1", planId: `swap${i}`, now: NOW });
    const running = confirmPlan(plan, NOW.getTime());

    // 화면은 2초마다 다시 읽는다 — 같은 리듬으로 시간을 흘려본다
    let mid = running;
    for (let t = 2_000; t <= 30_000; t += 2_000) {
      mid = advancePlan(mid, NOW.getTime() + t).plan;
    }
    const swapped = mid.items.find((item) => item.replacedCatalogId);
    if (!swapped) continue;

    sawReassign = true;
    assert.notEqual(swapped.catalogId, swapped.replacedCatalogId);
    assert.ok(getCatalogItem(swapped.catalogId), "교체된 업체가 카탈로그에 없다");
    // 교체 뒤에도 총액은 항목 합계와 맞는다
    assert.equal(
      mid.totalKrw,
      mid.items.reduce((sum, item) => (item.status === "skipped" ? sum : sum + item.priceKrw), 0),
    );
    // ★ 사용자 몰래 예산을 넘기지 않는다 — 넘겼다면 그렇다고 밝혀야 한다
    if (mid.totalKrw > brief.budgetKrw) {
      assert.match(
        swapped.statusNote,
        /예산을 조금 넘습니다/,
        `예산(${brief.budgetKrw})을 ${mid.totalKrw}로 넘겼는데 아무 말이 없다`,
      );
    }
    // 그리고 결국은 확정까지 간다
    const settled = advancePlan(mid, NOW.getTime() + 120_000).plan;
    const finalItem = settled.items.find((item) => item.id === swapped.id);
    assert.ok(["confirmed", "ready", "in_transit", "done"].includes(finalItem.status));
  }
  assert.ok(sawReassign, "40번을 돌려도 대안 교체가 한 번도 안 났다");
});

test("취소하면 모든 항목이 멈춘다", () => {
  const brief = parseWithRules("내일 저녁 기념일 강남", NOW);
  const plan = buildPlan({ brief, ownerId: "owner-1", planId: "p5", now: NOW });
  const cancelled = cancelPlan(confirmPlan(plan, NOW.getTime()), NOW.getTime() + 1000);
  assert.equal(cancelled.status, "cancelled");
  assert.ok(cancelled.items.every((item) => item.status === "skipped"));
  // 취소된 계획은 더 이상 진행되지 않는다
  assert.equal(advancePlan(cancelled, NOW.getTime() + 600_000).changed, false);
});

test("다른 사람 계획은 소유자 검사에서 걸러진다 (엔진 수준 표식)", () => {
  const brief = parseWithRules("내일 저녁 기념일", NOW);
  const plan = buildPlan({ brief, ownerId: "owner-A", planId: "p6", now: NOW });
  assert.equal(plan.ownerId, "owner-A");
});

test("화면 표기 — 금액·시각·진행률", () => {
  assert.equal(formatKrw(0), "무료");
  assert.equal(formatKrw(9_500), "9,500원");
  assert.equal(formatKrw(40_000), "4만원");
  assert.equal(formatKrw(42_000), "4만 2,000원");
  assert.equal(formatKoreanTime("19:00"), "오후 7시");
  assert.equal(formatKoreanTime("09:30"), "오전 9시 30분");
  assert.equal(formatKoreanTime("12:00"), "오후 12시");
  assert.equal(formatKoreanTime("00:15"), "오전 12시 15분");
  assert.equal(planProgress(["done", "done"]), 1);
  assert.equal(planProgress(["draft", "draft"]), 0);
  assert.equal(planProgress([]), 0);
  assert.ok(planProgress(["done", "pending", "skipped"]) > 0.5);
});

test("지난 시각은 실행 가능 후보가 아니다", () => {
  const brief = parseWithRules("어제 저녁", NOW);
  const past = { ...brief, dateISO: addDays(TODAY, -1), startTime: "19:00" };
  const anyItem = CATALOG[0];
  assert.equal(isFeasible(anyItem, past, NOW), false);
});
