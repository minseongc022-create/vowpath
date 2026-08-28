import test from "node:test";
import assert from "node:assert/strict";

import { planDetailSections } from "../../toss-shop/lib/seller-engine/detail-section-plan.ts";
import { renderSectionPlanHtml } from "../../toss-shop/lib/seller-engine/section-detail-html.ts";
import { collectOwnerTodos } from "../../toss-shop/lib/seller-engine/owner-todo-alerts.ts";

const base = {
  title: "스테인리스 텀블러 500ml",
  category: "home",
  sellingPoints: ["보온 6시간 유지", "식기세척기 사용 가능", "손잡이 분리형"],
  imageUrls: ["https://x/1.jpg", "https://x/2.jpg", "https://x/3.jpg"],
  deliveryNote: "결제 확인 후 순차 발송됩니다.",
};

// ─────────────────────────────────────────────────────────────
// 섹션 구성 — 후커블/드랩 구조를 따르되 근거 없는 섹션은 뺀다
// ─────────────────────────────────────────────────────────────

test("표준 흐름 순서를 지킨다 (hook → problem → solution → features)", () => {
  const plan = planDetailSections(base);
  const kinds = plan.sections.map((s) => s.kind);
  assert.equal(kinds[0], "hook");
  assert.ok(kinds.indexOf("problem") < kinds.indexOf("solution"), "공감이 해결보다 먼저와야 한다");
  assert.ok(kinds.indexOf("solution") < kinds.indexOf("features"), "해결이 근거보다 먼저와야 한다");
  assert.ok(kinds.includes("guarantee"), "배송·반품은 항상 있어야 한다");
});

test("실적이 없으면 사회적 증거 섹션을 만들지 않는다 — 리뷰를 지어내지 않는다", () => {
  const plan = planDetailSections(base);
  assert.ok(!plan.sections.some((s) => s.kind === "proof"));
  const omitted = plan.omitted.find((o) => o.kind === "proof");
  assert.ok(omitted, "왜 뺐는지 기록돼야 한다");
  assert.match(omitted.reason, /지어내지 않고/);
});

test("실제 판매 실적이 있으면 사회적 증거를 넣는다", () => {
  const plan = planDetailSections({ ...base, proof: { soldCount: 120 } });
  const proof = plan.sections.find((s) => s.kind === "proof");
  assert.ok(proof);
  assert.ok(proof.body.some((b) => b.includes("120")));
});

test("판매 실적이 10개 미만이면 증거로 쓰지 않는다 — 표본이 너무 적다", () => {
  const plan = planDetailSections({ ...base, proof: { soldCount: 3 } });
  assert.ok(!plan.sections.some((s) => s.kind === "proof"));
});

test("규격 정보가 없으면 상품정보 표를 만들지 않는다", () => {
  const plan = planDetailSections(base);
  assert.ok(!plan.sections.some((s) => s.kind === "spec"));
  assert.ok(plan.omitted.some((o) => o.kind === "spec"));
});

test("규격이 있으면 표로 넣는다", () => {
  const plan = planDetailSections({
    ...base,
    specs: [{ label: "용량", value: "500ml" }, { label: "소재", value: "스테인리스" }],
  });
  const spec = plan.sections.find((s) => s.kind === "spec");
  assert.ok(spec);
  assert.equal(spec.rows.length, 2);
});

test("셀링포인트가 없으면 솔루션을 단정하지 않는다", () => {
  const plan = planDetailSections({ ...base, sellingPoints: [] });
  assert.ok(!plan.sections.some((s) => s.kind === "solution"));
  assert.ok(plan.omitted.some((o) => o.kind === "solution"));
});

test("금지 문구는 섹션 본문에서 걸러진다", () => {
  const plan = planDetailSections({
    ...base,
    sellingPoints: ["업계 1위 최고급 제품", "보온 6시간 유지"],
  });
  const all = plan.sections.flatMap((s) => s.body).join(" ");
  assert.ok(!all.includes("업계 1위"), "실증 없는 최상급 표현이 남으면 안 된다");
  assert.ok(!all.includes("최고급"));
});

// ─────────────────────────────────────────────────────────────
// 렌더링
// ─────────────────────────────────────────────────────────────

test("HTML로 렌더링되고 이미지·문구가 들어간다", () => {
  const html = renderSectionPlanHtml(planDetailSections(base), {
    title: base.title,
    category: "home",
  });
  assert.ok(html.includes("스테인리스 텀블러"));
  assert.ok(html.includes("https://x/1.jpg"));
  assert.ok(html.includes("보온 6시간"));
  // 토스가 sanitize하므로 스크립트·외부 CSS는 애초에 넣지 않는다
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("<style"));
});

test("HTML 이스케이프 — 상품명에 태그가 있어도 안전하다", () => {
  const html = renderSectionPlanHtml(
    planDetailSections({ ...base, title: '<img src=x onerror="alert(1)">' }),
    { title: "x", category: "home" },
  );
  // 검사할 것은 "onerror라는 글자가 없는가"가 아니라 **태그로 살아나는가**이다.
  // < 와 " 가 이스케이프되면 브라우저는 이걸 그냥 글자로 그린다.
  assert.ok(!html.includes("<img src=x"), "주입된 태그가 살아나면 안 된다");
  assert.ok(html.includes("&lt;img"), "태그는 글자로 이스케이프돼야 한다");
  assert.ok(!html.includes('onerror="alert'), "속성 따옴표 탈출이 가능하면 안 된다");
});

test("카테고리마다 강조색이 다르다", () => {
  const food = renderSectionPlanHtml(planDetailSections({ ...base, category: "food" }), {
    title: base.title,
    category: "food",
  });
  const digital = renderSectionPlanHtml(planDetailSections({ ...base, category: "digital" }), {
    title: base.title,
    category: "digital",
  });
  assert.notEqual(food, digital, "식품과 디지털이 같은 톤이면 둘 다 어색하다");
});

// ─────────────────────────────────────────────────────────────
// 검수 알림
// ─────────────────────────────────────────────────────────────

test("검수 대기가 있으면 알림 항목이 생긴다", () => {
  const todos = collectOwnerTodos([], Date.now(), {
    pendingReviewCount: 3,
    reviewUrl: "https://example.com/review",
  });
  const review = todos.find((t) => t.kind === "need_review");
  assert.ok(review);
  assert.equal(review.count, 3);
  assert.ok(review.message.includes("3건"));
  assert.ok(review.message.includes("https://example.com/review"), "링크가 있어야 눌러서 연다");
});

test("검수 대기가 없으면 알림도 없다", () => {
  const todos = collectOwnerTodos([], Date.now(), { pendingReviewCount: 0 });
  assert.ok(!todos.some((t) => t.kind === "need_review"));
});
