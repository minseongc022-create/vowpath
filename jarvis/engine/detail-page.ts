/**
 * 상세페이지 — 후커블급 구성
 *
 * ★ 무엇을 따라 만들었는가
 *
 * 후커블·드랩이 쓰는 건 특별한 비법이 아니라 **고전 설득 구조(PASONA)**다:
 *
 *   Problem   지금 뭐가 불편한가
 *   Agitation 그대로 두면 어떻게 되는가
 *   Solution  이 상품이 그걸 어떻게 푸는가
 *   Narrowing 왜 지금, 왜 이걸로
 *   Action    사면 뭐가 보장되는가
 *
 * ★ 결정적 차이: 없는 근거는 지어내지 않는다
 *
 * 드랩은 입력 4개로 9개 섹션을 **항상** 만든다. 가능한 이유는 AI가 없는 걸
 * 지어내기 때문이다 — "고객 리뷰" 섹션에 아직 하나도 안 팔린 상품의 후기가
 * 박힌다. 그건 표시광고법 위반이고, 무엇보다 거짓말이다.
 *
 * 그래서 여기서는 **근거가 있는 섹션만 만들고 없으면 통째로 뺀다.**
 * 섹션이 적은 페이지가 지어낸 후기가 박힌 페이지보다 언제나 낫다.
 *
 * ★ 고객이 보는 화면에는 셀러의 말이 나가지 않는다
 *
 * 공급처 제목·설명에 섞인 `도매`, `사입`, `10P`, `무료배송`은 전부 걷어낸다.
 * 특히 수량 표기는 **거짓 정보**다 — 우리는 낱개를 판다.
 */

import type { Candidate } from "../core/types";
import { cleanSupplierTitle, hasSellerJargon } from "./relevance";

export const DETAIL_PAGE_VERSION = "2.0";

// ─────────────────────────────────────────────────────────────
// 카테고리별 말투 — 같은 구조라도 주방과 자동차용품은 다르게 말해야 한다
// ─────────────────────────────────────────────────────────────

type Tone = {
  problem: string;
  agitation: string;
  solutionHeading: string;
  benefits: string[];
};

const TONES: Record<string, Tone> = {
  digital_acc: {
    problem: "쓸 때마다 손이 하나 모자라지 않으셨나요",
    agitation: "매번 자리를 잡아주고 다시 정리하는 시간이 하루에도 몇 번씩 쌓입니다.",
    solutionHeading: "한 번 두면 그대로 있습니다",
    benefits: ["필요한 각도에서 고정", "책상·차량 어디서나", "설치에 도구가 필요 없음"],
  },
  kitchen: {
    problem: "주방은 늘 자리가 부족하지 않으신가요",
    agitation: "쌓아두면 꺼낼 때마다 무너지고, 결국 안 쓰는 물건이 안쪽에 갇힙니다.",
    solutionHeading: "쓰는 물건이 앞에 옵니다",
    benefits: ["세워서 보관해 자리를 아낌", "물 닿아도 관리 쉬움", "한 손으로 꺼내고 넣기"],
  },
  living: {
    problem: "치워도 금방 다시 어질러지지 않나요",
    agitation: "물건마다 자리가 없으면 정리는 매번 처음부터 다시 하는 일이 됩니다.",
    solutionHeading: "자리를 정해두면 유지됩니다",
    benefits: ["쓰던 공간에 그대로 맞음", "한눈에 보이는 수납", "쓰지 않을 땐 접거나 겹쳐서"],
  },
  office: {
    problem: "책상이 좁아 집중이 끊기지 않으신가요",
    agitation: "필요한 걸 찾느라 흐름이 끊기면 다시 몰입하는 데 시간이 더 듭니다.",
    solutionHeading: "손 닿는 곳에 정리됩니다",
    benefits: ["자주 쓰는 것만 앞으로", "책상 면적을 되찾음", "받침 높이로 자세까지"],
  },
  car: {
    problem: "차 안 물건이 굴러다니지 않나요",
    agitation: "주행 중 굴러다니는 물건은 시선을 뺏고, 급정거 때는 위험하기까지 합니다.",
    solutionHeading: "달리는 동안 그대로 있습니다",
    benefits: ["흔들려도 고정", "차량 내장재를 상하지 않게", "필요할 때 바로 뺄 수 있게"],
  },
  pet: {
    problem: "아이가 편하게 쓸 수 있을지 걱정되시죠",
    agitation: "맞지 않는 물건은 결국 안 쓰게 되고, 그 사이 아이는 계속 불편합니다.",
    solutionHeading: "아이 몸에 맞게",
    benefits: ["몸에 닿는 부분을 부드럽게", "조절해서 맞추기", "세척이 쉬운 소재"],
  },
  sports: {
    problem: "장비 때문에 운동을 미루신 적 있나요",
    agitation: "준비가 번거로우면 운동은 자연스럽게 뒤로 밀립니다.",
    solutionHeading: "펴면 바로 시작",
    benefits: ["미끄러지지 않는 표면", "말아서 보관", "실내외 모두"],
  },
  season: {
    problem: "이맘때면 늘 신경 쓰이는 게 있죠",
    agitation: "참고 넘기면 그 계절 내내 같은 불편이 반복됩니다.",
    solutionHeading: "이 계절을 편하게",
    benefits: ["필요한 만큼만 조절", "전기·관리 부담이 적음", "쓰지 않을 땐 작게 보관"],
  },
  fashion_acc: {
    problem: "매일 드는 물건일수록 고르기 어렵죠",
    agitation: "어디에나 어울리지 않으면 결국 특정 옷에만 들게 됩니다.",
    solutionHeading: "매일 들 수 있게",
    benefits: ["어디에나 어울리는 형태", "필요한 만큼 들어가는 수납", "가볍게"],
  },
};

const DEFAULT_TONE: Tone = {
  problem: "이런 점이 불편하지 않으셨나요",
  agitation: "작은 불편은 매일 반복되면서 시간과 신경을 계속 가져갑니다.",
  solutionHeading: "이렇게 해결됩니다",
  benefits: ["필요한 곳에 맞게", "쓰기 쉬운 구조", "관리가 간단함"],
};

function toneFor(category: string): Tone {
  return TONES[category] ?? DEFAULT_TONE;
}

// ─────────────────────────────────────────────────────────────
// 안전장치
// ─────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 고객에게 나갈 문구를 마지막으로 거른다.
 *
 * 셀러 용어가 섞인 줄은 **고치지 않고 버린다.** 부분적으로 지우면
 * "정리함 세트"가 "정리함"이 되면서 뜻이 바뀔 수 있는데, 그건 문구가
 * 하나 없는 것보다 나쁘다.
 */
function safeLines(lines: string[]): string[] {
  return lines
    .map((l) => l.trim())
    .filter((l) => l.length >= 4 && !hasSellerJargon(l));
}

// ─────────────────────────────────────────────────────────────
// 섹션
// ─────────────────────────────────────────────────────────────

export type Section = {
  kind: "hero" | "problem" | "solution" | "gallery" | "spec" | "guarantee";
  heading?: string;
  html: string;
};

export type DetailPage = {
  version: string;
  html: string;
  sellingPoints: string[];
  /** 근거가 없어 뺀 섹션과 그 이유 — 왜 짧은지 설명할 수 있어야 한다 */
  omitted: Array<{ kind: string; why: string }>;
};

export function buildDetailPage(candidate: Candidate): DetailPage {
  const tone = toneFor(candidate.category);
  const title = candidate.title;
  const images = candidate.supplier.imageUrls.filter(Boolean).slice(0, 6);
  const omitted: Array<{ kind: string; why: string }> = [];

  const sellingPoints = safeLines(tone.benefits);

  const sections: Section[] = [];

  // ── 히어로 ───────────────────────────────────────────────
  sections.push({
    kind: "hero",
    html: `
      <section class="jv-hero">
        ${
          images[0]
            ? `<div class="jv-hero-img"><img src="${escapeHtml(images[0])}" alt="${escapeHtml(title)}" /></div>`
            : ""
        }
        <div class="jv-hero-copy">
          <h1>${escapeHtml(title)}</h1>
          <p class="jv-lead">${escapeHtml(tone.solutionHeading)}</p>
        </div>
      </section>`,
  });

  // ── 문제 제기 ────────────────────────────────────────────
  sections.push({
    kind: "problem",
    heading: tone.problem,
    html: `
      <section class="jv-block jv-problem">
        <h2>${escapeHtml(tone.problem)}</h2>
        <p>${escapeHtml(tone.agitation)}</p>
      </section>`,
  });

  // ── 해결 ─────────────────────────────────────────────────
  if (sellingPoints.length) {
    const items = sellingPoints
      .map(
        (p, i) =>
          `<li><span class="jv-num">${String(i + 1).padStart(2, "0")}</span><span>${escapeHtml(p)}</span></li>`,
      )
      .join("");
    sections.push({
      kind: "solution",
      heading: tone.solutionHeading,
      html: `
      <section class="jv-block jv-solution">
        <h2>${escapeHtml(tone.solutionHeading)}</h2>
        <ul class="jv-points">${items}</ul>
      </section>`,
    });
  } else {
    omitted.push({ kind: "solution", why: "고객에게 낼 수 있는 문구가 남지 않음" });
  }

  // ── 갤러리 ───────────────────────────────────────────────
  //
  // 사진은 공급처 실물만 쓴다. 생성 이미지를 쓰면 받은 물건과 화면이
  // 달라져 반품 사유가 되고, 그 비용은 전부 우리 마진에서 나간다.
  const rest = images.slice(1);
  if (rest.length) {
    const shots = rest
      .map(
        (u) =>
          `<figure><img src="${escapeHtml(u)}" alt="${escapeHtml(title)}" loading="lazy" /></figure>`,
      )
      .join("");
    sections.push({
      kind: "gallery",
      html: `<section class="jv-block jv-gallery"><div class="jv-shots">${shots}</div></section>`,
    });
  } else {
    omitted.push({ kind: "gallery", why: "공급처 추가 사진이 없음 — 생성 이미지는 쓰지 않는다" });
  }

  // ── 상품 정보 ────────────────────────────────────────────
  //
  // 확인된 사실만 표에 넣는다. 소재·원산지처럼 공급처가 안 밝힌 항목은
  // 아예 행을 만들지 않는다 — 빈칸이 낫지 추측이 낫진 않다.
  const specs: Array<[string, string]> = [];
  const cleanSupplier = cleanSupplierTitle(candidate.supplier.title);
  if (cleanSupplier.length >= 4) specs.push(["상품", cleanSupplier]);
  specs.push(["판매 단위", "1개"]);
  if (specs.length) {
    const rows = specs
      .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
      .join("");
    sections.push({
      kind: "spec",
      heading: "상품 정보",
      html: `<section class="jv-block jv-spec"><h2>상품 정보</h2><table>${rows}</table></section>`,
    });
  }

  // ── 배송·교환·반품 ───────────────────────────────────────
  sections.push({
    kind: "guarantee",
    heading: "배송 · 교환 · 반품",
    html: `
      <section class="jv-block jv-guarantee">
        <h2>배송 · 교환 · 반품</h2>
        <ul>
          <li>결제 확인 후 순차 출고됩니다.</li>
          <li>단순 변심 반품이 가능합니다. 반품 배송비는 상품 상세의 기준을 따릅니다.</li>
          <li>상품 불량·오배송은 왕복 배송비를 판매자가 부담합니다.</li>
        </ul>
      </section>`,
  });

  // 후기 섹션은 **의도적으로 만들지 않는다** — 아직 판매 실적이 없다.
  omitted.push({
    kind: "review",
    why: "실제 구매 후기가 아직 없음 — 후기를 지어내지 않는다(표시광고법)",
  });

  const html = `<div class="jv-detail">${STYLE}${sections.map((s) => s.html).join("\n")}</div>`;

  return { version: DETAIL_PAGE_VERSION, html, sellingPoints, omitted };
}

// ─────────────────────────────────────────────────────────────
// 스타일 — 상세페이지 안에 인라인으로 넣는다
//
// 오픈마켓 상세는 외부 CSS를 못 불러오므로 <style>을 본문에 함께 넣는다.
// 클래스 이름은 전부 `jv-`로 시작해 마켓 페이지의 스타일과 안 부딪히게 한다.
// ─────────────────────────────────────────────────────────────

const STYLE = `<style>
.jv-detail{max-width:860px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard",sans-serif;color:#111;line-height:1.7;-webkit-font-smoothing:antialiased}
.jv-detail img{max-width:100%;height:auto;display:block}
.jv-hero{position:relative;margin-bottom:56px}
.jv-hero-img img{width:100%;border-radius:20px}
.jv-hero-copy{padding:28px 4px 0}
.jv-hero-copy h1{font-size:30px;line-height:1.35;font-weight:800;margin:0 0 12px;letter-spacing:-0.4px}
.jv-lead{font-size:17px;color:#4b5563;margin:0}
.jv-block{margin:0 0 56px;padding:0 4px}
.jv-block h2{font-size:23px;font-weight:700;margin:0 0 16px;letter-spacing:-0.3px}
.jv-problem{background:#f7f8fa;border-radius:18px;padding:32px 26px}
.jv-problem h2{font-size:21px;color:#111}
.jv-problem p{margin:0;color:#4b5563;font-size:16px}
.jv-points{list-style:none;padding:0;margin:0}
.jv-points li{display:flex;gap:16px;align-items:flex-start;padding:18px 0;border-bottom:1px solid #eef0f3;font-size:16px}
.jv-points li:last-child{border-bottom:0}
.jv-num{flex:0 0 auto;font-size:13px;font-weight:700;color:#3182f6;letter-spacing:0.5px;padding-top:3px}
.jv-shots{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.jv-shots figure{margin:0}
.jv-shots img{width:100%;border-radius:14px}
.jv-spec table{width:100%;border-collapse:collapse;font-size:15px}
.jv-spec th,.jv-spec td{text-align:left;padding:14px 12px;border-bottom:1px solid #eef0f3}
.jv-spec th{width:34%;color:#6b7280;font-weight:600}
.jv-guarantee{background:#f7f8fa;border-radius:18px;padding:28px 26px}
.jv-guarantee ul{margin:0;padding-left:18px;color:#4b5563;font-size:15px}
.jv-guarantee li{margin-bottom:8px}
.jv-guarantee li:last-child{margin-bottom:0}
@media(max-width:600px){
.jv-hero-copy h1{font-size:24px}
.jv-block{margin-bottom:44px}
.jv-block h2{font-size:20px}
.jv-shots{grid-template-columns:1fr}
}
</style>`;
