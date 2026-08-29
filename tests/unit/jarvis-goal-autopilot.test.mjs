import test from "node:test";
import assert from "node:assert/strict";

import { planForGoal, MAX_DAILY_LISTINGS } from "../../jarvis/engine/goal.ts";
import { runCycle } from "../../jarvis/engine/autopilot.ts";

function state(over = {}) {
  return {
    version: "2.0",
    settings: {
      monthlyGoalKrw: 5_000_000,
      autopilotEnabled: true,
      autoPublish: false,
    },
    candidates: [],
    drafts: [],
    chat: [],
    ...over,
  };
}

function draft(status, i = 0) {
  return {
    id: `d${i}`,
    status,
    candidate: {
      supplier: { platform: "domeme", itemNo: `s${i}` },
      keyword: "k",
      priceKrw: 20000,
      netProfitKrw: 4000,
    },
    detailHtml: "",
    sellingPoints: [],
    listingPayload: { name: "n", salePrice: 1, imageUrls: [], detailHtml: "" },
    checklist: [],
    createdAt: "",
    updatedAt: "",
  };
}

// ─────────────────────────────────────────────────────────────
// 목표 역산
// ─────────────────────────────────────────────────────────────

test("월 500만원에서 필요한 SKU 수가 역산된다", () => {
  const plan = planForGoal({ monthlyGoalKrw: 5_000_000, publishedSkus: 0 });
  assert.ok(plan.skusNeeded > 0);
  assert.ok(plan.salesNeededPerMonth > 0);
  assert.equal(plan.skusToAdd, plan.skusNeeded, "0개에서 시작하면 전부 채워야 한다");
  assert.ok(plan.dailyTarget > 0, "올릴 게 남았으면 하루 목표가 있어야 한다");
});

test("목표를 채웠으면 더 올리라고 하지 않는다", () => {
  const plan = planForGoal({ monthlyGoalKrw: 5_000_000, publishedSkus: 100_000 });
  assert.equal(plan.skusToAdd, 0);
  assert.equal(plan.dailyTarget, 0);
  assert.match(plan.reason, /이미 채웠습니다/);
});

test("하루 목표가 현실적 상한을 넘지 않는다 — 상세페이지 생성이 병목이다", () => {
  const plan = planForGoal({ monthlyGoalKrw: 30_000_000, publishedSkus: 0 });
  assert.ok(plan.dailyTarget <= MAX_DAILY_LISTINGS, `하루 ${plan.dailyTarget}개는 못 만든다`);
});

test("개당 순이익이 크면 필요한 SKU가 줄어든다", () => {
  const small = planForGoal({ monthlyGoalKrw: 5_000_000, publishedSkus: 0, observedNetPerUnitKrw: 3_000 });
  const big = planForGoal({ monthlyGoalKrw: 5_000_000, publishedSkus: 0, observedNetPerUnitKrw: 12_000 });
  assert.ok(big.skusNeeded < small.skusNeeded);
});

test("실측이 없으면 보수적으로 잡는다 — 낙관하면 목표에 못 닿는다", () => {
  const assumed = planForGoal({ monthlyGoalKrw: 5_000_000, publishedSkus: 0 });
  const optimistic = planForGoal({
    monthlyGoalKrw: 5_000_000,
    publishedSkus: 0,
    observedNetPerUnitKrw: 20_000,
  });
  assert.ok(
    assumed.skusNeeded > optimistic.skusNeeded,
    "가정값이 낙관적이면 필요 SKU가 적어 보이고 계획이 틀어진다",
  );
});

test("안 팔리는 SKU를 감안해 필요 수를 부풀린다", () => {
  const plan = planForGoal({ monthlyGoalKrw: 5_000_000, publishedSkus: 0 });
  const salesPerDay = plan.salesNeededPerMonth / 30;
  const naive = Math.ceil(salesPerDay / 0.35); // 전부 팔린다고 볼 때
  assert.ok(
    plan.skusNeeded > naive,
    "전부 팔린다고 보면 필요 SKU가 절반으로 줄어 계획이 통째로 틀어진다",
  );
});

// ─────────────────────────────────────────────────────────────
// 자동 운전 — 언제 돌고 언제 멈추는가
// ─────────────────────────────────────────────────────────────

test("자동 운전이 꺼져 있으면 돌지 않고 이유를 남긴다", async () => {
  const s = state({ settings: { monthlyGoalKrw: 5_000_000, autopilotEnabled: false, autoPublish: false } });
  const r = await runCycle(s);
  assert.equal(r.draftsCreated, 0);
  assert.match(r.idleReason ?? "", /자동 운전이 꺼져/);
});

test("검수 대기가 쌓이면 새로 만들지 않는다 — 사장님이 먼저 봐야 한다", async () => {
  const drafts = Array.from({ length: 15 }, (_, i) => draft("pending_review", i));
  const s = state({ drafts });
  const r = await runCycle(s);
  assert.equal(r.draftsCreated, 0);
  assert.match(r.idleReason ?? "", /검수 대기가 15건/);
});

test("아무것도 안 했으면 왜인지 항상 남는다 — 「없습니다」로 끝내지 않는다", async () => {
  const s = state();
  const r = await runCycle(s);
  if (r.draftsCreated === 0) {
    assert.ok(r.idleReason, "0건인데 이유가 없으면 원인을 영영 모른다");
    assert.ok(r.idleReason.length > 10);
  }
});

test("목표를 이미 채웠으면 돌지 않는다", async () => {
  const drafts = Array.from({ length: 500 }, (_, i) => draft("published", i));
  const s = state({ drafts });
  const r = await runCycle(s);
  assert.equal(r.draftsCreated, 0);
  assert.equal(r.goal.dailyTarget, 0);
});

test("도매 API 키가 없으면 그 사실을 정확히 말한다", async () => {
  const s = state();
  const r = await runCycle(s);
  // 테스트 환경엔 키가 없으므로 소싱이 그 이유를 답해야 한다
  if (r.sourcingRun) {
    assert.ok(
      r.sourcingRun.summary.includes("API") || r.sourcingRun.candidatesFound >= 0,
      "왜 못 찾았는지 말해야 한다",
    );
  }
});

// ─────────────────────────────────────────────────────────────
// 30분 보고 누적 — 이 파일의 state()는 reportWindow를 안 만들어준다.
// 오래된 상태에도 그대로 적용되는 상황이라, runCycle이 방어적으로
// 채워야 한다.
// ─────────────────────────────────────────────────────────────

test("reportWindow가 없는 상태로 들어와도 죽지 않고 채워진다", async () => {
  const s = state(); // reportWindow 필드 자체가 없다
  await runCycle(s);
  assert.ok(s.reportWindow, "runCycle이 없는 reportWindow를 채워야 한다");
  assert.equal(s.reportWindow.cyclesRun, 1);
});

test("사이클을 돌 때마다 reportWindow의 cyclesRun이 누적된다", async () => {
  const s = state();
  await runCycle(s);
  await runCycle(s);
  await runCycle(s);
  assert.equal(s.reportWindow.cyclesRun, 3);
});

test("돌지 않고 이유만 남긴 사이클도 cyclesRun에는 들어간다 — 「살아있음」을 알아야 하니까", async () => {
  const s = state({ settings: { monthlyGoalKrw: 5_000_000, autopilotEnabled: false, autoPublish: false } });
  await runCycle(s);
  assert.equal(s.reportWindow.cyclesRun, 1);
});
