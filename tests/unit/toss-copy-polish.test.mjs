import test from "node:test";
import assert from "node:assert/strict";

import {
  polishSellingCopy,
  copyPolishEnabled,
  __preservesFactsForTest as preservesFacts,
  __withinLengthBudgetForTest as withinLengthBudget,
} from "../../toss-shop/lib/seller-engine/copy-polish.ts";

// ─────────────────────────────────────────────────────────────
// OPENAI_API_KEY가 없는 환경(이 테스트 환경)에서는 항상 원문 폴백이어야 한다.
// 이건 실패 케이스가 아니라 이 모듈의 fail-safe 계약을 지키는지 보는 것이다.
// ─────────────────────────────────────────────────────────────

test("키가 없으면 비활성 — 원문을 그대로 돌려준다", async () => {
  assert.equal(copyPolishEnabled(), false, "이 테스트 환경엔 OPENAI_API_KEY가 없어야 한다");
  const points = ["같은 조건 상품 평균가보다 12% 낮은 가격입니다.", "당일 출고됩니다."];
  const result = await polishSellingCopy(points);
  assert.equal(result.polished, false);
  assert.deepEqual(result.points, points);
});

test("빈 입력은 빈 결과", async () => {
  const result = await polishSellingCopy([]);
  assert.equal(result.polished, false);
  assert.deepEqual(result.points, []);
});

test("빈 문자열·공백만 있는 항목은 걸러진다", async () => {
  const result = await polishSellingCopy(["실제 문구", "", "   "]);
  assert.deepEqual(result.points, ["실제 문구"]);
});

// ─────────────────────────────────────────────────────────────
// 검증 로직 — 숫자가 사라지거나 문장이 지나치게 부풀면 원문을 지킨다
// ─────────────────────────────────────────────────────────────

test("숫자가 그대로 있으면 사실 보존 통과", () => {
  assert.equal(
    preservesFacts("평균가보다 12% 낮은 가격입니다.", "다른 상품들보다 12% 더 저렴해요."),
    true,
  );
});

test("숫자가 사라지면 사실 보존 실패 — AI가 숫자를 흘렸을 가능성", () => {
  assert.equal(
    preservesFacts("평균가보다 12% 낮은 가격입니다.", "다른 상품들보다 훨씬 저렴해요."),
    false,
  );
});

test("숫자가 바뀌면 실패 — 15%로 둔갑한 경우도 잡는다", () => {
  assert.equal(
    preservesFacts("평균가보다 12% 낮은 가격입니다.", "다른 상품들보다 15% 더 저렴해요."),
    false,
  );
});

test("문장이 원문의 2.2배를 넘으면 실패 — 과도한 부연은 지어낸 내용일 확률이 높다", () => {
  const original = "당일 출고됩니다.";
  const bloated =
    "저희 상품은 신선도와 고객 만족을 최우선으로 생각하며 최고급 포장재를 사용해 당일 정성껏 출고해 드립니다.";
  assert.equal(withinLengthBudget(original, bloated), false);
});

test("적당히 다듬은 길이는 통과", () => {
  assert.equal(withinLengthBudget("당일 출고됩니다.", "주문 즉시 당일 발송해 드려요."), true);
});
