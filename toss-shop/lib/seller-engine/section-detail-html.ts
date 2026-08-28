/**
 * 섹션 플랜 → 상세페이지 HTML
 *
 * ★ 왜 렌더러를 따로 두는가
 *
 * "무엇을 쓸지"(detail-section-plan)와 "어떻게 보일지"(여기)를 분리해 두면,
 * 디자인을 바꿔도 사실 검증 로직이 안 흔들린다. 반대로 사실 판정을 고쳐도
 * 레이아웃이 안 깨진다. 과거에 AI에게 둘을 통짜로 맡겼다가 우리가 설계한
 * 구조가 통째로 무시된 적이 있어서(detail-page-engine 주석 참조), 이 경계는
 * 코드로 고정해 둔다 — **레이아웃은 언제나 코드가 정한다.**
 *
 * ★ 인라인 스타일만 쓰는 이유
 *
 * 토스 상세는 HTML을 sanitize한다. 외부 CSS·<style> 블록·스크립트는 살아남지
 * 못하므로 전부 인라인으로 박는다. 모바일에서 보는 사람이 대부분이라 폭을
 * 고정하지 않고 세로로 흐르게 둔다.
 */

import type { TossShopCategory } from "../types";
import type { PlannedSection, SectionPlan } from "./detail-section-plan";

export const SECTION_DETAIL_HTML_VERSION = "1.0";

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif";

/** 카테고리별 강조색 — 식품과 디지털이 같은 색이면 둘 다 어색하다 */
const ACCENT: Record<TossShopCategory, { main: string; soft: string; ink: string }> = {
  food: { main: "#c2410c", soft: "#fff7ed", ink: "#7c2d12" },
  beauty: { main: "#be185d", soft: "#fdf2f8", ink: "#831843" },
  home: { main: "#0f766e", soft: "#f0fdfa", ink: "#134e4a" },
  digital: { main: "#1d4ed8", soft: "#eff6ff", ink: "#1e3a8a" },
  fashion: { main: "#4338ca", soft: "#eef2ff", ink: "#312e81" },
  health: { main: "#15803d", soft: "#f0fdf4", ink: "#14532d" },
};

function img(url: string, alt: string, radius = "10px"): string {
  return (
    `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" ` +
    `style="display:block;width:100%;max-width:100%;height:auto;border-radius:${radius};margin:0 0 12px" />`
  );
}

/** 섹션 제목 — 작은 라벨 + 큰 문장의 2단 위계 */
function sectionHeading(label: string, heading: string, c: { main: string }): string {
  return (
    `<p style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:0.1em;` +
    `color:${c.main};text-transform:uppercase">${esc(label)}</p>` +
    `<h2 style="margin:0 0 20px;font-size:20px;line-height:1.45;font-weight:800;color:#0f172a;` +
    `letter-spacing:-0.02em">${esc(heading)}</h2>`
  );
}

const LABELS: Record<PlannedSection["kind"], string> = {
  hook: "",
  problem: "Problem",
  solution: "Solution",
  features: "Features",
  proof: "Proof",
  spec: "Info",
  guarantee: "Guide",
  faq: "FAQ",
};

function renderSection(s: PlannedSection, c: { main: string; soft: string; ink: string }, title: string): string {
  const pad = "padding:40px 24px";

  switch (s.kind) {
    case "hook":
      return (
        `<section style="${pad};text-align:center">` +
        `<h1 style="margin:0 0 22px;font-size:23px;line-height:1.4;font-weight:800;` +
        `color:#0f172a;letter-spacing:-0.02em">${esc(s.heading)}</h1>` +
        (s.imageUrls?.[0] ? img(s.imageUrls[0], title, "14px") : "") +
        `</section>`
      );

    case "problem":
      // 공감 구간 — 배경을 깔아 흐름의 전환을 만든다
      return (
        `<section style="${pad};background:#f8fafc;text-align:center">` +
        sectionHeading(LABELS.problem, s.heading, c) +
        s.body
          .map(
            (b) =>
              `<p style="margin:0 0 10px;font-size:16px;line-height:1.75;color:#475569">${esc(b)}</p>`,
          )
          .join("") +
        `</section>`
      );

    case "solution":
      return (
        `<section style="${pad}">` +
        sectionHeading(LABELS.solution, s.heading, c) +
        s.body
          .map(
            (b) =>
              `<p style="margin:0 0 14px;font-size:17px;line-height:1.7;font-weight:600;` +
              `color:#0f172a">${esc(b)}</p>`,
          )
          .join("") +
        `</section>`
      );

    case "features": {
      // 한국 상세페이지의 핵심 — 사진 하나에 문구 하나를 번갈아.
      // 짝지을 수 있는 만큼만 묶고, 남는 쪽은 억지로 짝을 만들지 않는다.
      const imgs = s.imageUrls ?? [];
      const paired = Math.min(imgs.length, s.body.length);
      const blocks: string[] = [];
      for (let i = 0; i < paired; i++) {
        blocks.push(
          `<div style="margin:0 0 34px">` +
            `<p style="margin:0 0 14px;font-size:17px;line-height:1.6;font-weight:700;` +
            `color:#0f172a;text-align:center">${esc(s.body[i])}</p>` +
            img(imgs[i], title) +
            `</div>`,
        );
      }
      for (let i = paired; i < s.body.length; i++) {
        blocks.push(
          `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;font-weight:600;` +
            `color:#0f172a;text-align:center">${esc(s.body[i])}</p>`,
        );
      }
      // 사진이 문구보다 많으면 남김없이 보여준다 — 실사진을 버리지 않는다
      if (imgs.length > paired) {
        blocks.push(
          `<p style="margin:26px 0 14px;font-size:15px;font-weight:700;color:#0f172a;` +
            `text-align:center">제품 디테일</p>`,
        );
        for (const u of imgs.slice(paired)) blocks.push(img(u, title));
      }
      return (
        `<section style="${pad}">` + sectionHeading(LABELS.features, s.heading, c) + blocks.join("") + `</section>`
      );
    }

    case "proof":
      return (
        `<section style="${pad};background:${c.soft};text-align:center">` +
        sectionHeading(LABELS.proof, s.heading, c) +
        s.body
          .map(
            (b) =>
              `<p style="margin:0 0 10px;font-size:16px;line-height:1.7;font-weight:600;` +
              `color:${c.ink}">${esc(b)}</p>`,
          )
          .join("") +
        `</section>`
      );

    case "spec": {
      const rows = (s.rows ?? [])
        .map(
          (r) =>
            `<tr>` +
            `<th style="padding:13px 0;text-align:left;font-size:14px;font-weight:600;` +
            `color:#64748b;width:35%;border-bottom:1px solid #f1f5f9">${esc(r.label)}</th>` +
            `<td style="padding:13px 0;font-size:14px;color:#0f172a;` +
            `border-bottom:1px solid #f1f5f9">${esc(r.value)}</td>` +
            `</tr>`,
        )
        .join("");
      return (
        `<section style="${pad}">` +
        sectionHeading(LABELS.spec, s.heading, c) +
        `<table style="width:100%;border-collapse:collapse">${rows}</table>` +
        `</section>`
      );
    }

    case "guarantee":
      return (
        `<section style="${pad}">` +
        sectionHeading(LABELS.guarantee, s.heading, c) +
        `<div style="background:${c.soft};border-radius:14px;padding:20px 22px">` +
        s.body
          .map(
            (b) =>
              `<p style="margin:0 0 8px;font-size:14px;line-height:1.75;color:#3f3f46">${esc(b)}</p>`,
          )
          .join("") +
        `</div></section>`
      );

    case "faq":
      return (
        `<section style="${pad}">` +
        sectionHeading(LABELS.faq, s.heading, c) +
        (s.qa ?? [])
          .map(
            (o) =>
              `<div style="padding:17px 0;border-bottom:1px solid #f1f5f9">` +
              `<p style="margin:0 0 7px;font-size:15px;font-weight:700;color:#0f172a">` +
              `Q. ${esc(o.concern)}</p>` +
              `<p style="margin:0;font-size:14px;line-height:1.75;color:#475569">` +
              `A. ${esc(o.answer)}</p></div>`,
          )
          .join("") +
        `</section>`
      );
  }
}

/**
 * 섹션 플랜을 상세페이지 HTML로 렌더링한다.
 *
 * `<div>` 하나로 감싼 조각을 돌려준다 — 토스 DESCRIPTION_HTML에 그대로
 * 실어 보낼 수 있는 형태다. 완전한 문서(<html>)가 아니다.
 */
export function renderSectionPlanHtml(
  plan: SectionPlan,
  opts: { title: string; category?: TossShopCategory },
): string {
  const c = ACCENT[opts.category ?? "home"] ?? ACCENT.home;
  const body = plan.sections.map((s) => renderSection(s, c, opts.title)).join("");
  return (
    `<div style="max-width:860px;margin:0 auto;font-family:${FONT};` +
    `color:#0f172a;line-height:1.65">${body}</div>`
  );
}
