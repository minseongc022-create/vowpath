import test from "node:test";
import assert from "node:assert/strict";

import {
  scoreRelevance,
  cleanSupplierTitle,
  buildTitle,
  hasSellerJargon,
} from "../../jarvis/engine/relevance.ts";
import { getKeywords, keywordPoolSize } from "../../jarvis/engine/keywords.ts";
import { MIN_RELEVANCE } from "../../jarvis/core/rules.ts";

// ─────────────────────────────────────────────────────────────
// 관련성 — "무선이어폰 주방 세제"가 만들어지지 않게
// ─────────────────────────────────────────────────────────────

test("같은 물건이면 관련성이 높다", () => {
  assert.ok(scoreRelevance("태블릿 케이스", "가죽 태블릿 케이스 11인치") >= MIN_RELEVANCE);
  assert.ok(scoreRelevance("주방 수납선반", "주방수납선반 2단 스텐") >= MIN_RELEVANCE);
  assert.ok(scoreRelevance("요가 매트", "논슬립 요가매트 10mm") >= MIN_RELEVANCE);
});

test("다른 물건이면 관련성이 낮다 — 실제 사고 재현", () => {
  assert.ok(
    scoreRelevance("무선이어폰", "주방 세제 대용량") < MIN_RELEVANCE,
    "이 조합이 통과하면 「무선이어폰 주방 세제」 제목이 만들어진다",
  );
  assert.ok(scoreRelevance("태블릿 케이스", "블루투스 이어폰 ANC") < MIN_RELEVANCE);
  assert.ok(scoreRelevance("반려견 하네스", "차량용 방향제") < MIN_RELEVANCE);
});

test("붙여 쓴 한국어 제목도 잡아낸다", () => {
  // 한국어 상품명은 띄어쓰기가 제각각이라 토큰 일치만으로는 놓친다
  assert.ok(scoreRelevance("수납 정리함", "수납정리함3단") >= MIN_RELEVANCE);
});

// ─────────────────────────────────────────────────────────────
// 제목 — 셀러 용어와 거짓 수량이 고객에게 나가면 안 된다
// ─────────────────────────────────────────────────────────────

test("셀러 전문용어를 걷어낸다", () => {
  const cleaned = cleanSupplierTitle("[무료배송] 대박특가 주방 정리함 10P 도매 사입 B2B");
  assert.ok(!/도매|사입|B2B|무료배송|대박특가/i.test(cleaned), `남았다: ${cleaned}`);
  assert.ok(cleaned.includes("정리함"), "상품 자체는 남아야 한다");
});

test("묶음 수량 표기를 지운다 — 낱개를 파는데 10P는 거짓말이다", () => {
  for (const raw of ["정리함 10P", "수세미 5개입", "행주 20매", "케이스 x3"]) {
    const cleaned = cleanSupplierTitle(raw);
    assert.ok(!/\d+\s*(p|개입|매|팩)|x\s*\d/i.test(cleaned), `수량이 남았다: ${cleaned}`);
  }
});

test("제목에 검색어가 이미 있으면 또 붙이지 않는다", () => {
  const title = buildTitle("태블릿 케이스", "가죽 태블릿 케이스 11인치");
  assert.equal(
    (title.match(/태블릿/g) ?? []).length,
    1,
    `검색어가 중복됐다: ${title}`,
  );
});

test("제목에 검색어가 없으면 앞에 붙여 노출을 살린다", () => {
  const title = buildTitle("차량용 컵홀더", "실리콘 음료 거치 트레이");
  assert.ok(title.startsWith("차량용 컵홀더"));
});

test("다듬고 나서 남는 게 없으면 검색어를 쓴다 — 빈 제목보다 낫다", () => {
  assert.equal(buildTitle("우산", "[무료배송] 도매 사입"), "우산");
});

test("제목이 60자를 넘지 않고 단어 중간에서 잘리지 않는다", () => {
  const long = buildTitle(
    "수납 정리함",
    "다용도 대용량 접이식 옷장 서랍 수납 정리 보관 박스 커버형 투명창 손잡이 부착형",
  );
  assert.ok(long.length <= 60, `${long.length}자`);
  assert.ok(!long.endsWith(" "));
});

test("고객 문구에 셀러 용어가 섞였는지 마지막으로 확인한다", () => {
  assert.equal(hasSellerJargon("도매가로 싸게 드립니다"), true);
  assert.equal(hasSellerJargon("10P 묶음"), true);
  assert.equal(hasSellerJargon("튼튼한 스테인리스 소재로 오래 씁니다"), false);
});

// ─────────────────────────────────────────────────────────────
// 검색어 풀 — 매 사이클 같은 앞쪽만 훑으면 뒤쪽은 기회가 없다
// ─────────────────────────────────────────────────────────────

test("offset을 밀면 다른 검색어를 훑는다", () => {
  const first = getKeywords(10, 0).map((k) => k.keyword);
  const later = getKeywords(10, 30).map((k) => k.keyword);
  assert.notDeepEqual(first, later, "offset이 달라도 같은 목록이면 뒤쪽은 영영 안 돈다");
});

test("끝에 닿으면 앞으로 돌아와 전체를 빠짐없이 돈다", () => {
  const size = keywordPoolSize();
  const wrapped = getKeywords(5, size - 2);
  assert.equal(wrapped.length, 5, "끝에서 잘리면 안 된다");
  assert.equal(new Set(wrapped.map((k) => k.keyword)).size, 5, "중복 없이 이어져야 한다");
});

test("요청한 만큼만 준다", () => {
  assert.equal(getKeywords(12, 0).length, 12);
});
