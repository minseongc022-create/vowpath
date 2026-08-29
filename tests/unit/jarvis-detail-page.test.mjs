import test from "node:test";
import assert from "node:assert/strict";

import { buildDetailPage } from "../../jarvis/engine/detail-page.ts";
import { hasSellerJargon } from "../../jarvis/engine/relevance.ts";

function candidate(over = {}) {
  return {
    id: "c_test",
    keyword: "주방 수납선반",
    title: "주방 수납선반 2단 스테인리스",
    category: "kitchen",
    supplier: {
      platform: "domeme",
      itemNo: "12345",
      title: "[무료배송] 대박특가 주방 수납선반 2단 10P 도매 사입",
      url: "https://domeggook.com/12345",
      unitPriceKrw: 9_000,
      shippingKrw: 2_500,
      landedCostKrw: 11_500,
      moq: 1,
      singleUnitVerified: true,
      imageUrls: ["https://img.example/1.jpg", "https://img.example/2.jpg"],
      live: true,
    },
    priceKrw: 24_900,
    netProfitKrw: 5_200,
    marginPct: 20.9,
    priceFloorKrw: 22_000,
    pricingReason: "목표 마진 28% 기준가",
    maxBidKrw: 120,
    breakevenCpcKrw: 185,
    foundAt: new Date().toISOString(),
    ...over,
  };
}

test("상세페이지에 셀러 전문용어가 절대 나가지 않는다", () => {
  const page = buildDetailPage(candidate());
  // 공급처 제목에 '도매 사입 무료배송 10P'가 들어 있는데 그대로 새면 안 된다
  const textOnly = page.html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
  assert.ok(!/도매|사입|B2B/i.test(textOnly), `셀러 용어가 샜다: ${textOnly.slice(0, 300)}`);
});

test("낱개를 파는데 묶음 수량이 표시되지 않는다 — 거짓 정보 차단", () => {
  const page = buildDetailPage(candidate());
  const textOnly = page.html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
  assert.ok(!/10\s*P/i.test(textOnly), "10P가 남으면 낱개 판매와 모순된다");
  assert.ok(textOnly.includes("1개"), "판매 단위가 1개임을 밝혀야 한다");
});

test("후기 섹션은 만들지 않는다 — 지어낸 후기는 표시광고법 위반이다", () => {
  const page = buildDetailPage(candidate());
  const omittedKinds = page.omitted.map((o) => o.kind);
  assert.ok(omittedKinds.includes("review"), "후기 섹션은 명시적으로 빠져야 한다");
  assert.ok(!/후기|리뷰|별점|⭐/.test(page.html), "후기 흔적이 있으면 안 된다");
});

test("공급처 사진이 없으면 갤러리를 빼고 이유를 남긴다 — 생성 이미지는 쓰지 않는다", () => {
  const c = candidate();
  c.supplier.imageUrls = [];
  const page = buildDetailPage(c);
  assert.ok(page.omitted.some((o) => o.kind === "gallery"));
  // 스타일 블록에는 모든 클래스 규칙이 항상 들어 있으므로 본문만 본다
  const body = page.html.replace(/<style[\s\S]*?<\/style>/g, "");
  assert.ok(!body.includes("jv-shots"), "갤러리를 뺐는데 본문에 남아 있다");
  assert.ok(!body.includes("<img"), "사진이 없으면 img 태그도 없어야 한다");
});

test("카테고리에 맞는 말투를 쓴다", () => {
  const kitchen = buildDetailPage(candidate({ category: "kitchen" }));
  const car = buildDetailPage(candidate({ category: "car" }));
  assert.notEqual(
    kitchen.html.match(/<h2>([^<]+)<\/h2>/)?.[1],
    car.html.match(/<h2>([^<]+)<\/h2>/)?.[1],
    "주방과 자동차용품이 같은 문구면 카테고리 톤이 없는 것이다",
  );
});

test("모르는 카테고리도 페이지가 깨지지 않는다", () => {
  const page = buildDetailPage(candidate({ category: "존재하지않는분류" }));
  assert.ok(page.html.includes("jv-detail"));
  assert.ok(page.sellingPoints.length > 0);
});

test("HTML 특수문자를 이스케이프해 레이아웃이 깨지지 않는다", () => {
  const page = buildDetailPage(
    candidate({ title: '<script>alert("x")</script> 정리함 & 선반' }),
  );
  assert.ok(!page.html.includes("<script>"), "스크립트 태그가 그대로 들어가면 안 된다");
  assert.ok(page.html.includes("&amp;") || page.html.includes("&lt;"));
});

test("셀링포인트에도 셀러 용어가 없다", () => {
  const page = buildDetailPage(candidate());
  for (const p of page.sellingPoints) {
    assert.equal(hasSellerJargon(p), false, `셀링포인트에 셀러 용어: ${p}`);
  }
});

test("스타일이 본문에 함께 들어간다 — 오픈마켓은 외부 CSS를 못 부른다", () => {
  const page = buildDetailPage(candidate());
  assert.ok(page.html.includes("<style>"), "인라인 스타일이 없으면 상세가 맨몸으로 뜬다");
  assert.ok(page.html.includes(".jv-"), "클래스에 접두어가 있어야 마켓 스타일과 안 부딪힌다");
});
