import { test } from "node:test";
import assert from "node:assert/strict";
import { getPlan, PLANS, formatKrw } from "@/vibesafe/lib/billing/plans";

/**
 * 요금제 설정은 결제 화면과 한도 계산 양쪽이 같은 값을 봐야 한다.
 * 여기가 틀리면 "결제했는데 한도는 그대로"거나 "무료인데 한도가 줄어듦"이
 * 생긴다.
 */

test("모르는 planKey는 무료 베타로 취급한다", () => {
  assert.equal(getPlan("nonsense").key, "beta");
  assert.equal(getPlan("").key, "beta");
});

test("무료 베타는 가격이 0이다", () => {
  assert.equal(PLANS.beta.priceKrw, 0);
});

test("프로는 무료 베타보다 모든 한도가 크거나 같다", () => {
  const beta = PLANS.beta.limits;
  const pro = PLANS.pro.limits;
  assert.ok(pro.projects >= beta.projects);
  assert.ok(pro.testRunsPerMonth >= beta.testRunsPerMonth);
  assert.ok(pro.aiAnalysesPerMonth >= beta.aiAnalysesPerMonth);
  assert.ok(pro.browserMsPerMonth >= beta.browserMsPerMonth);
});

test("프로는 유료다 — 가격이 0이면 결제 없이 상위 한도를 주는 셈이다", () => {
  assert.ok(PLANS.pro.priceKrw > 0);
});

test("가격 표시는 천 단위 구분자가 붙은 원화다", () => {
  assert.equal(formatKrw(19900), "19,900원");
  assert.equal(formatKrw(0), "0원");
});
