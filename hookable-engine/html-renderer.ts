/**
 * 5단계 — 생성(Generate): 코드 객체 → 최종 HTML
 *
 * "레이아웃은 항상 코드가 정한다" — AI는 문구·이미지 배치만 채우고, 마크업/
 * CSS는 이 파일이 고정한다. toss-shop의 premium-detail-template.ts 등과는
 * 완전히 다른 파일이며 서로 import하지 않는다.
 */

import type { CodeObject, DetailPageDocument, ProductInput, SectionKind } from "./types";

export const HTML_RENDERER_VERSION = "1.0";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SECTION_LABEL: Record<SectionKind, string> = {
  hook: "",
  problem: "이런 고민 있으셨나요",
  solution: "해결책",
  features: "핵심 특징",
  proof: "신뢰 포인트",
  spec: "상품 정보",
  guarantee: "배송 · 교환 · 반품",
  faq: "자주 묻는 질문",
  cta: "지금 구매하기",
};

function renderObject(obj: CodeObject): string {
  switch (obj.type) {
    case "text":
      if (obj.role === "heading") return `<h2 class="h">${escapeHtml(obj.content)}</h2>`;
      if (obj.role === "caption") return `<p class="cap">${escapeHtml(obj.content)}</p>`;
      return `<p class="b">${escapeHtml(obj.content)}</p>`;
    case "image":
      return `<figure class="img"><img src="${escapeHtml(obj.src)}" alt="${escapeHtml(obj.alt)}" loading="lazy" /></figure>`;
    case "table":
      return `<table class="tbl"><tbody>${obj.rows
        .map((r) => `<tr><th>${escapeHtml(r.label)}</th><td>${escapeHtml(r.value)}</td></tr>`)
        .join("")}</tbody></table>`;
    case "qa":
      return `<div class="qa-list">${obj.items
        .map((qa) => `<div class="qa"><p class="q">Q. ${escapeHtml(qa.q)}</p><p class="a">A. ${escapeHtml(qa.a)}</p></div>`)
        .join("")}</div>`;
    default:
      return "";
  }
}

export function renderDocumentToHtml(doc: DetailPageDocument, input: ProductInput): string {
  const byId = new Map(doc.objects.map((o) => [o.id, o]));
  const sectionsByKind = new Map(
    doc.objects.filter((o): o is Extract<CodeObject, { type: "section" }> => o.type === "section").map((s) => [s.kind, s]),
  );

  const body = doc.sectionOrder
    .map((kind) => {
      const section = sectionsByKind.get(kind);
      if (!section) return "";
      const inner = section.childIds.map((id) => byId.get(id)).filter(Boolean).map((o) => renderObject(o!)).join("");
      const label = SECTION_LABEL[kind];
      return `<section class="sec sec-${kind}">${label ? `<p class="eyebrow">${escapeHtml(label)}</p>` : ""}${inner}</section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(input.name)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Pretendard", -apple-system, "Segoe UI", sans-serif; color: #17181c; line-height: 1.65; background: #fff; }
  .page { max-width: 720px; margin: 0 auto; }
  .sec { padding: 32px 22px; }
  .sec-hook { text-align: center; background: #111318; color: #fff; padding: 40px 22px; }
  .sec-hook .h { font-size: 1.5rem; font-weight: 800; }
  .sec-hook .b { opacity: 0.75; margin-top: 8px; }
  .eyebrow { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #7c6cf0; margin-bottom: 10px; }
  .h { font-size: 1.15rem; font-weight: 800; margin-bottom: 12px; }
  .b { font-size: 0.94rem; color: #3a3d46; margin-bottom: 8px; }
  .img img { width: 100%; display: block; border-radius: 12px; margin-bottom: 10px; }
  .sec-features .img img { border-radius: 14px; }
  .tbl { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  .tbl th, .tbl td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #eceef2; }
  .tbl th { width: 32%; color: #6b7280; font-weight: 600; }
  .qa { padding: 12px 0; border-bottom: 1px solid #eceef2; }
  .qa .q { font-weight: 700; margin-bottom: 4px; }
  .qa .a { color: #52555e; font-size: 0.9rem; }
  .sec-cta { text-align: center; background: #f4f2ff; }
  .sec-cta .h { color: #4338ca; }
</style>
</head>
<body>
  <div class="page">${body}</div>
</body>
</html>`;
}
