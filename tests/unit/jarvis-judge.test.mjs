import test from "node:test";
import assert from "node:assert/strict";

import { judgeCandidate, pickBest } from "../../jarvis/engine/judge.ts";

// ─────────────────────────────────────────────────────────────
// ★ 자비스가 "고르지 않고 집던" 문제
//
// 소싱은 관문을 통과한 상품을 **발견 순서대로** 집었다. 같은 검색어의
// 1번 상품이 개당 800원 남고 4번 상품이 4,000원 남아도 늘 1번이었다.
// 관문은 "팔아도 되는가"만 보고 "이게 더 나은가"는 안 본다.
//
// 아래 테스트는 그 구분을 지킨다: 통과 여부는 rules가, 우열은 judge가.
// ─────────────────────────────────────────────────────────────

function candidate(over = {}) {
  return {
    id: over.id ?? "c1",
    keyword: over.keyword ?? "휴대폰 거치대",
    title: "휴대폰 거치대",
    category: "digital_acc",
    supplier: {
      platform: "domeggook",
      itemNo: "1",
      title: "거치대",
      url: "https://domeggook.com/1",
      unitPriceKrw: 5000,
      shippingKrw: over.shippingKrw ?? 2500,
      landedCostKrw: over.landedCostKrw ?? 7500,
      moq: 1,
      singleUnitVerified: true,
      imageUrls: over.imageUrls ?? ["a", "b", "c"],
      live: over.live ?? true,
    },
    priceKrw: 15900,
    netProfitKrw: over.netProfitKrw ?? 3000,
    marginPct: over.marginPct ?? 25,
    priceFloorKrw: 12000,
    pricingReason: "목표 마진",
    maxBidKrw: 500,
    breakevenCpcKrw: 800,
    relevance: over.relevance ?? 0.8,
    foundAt: new Date().toISOString(),
  };
}

test("★ 더 많이 남는 상품이 더 높은 점수를 받는다", () => {
  const thin = judgeCandidate(candidate({ netProfitKrw: 2600 }));
  const fat = judgeCandidate(candidate({ netProfitKrw: 9000 }));
  assert.ok(fat.score > thin.score, `${fat.score} > ${thin.score}이어야 한다`);
});

test("★ 발견 순서가 아니라 점수로 고른다 — 이게 판단과 수거의 차이다", () => {
  const first = candidate({ id: "먼저", keyword: "가", netProfitKrw: 2600 });
  const better = candidate({ id: "나중", keyword: "나", netProfitKrw: 9000 });

  const picked = pickBest([first, better], 1);
  assert.equal(picked.length, 1);
  assert.equal(picked[0].id, "나중", "먼저 발견됐다고 뽑히면 안 된다");
});

test("검색어 하나가 하루치를 다 차지하지 않는다 — 상품 구성이 쏠린다", () => {
  const pool = [
    candidate({ id: "a1", keyword: "거치대", netProfitKrw: 9000 }),
    candidate({ id: "a2", keyword: "거치대", netProfitKrw: 8500 }),
    candidate({ id: "a3", keyword: "거치대", netProfitKrw: 8000 }),
    candidate({ id: "b1", keyword: "텀블러", netProfitKrw: 3000 }),
  ];
  const picked = pickBest(pool, 2);
  const keywords = picked.map((p) => p.keyword);
  assert.deepEqual([...new Set(keywords)].sort(), ["거치대", "텀블러"]);
});

test("검색어가 모자라면 남은 것 중 좋은 순으로 채운다 — 빈손으로 끝내지 않는다", () => {
  const pool = [
    candidate({ id: "a1", keyword: "거치대", netProfitKrw: 9000 }),
    candidate({ id: "a2", keyword: "거치대", netProfitKrw: 8500 }),
  ];
  const picked = pickBest(pool, 2);
  assert.equal(picked.length, 2);
  assert.equal(picked[0].id, "a1", "좋은 것부터 나가야 한다");
});

test("고른 이유가 항상 남는다 — 답할 수 없는 선택은 검수할 수도 없다", () => {
  const picked = pickBest([candidate()], 1);
  assert.ok(picked[0].score > 0);
  assert.ok(picked[0].scoreReasons.length >= 3, "근거가 비어 있으면 안 된다");
  assert.ok(
    picked[0].scoreReasons.some((r) => r.includes("원 남음")),
    "순이익이 근거에 있어야 한다",
  );
});

test("사진을 많이 준 공급처가 유리하다 — 상세페이지 설득력이 여기서 갈린다", () => {
  const one = judgeCandidate(candidate({ imageUrls: ["a"] }));
  const many = judgeCandidate(candidate({ imageUrls: ["a", "b", "c", "d", "e", "f"] }));
  assert.ok(many.score > one.score);
});

test("입고 배송비가 큰 상품은 감점된다 — 반품 한 건에 마진이 날아간다", () => {
  const free = judgeCandidate(candidate({ shippingKrw: 0, landedCostKrw: 5000 }));
  const heavy = judgeCandidate(candidate({ shippingKrw: 4000, landedCostKrw: 9000 }));
  assert.ok(free.score > heavy.score);
});

test("적합도가 기록 안 된 옛 후보를 벌하지 않는다 — 없는 근거로 판단하지 않는다", () => {
  const old = candidate();
  delete old.relevance;
  const j = judgeCandidate(old);
  assert.ok(j.reasons.some((r) => r.includes("미기록")));
  assert.ok(j.score > 0);
});

test("0개를 원하면 0개를 낸다", () => {
  assert.deepEqual(pickBest([candidate()], 0), []);
});

// ── 사진 품질(비주얼) ────────────────────────────────────────

test("★ 못 살거같은 사진(낮은 visualAppeal)은 감점된다", () => {
  const good = judgeCandidate(candidate({ id: "a" }));
  const bad = candidate({ id: "b" });
  bad.visualAppeal = 0.1;
  bad.visualAppealNote = "조명이 어둡고 배경이 지저분함";
  const badJ = judgeCandidate(bad);
  assert.ok(badJ.score < good.score);
});

test("시간이 없어 사진 품질을 못 봤으면(undefined) 벌하지 않는다 — 중립", () => {
  const c = candidate();
  delete c.visualAppeal;
  const j = judgeCandidate(c);
  assert.ok(j.reasons.some((r) => r.includes("미판단")));
});

test("사진 품질 근거가 그대로 검수 화면 문구로 남는다", () => {
  const c = candidate();
  c.visualAppeal = 0.9;
  c.visualAppealNote = "선명하고 정돈된 사진";
  const j = judgeCandidate(c);
  assert.ok(j.reasons.includes("선명하고 정돈된 사진"));
});
