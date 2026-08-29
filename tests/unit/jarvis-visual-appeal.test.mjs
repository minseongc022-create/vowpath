import test from "node:test";
import assert from "node:assert/strict";

import {
  judgeVisualAppeal,
  judgeVisualAppealBatch,
  clearVisualAppealCache,
} from "../../jarvis/engine/visual-appeal.ts";

// ─────────────────────────────────────────────────────────────
// ★ "아무도 안 살거같은 비주얼" — 개수가 아니라 품질을 본다
//
// 지키는 것: AI 키가 없거나 실패해도 후보를 벌하지 않는다(중립),
// 사진이 아예 없으면 그건 확실한 사실이라 0점, 그리고 크론의 25초
// 한도를 지키기 위해 시간이 부족하면 남은 후보는 건너뛴다.
// ─────────────────────────────────────────────────────────────

test.beforeEach(() => {
  clearVisualAppealCache();
  delete process.env.OPENAI_API_KEY;
});

test("사진이 없으면 확실한 사실이다 — 0점, 중립이 아니다", async () => {
  const r = await judgeVisualAppeal("k1", []);
  assert.equal(r.score, 0);
  assert.equal(r.judged, true);
});

test("AI 키가 없으면 중립값이다 — 판단 못 했다고 벌하지 않는다", async () => {
  const r = await judgeVisualAppeal("k2", ["https://example.com/a.jpg"]);
  assert.equal(r.judged, false);
  assert.equal(r.score, 0.5);
});

test("★ 시간이 부족하면 남은 후보는 건너뛴다 — 크론 25초 한도를 지킨다", async () => {
  const items = [
    { cacheKey: "x1", imageUrls: ["https://example.com/1.jpg"] },
    { cacheKey: "x2", imageUrls: ["https://example.com/2.jpg"] },
  ];
  // 이미 지난 데드라인 — 하나도 판단하지 않아야 한다
  const result = await judgeVisualAppealBatch(items, { deadlineAt: Date.now() - 1000 });
  assert.equal(result.size, 0);
});

test("사진이 없는 후보는 예산과 무관하게 즉시 0점으로 나온다", async () => {
  const items = [{ cacheKey: "y1", imageUrls: [] }];
  const result = await judgeVisualAppealBatch(items, { deadlineAt: Date.now() + 10_000 });
  assert.equal(result.get("y1").score, 0);
});
