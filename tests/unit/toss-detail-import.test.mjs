import test from "node:test";
import assert from "node:assert/strict";

import { importExternalDetailPage } from "../../toss-shop/lib/seller-engine/detail-page-import.ts";
import {
  listDetailSources,
  externalDetailSources,
  externalSourceBlockedNote,
} from "../../toss-shop/lib/seller-engine/detail-page-sources.ts";

// ─────────────────────────────────────────────────────────────
// 반입 경로 — 후커블·드랩아트에서 만든 결과를 자비스가 받는다
// ─────────────────────────────────────────────────────────────

test("정상 HTML은 반입된다", () => {
  const r = importExternalDetailPage({
    html: `<div><h1>스테인리스 텀블러</h1><p>${"보온 6시간 유지되는 이중 진공 구조입니다. ".repeat(6)}</p><img src="https://x/1.jpg"></div>`,
    sourceLabel: "후커블",
  });
  assert.equal(r.status, "ready");
  assert.ok(r.html.includes("텀블러"));
});

test("스크립트는 제거하고 반입한다", () => {
  const r = importExternalDetailPage({
    html:
      `<div><script>alert(1)</script><p>${"보온 6시간 유지되는 이중 진공 구조입니다. ".repeat(6)}</p><img src="https://x/1.jpg"></div>`,
  });
  assert.equal(r.status, "ready");
  assert.ok(!/<script/i.test(r.html), "스크립트가 남으면 상세페이지에서 실행된다");
  assert.ok(r.removed.length > 0, "무엇이 제거됐는지 기록돼야 한다");
});

test("인라인 이벤트 핸들러와 javascript: 스킴도 제거한다", () => {
  const r = importExternalDetailPage({
    html:
      `<div onclick="steal()"><a href="javascript:bad()">링크</a><p>${"보온 6시간 유지되는 이중 진공 구조입니다. ".repeat(6)}</p><img src="https://x/1.jpg"></div>`,
  });
  assert.equal(r.status, "ready");
  assert.ok(!/onclick/i.test(r.html));
  assert.ok(!/javascript:/i.test(r.html));
});

test("토스 정책 위반 문구가 있으면 등록을 막는다", () => {
  // 외부 툴은 토스 정책을 모른다. 그대로 올리면 페널티 → 배송 인센티브 상실 →
  // 전 상품 마진 8%p 하락으로 번진다.
  const r = importExternalDetailPage({
    html: `<div><p>100% 정품 보장! 마감 임박!! ${"좋은 상품입니다. ".repeat(10)}</p><img src="https://x/1.jpg"></div>`,
  });
  assert.equal(r.status, "rejected");
  assert.ok(r.blockers.some((b) => b.includes("정책 위반")));
});

test("내용이 없으면 반려한다", () => {
  const r = importExternalDetailPage({});
  assert.equal(r.status, "rejected");
  assert.ok(r.blockers.length > 0);
});

test("본문이 너무 짧고 이미지도 없으면 반려한다", () => {
  const r = importExternalDetailPage({ html: "<p>좋아요</p>" });
  assert.equal(r.status, "rejected");
  assert.ok(r.blockers.some((b) => b.includes("부족")));
});

test("이미지 URL만으로도 상세페이지를 만든다 (국내 상세는 이미지 슬라이스가 표준)", () => {
  const r = importExternalDetailPage({
    imageUrls: ["https://x/1.jpg", "https://x/2.jpg", "https://x/3.jpg"],
    productName: "스테인리스 텀블러",
  });
  assert.equal(r.status, "ready");
  assert.equal((r.html.match(/<img/g) ?? []).length, 3);
  assert.ok(r.html.includes("스테인리스 텀블러"), "alt 텍스트에 상품명이 들어가야 한다");
});

test("이미지 1장은 상세페이지로 부족하다", () => {
  const r = importExternalDetailPage({ imageUrls: ["https://x/1.jpg"] });
  assert.equal(r.status, "rejected");
});

test("이미지 URL은 이스케이프된다", () => {
  const r = importExternalDetailPage({
    imageUrls: ['https://x/1.jpg" onerror="alert(1)', "https://x/2.jpg"],
    productName: "텀블러",
  });
  assert.equal(r.status, "ready");
  assert.ok(!/onerror=/i.test(r.html), "속성 탈출이 가능하면 안 된다");
});

// ─────────────────────────────────────────────────────────────
// 공급원 레지스트리 — 없는 API를 있다고 말하지 않는다
// ─────────────────────────────────────────────────────────────

test("외부 SaaS는 전부 needs_spec — 추측 스펙으로 호출하지 않는다", () => {
  for (const s of externalDetailSources()) {
    assert.equal(s.status, "needs_spec", `${s.label}은 공개 API 스펙이 확인되지 않았다`);
    assert.ok(s.note.length > 0, "왜 못 쓰는지 설명이 있어야 한다");
  }
});

test("반입 경로는 키 없이 항상 live", () => {
  const manual = listDetailSources().find((s) => s.id === "manual_import");
  assert.ok(manual);
  assert.equal(manual.status, "live");
  assert.equal(manual.envKeys.length, 0);
});

test("왜 외부 SaaS가 안 붙는지 사람에게 설명한다", () => {
  const note = externalSourceBlockedNote();
  assert.ok(note);
  assert.ok(note.includes("반입"), "대안을 제시해야 한다");
});
