import test from "node:test";
import assert from "node:assert/strict";

import {
  applyDirectRevision,
  acceptCopyLine,
  reviseSection,
} from "../../jarvis/engine/revise.ts";
import {
  buildPageCopy,
  renderDetailPage,
  renderSections,
} from "../../jarvis/engine/detail-page.ts";

// ─────────────────────────────────────────────────────────────
// ★ "맘에 안 드는 곳만 클릭해서 이거 고쳐줘"
//
// 지키는 것 세 가지:
//  1. 고친 자리만 바뀐다 — 통째로 다시 만들면 마음에 들었던 부분까지 바뀐다
//  2. AI는 글자만 낸다 — HTML은 언제나 우리 렌더러가 그린다
//  3. 고친 뒤에도 없는 사실·판매자 용어·과장은 못 들어온다
// ─────────────────────────────────────────────────────────────

function candidate(over = {}) {
  return {
    id: "c1",
    keyword: "휴대폰 거치대",
    title: "휴대폰 거치대",
    category: "digital_acc",
    supplier: {
      platform: "domeggook",
      itemNo: "1",
      title: "차량용 휴대폰 거치대",
      url: "https://domeggook.com/1",
      unitPriceKrw: 5000,
      shippingKrw: 2500,
      landedCostKrw: 7500,
      moq: 1,
      singleUnitVerified: true,
      imageUrls: ["https://img/1.jpg", "https://img/2.jpg", "https://img/3.jpg"],
      live: true,
    },
    priceKrw: 15900,
    netProfitKrw: 3000,
    marginPct: 25,
    priceFloorKrw: 12000,
    pricingReason: "목표 마진",
    maxBidKrw: 500,
    breakevenCpcKrw: 800,
    foundAt: new Date().toISOString(),
    ...over,
  };
}

test("★ 「이 부분 빼줘」는 AI 없이 바로 된다", () => {
  const copy = buildPageCopy(candidate());
  const r = applyDirectRevision(copy, "problem", "이 부분 빼줘");
  assert.ok(r);
  assert.equal(r.copy.problemBody, "");
  assert.ok(!renderDetailPage(r.copy).includes(copy.problemBody));
});

test("★ 고친 자리만 바뀐다 — 나머지는 그대로다", () => {
  const copy = buildPageCopy(candidate());
  const r = applyDirectRevision(copy, "problem", "필요없어 지워줘");
  assert.deepEqual(r.copy.sellingPoints, copy.sellingPoints, "해결 섹션은 손대면 안 된다");
  assert.equal(r.copy.title, copy.title);
  assert.deepEqual(r.copy.images, copy.images);
});

test("사진을 빼도 맨 위 한 장은 남긴다 — 사진 없는 상품은 안 팔린다", () => {
  const copy = buildPageCopy(candidate());
  const r = applyDirectRevision(copy, "gallery", "사진 빼줘");
  assert.equal(r.copy.images.length, 1);
});

test("★ 상품명과 배송·반품 안내는 뺄 수 없다 — 필수 표기다", async () => {
  const copy = buildPageCopy(candidate());
  assert.equal(applyDirectRevision(copy, "hero", "빼줘"), null);
  assert.equal(applyDirectRevision(copy, "guarantee", "빼줘"), null);

  const r = await reviseSection({ copy, section: "guarantee", request: "이거 지워줘" });
  assert.equal(r.ok, false);
  assert.match(r.reason, /전자상거래법/);
});

test("★ 사진은 만들어내지 않는다 — 받은 물건과 화면이 달라진다", async () => {
  const copy = buildPageCopy(candidate());
  const r = await reviseSection({
    copy,
    section: "gallery",
    request: "더 예쁜 사진으로 바꿔줘",
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /공급처가 올린 실물/);
});

test("★ 과장·거짓 문구는 고친 뒤에도 못 들어온다", () => {
  assert.equal(acceptCopyLine("판매량 1위 베스트셀러"), null);
  assert.equal(acceptCopyLine("정품보장 100% 만족"), null);
  assert.equal(acceptCopyLine("누적 3만개 판매"), null);
  assert.equal(acceptCopyLine("후기 1200개"), null);
});

test("★ 판매자 용어도 못 들어온다 — 우리는 낱개를 판다", () => {
  assert.equal(acceptCopyLine("도매가로 10P 묶음"), null);
});

test("AI가 태그를 섞어 보내면 그 줄을 통째로 버린다", () => {
  assert.equal(acceptCopyLine("<b>튼튼합니다</b>"), null);
});

test("멀쩡한 문구는 통과한다 — 앞의 번호·따옴표는 떼어낸다", () => {
  assert.equal(acceptCopyLine('1. "한 손으로 꺼내고 넣기"'), "한 손으로 꺼내고 넣기");
});

test("빈 요청은 되묻는다", async () => {
  const copy = buildPageCopy(candidate());
  const r = await reviseSection({ copy, section: "problem", request: "   " });
  assert.equal(r.ok, false);
  assert.match(r.reason, /말씀해 주세요/);
});

test("★ 고친 페이지는 처음과 같은 규칙으로 그려진다 — 레이아웃이 안 깨진다", () => {
  const copy = buildPageCopy(candidate());
  const r = applyDirectRevision(copy, "problem", "빼줘");
  const html = renderDetailPage(r.copy);
  assert.ok(html.startsWith('<div class="jv-detail">'));
  assert.ok(html.includes("<style>"), "스타일이 빠지면 마켓에서 깨져 보인다");
  assert.ok(html.includes("jv-guarantee"), "남은 섹션은 그대로 그려져야 한다");
});

test("고칠 수 있는 단위와 화면에 보이는 단위가 같다", () => {
  const copy = buildPageCopy(candidate());
  const { sections } = renderSections(copy);
  const kinds = sections.map((s) => s.kind);
  assert.deepEqual(kinds, ["hero", "problem", "solution", "gallery", "spec", "guarantee"]);
});

test("AI 키가 없으면 왜 안 되는지 말해준다 — 조용히 실패하지 않는다", async () => {
  const saved = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const copy = buildPageCopy(candidate());
    const r = await reviseSection({
      copy,
      section: "problem",
      request: "더 짧고 담백하게 써줘",
    });
    assert.equal(r.ok, false);
    assert.match(r.reason, /OPENAI_API_KEY/);
    assert.match(r.reason, /빼줘.*는 지금도 됩니다/, "지금 되는 것도 같이 알려줘야 한다");
  } finally {
    if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
  }
});
