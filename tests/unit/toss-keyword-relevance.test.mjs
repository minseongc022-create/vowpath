import test from "node:test";
import assert from "node:assert/strict";

import {
  assessKeywordRelevance,
  buildRelevantTitle,
  MIN_RELEVANCE_SCORE,
} from "../../toss-shop/lib/seller-engine/keyword-relevance.ts";
import { competitorsForProduct } from "../../toss-shop/lib/seller-engine/pricing.ts";

// ─────────────────────────────────────────────────────────────
// 이 테스트가 지키는 것: 키워드와 상품이 다른 물건이면 제목을 만들지 않는다.
//
// 실제로 관측된 증상: 카테고리만 맞으면 아무 상품이나 뽑아 키워드를 앞에
// 붙였기 때문에 "무선이어폰 주방 세제" 같은 제목이 나왔다.
// ─────────────────────────────────────────────────────────────

test("무관한 키워드×상품은 관련 없음으로 판정한다", () => {
  const v = assessKeywordRelevance({ keyword: "무선이어폰", productName: "주방 세제 1L" });
  assert.equal(v.relevant, false);
  assert.ok(v.score < MIN_RELEVANCE_SCORE);
  assert.match(v.reason, /설명하지 않는다/);
});

test("무관한 조합에는 키워드를 제목에 붙이지 않는다 — 이게 그 버그다", () => {
  const r = buildRelevantTitle({ keyword: "무선이어폰", productName: "주방 세제 1L" });
  assert.equal(r.keywordApplied, false);
  assert.equal(r.title, "주방 세제 1L");
  assert.ok(!r.title.includes("무선이어폰"), "무관한 키워드가 제목에 들어가면 안 된다");
});

test("관련 있는 조합은 키워드를 앞에 붙인다", () => {
  const r = buildRelevantTitle({ keyword: "무선이어폰", productName: "블루투스 무선이어폰 5.3" });
  assert.equal(r.keywordApplied, true);
  assert.ok(r.title.includes("무선이어폰"));
});

test("키워드가 이미 상품명에 있으면 중복해서 붙이지 않는다 (스팸 판정 회피)", () => {
  const r = buildRelevantTitle({ keyword: "텀블러", productName: "스테인리스 텀블러 500ml" });
  assert.equal(r.title, "스테인리스 텀블러 500ml");
  const occurrences = r.title.split("텀블러").length - 1;
  assert.equal(occurrences, 1, "키워드가 두 번 들어가면 키워드 반복 스팸이다");
});

test("띄어쓰기만 다른 경우는 관련 있음으로 구제한다", () => {
  const v = assessKeywordRelevance({ keyword: "무선 이어폰", productName: "무선이어폰 블루투스" });
  assert.equal(v.relevant, true);
});

test("'대용량' 같은 수식어 하나로는 통과하지 못한다", () => {
  // 종전 competitorsForProduct는 이런 토큰 하나만 겹쳐도 경쟁자로 인정했다
  const v = assessKeywordRelevance({ keyword: "대용량 생수", productName: "대용량 물티슈" });
  assert.equal(v.relevant, false, "'대용량'만 겹치는 건 같은 물건이 아니다");
});

test("공급처 원본 상품명도 함께 본다", () => {
  const v = assessKeywordRelevance({
    keyword: "캠핑의자",
    productName: "야외용 접이식 의자",
    supplierTitle: "경량 캠핑의자 접이식",
  });
  assert.equal(v.relevant, true);
});

test("빈 입력은 통과시키지 않는다 (fail-closed)", () => {
  assert.equal(assessKeywordRelevance({ keyword: "", productName: "생수" }).relevant, false);
  assert.equal(assessKeywordRelevance({ keyword: "생수", productName: "" }).relevant, false);
});

// ─────────────────────────────────────────────────────────────
// 경쟁사 매칭 — 가격의 기준이므로 오염되면 값이 틀어진다
// ─────────────────────────────────────────────────────────────

const p = (id, name, priceKrw) => ({
  id,
  name,
  priceKrw,
  category: "home",
  sellerName: `셀러${id}`,
  rank: 1,
});

test("같은 카테고리라도 다른 물건은 경쟁자가 아니다", () => {
  const target = p("a", "스테인리스 텀블러 500ml", 12_000);
  const catalog = [
    target,
    p("b", "스테인리스 텀블러 350ml", 10_000), // 같은 물건 → 경쟁자
    p("c", "주방 세제 1L", 4_000), // 카테고리만 같음 → 경쟁자 아님
    p("d", "대용량 물티슈 100매", 3_000), // 수식어만 겹침 → 경쟁자 아님
  ];
  const competitors = competitorsForProduct(target, catalog);
  const names = competitors.map((c) => c.sellerName);
  assert.ok(names.includes("셀러b"), "같은 물건은 경쟁자여야 한다");
  assert.ok(!names.includes("셀러c"), "주방세제가 텀블러의 경쟁자가 되면 가격이 틀어진다");
  assert.ok(!names.includes("셀러d"), "물티슈가 텀블러의 경쟁자가 되면 가격이 틀어진다");
});

test("경쟁자가 없으면 빈 배열 — 잘못된 경쟁가를 지어내지 않는다", () => {
  const target = p("a", "스테인리스 텀블러 500ml", 12_000);
  const catalog = [target, p("c", "주방 세제 1L", 4_000)];
  assert.equal(competitorsForProduct(target, catalog).length, 0);
});
