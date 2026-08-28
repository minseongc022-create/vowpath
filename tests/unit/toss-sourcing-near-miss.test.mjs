import test from "node:test";
import assert from "node:assert/strict";

import { generateConsignmentPicksWithReport } from "../../toss-shop/lib/seller-engine/consignment.ts";
import { SEED_CATALOG } from "../../toss-shop/lib/seed.ts";

// ─────────────────────────────────────────────────────────────
// "등록할 만한 상품이 없다"가 반복될 때, 원인을 숫자로 남기는지 확인한다.
// 기준(마진 하한 등)을 몰래 낮추는 대신, 어느 관문에서 얼마나 떨어졌는지가
// 남아야 한다.
// ─────────────────────────────────────────────────────────────

test("근접 로그 — 시드 카탈로그로 돌리면 시도한 키워드 수와 관문별 탈락 집계가 남는다", async () => {
  const { picks, report } = await generateConsignmentPicksWithReport(SEED_CATALOG, "2026-08-28");

  assert.ok(report.keywordsScanned > 0, "시도한 키워드가 0이면 그 자체가 버그다");
  assert.equal(report.picksProduced, picks.length, "보고된 생산량과 실제 픽 개수는 같아야 한다");
  assert.equal(typeof report.rejections, "object");

  // 집계값이 있다면 전부 자연수여야 한다 — 음수나 NaN이 새어 나오면 화면이 깨진다
  for (const [reason, count] of Object.entries(report.rejections)) {
    assert.ok(Number.isInteger(count) && count > 0, `${reason}의 집계가 이상하다: ${count}`);
  }
});

test("근접 로그 — 아무것도 못 찾는 빈 카탈로그에서도 원인이 남는다(빈 사유 목록이 아니다)", async () => {
  const { picks, report } = await generateConsignmentPicksWithReport([], "2026-08-28");

  assert.equal(picks.length, 0);
  // 후보 상품 자체가 없으니 "연관 상품 없음"으로 전부 떨어져야 한다
  const reasons = Object.keys(report.rejections);
  assert.ok(reasons.length > 0, "빈 카탈로그인데 탈락 사유가 하나도 안 남았다");
});

test("근접 로그 — 하위 호환: generateConsignmentPicks는 여전히 픽 배열만 돌려준다", async () => {
  const { generateConsignmentPicks } = await import("../../toss-shop/lib/seller-engine/consignment.ts");
  const picks = await generateConsignmentPicks(SEED_CATALOG, "2026-08-28");
  assert.ok(Array.isArray(picks));
  assert.ok(picks.length > 0);
});
