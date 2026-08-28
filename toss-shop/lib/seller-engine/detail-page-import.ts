/**
 * 외부 상세페이지 반입 — 후커블·드랩아트에서 만든 결과를 자비스가 받는다
 *
 * ★ 왜 이게 필요한가
 *
 * 자체 AI로 후커블급 상세페이지를 만드는 건 어렵다. 레이아웃·카피·이미지가
 * 한 덩어리로 맞아떨어져야 하는데, 그걸 프롬프트로 매번 재현하는 건 실제로
 * 시도해 보면 품질이 흔들린다. 그리고 그 품질 격차를 좁히는 데 드는 시간은
 * 지금 우리한테 가장 비싼 자원이다.
 *
 * 반면 후커블·드랩아트는 그 문제를 이미 푼 서비스다. 문제는 **API가 없다는
 * 것**이지 품질이 아니다 (detail-page-sources.ts 참조). 그러면 남는 답은
 * 하나다 — 사람이 그 툴에서 결과물을 만들고, 자비스가 그 뒤 전부를 맡는다.
 *
 * 사람이 하는 일: 외부 툴에 상품 사진·정보를 넣고 결과를 복사한다 (5분)
 * 자비스가 하는 일: 검수 → 금지문구 제거 → 토스 규격 정규화 → 등록 →
 *                   가격·광고·재고·CS 이후 전 과정
 *
 * ★ 왜 그냥 붙여넣지 않고 검수를 거치는가
 *
 * 외부 툴은 토스 정책을 모른다. "최저가", "100% 정품", "마감 임박" 같은 문구를
 * 자연스럽게 넣는데, 토스에서 이건 실증 없는 최상급·가짜 긴박감으로 제재
 * 대상이다. 위탁은 실물을 검증할 수 없어 과장이 곧 허위표시가 된다.
 * 그대로 등록하면 페널티가 쌓이고, 페널티는 배송 인센티브(수수료 0%)를
 * 날려서 **전 상품의 마진을 8%p 깎는다**. 한 페이지의 문구가 스토어 전체에
 * 번진다. 그래서 반입도 검수를 거친다.
 *
 * ★ 스크립트를 지우는 이유
 *
 * 외부 툴 산출물에 <script>가 섞여 들어오면 상세페이지에서 실행된다.
 * 토스 상세는 인라인 CSS만 허용하는 정적 HTML이 안전하고, 무엇보다 우리가
 * 내용을 통제하지 못하는 코드를 상품 페이지에 싣는 건 위험하다.
 */

import { sanitizeCopy } from "./buyer-psychology";

export const DETAIL_IMPORT_VERSION = "1.0";

export type ImportedDetailInput = {
  /** 외부 툴이 뱉은 HTML (후커블·드랩아트 등에서 복사) */
  html?: string;
  /**
   * 또는 이미지 URL 목록 — 상세페이지를 이미지 여러 장으로 뽑은 경우.
   * 국내 상세페이지는 이미지 슬라이스로 만드는 게 오히려 일반적이다.
   */
  imageUrls?: string[];
  /** 어느 툴에서 왔는가 — 기록용 */
  sourceLabel?: string;
  /** 상품명 — 이미지만 있을 때 alt 텍스트로 쓴다 */
  productName?: string;
};

export type ImportedDetailResult = {
  engineVersion: string;
  status: "ready" | "rejected";
  html?: string;
  /** 검수에서 제거된 문구와 이유 — 무엇이 왜 빠졌는지 사람이 봐야 한다 */
  removed: string[];
  /** 등록을 막는 문제 */
  blockers: string[];
  note: string;
};

/** 상세페이지에 있으면 안 되는 태그 — 통째로 걷어낸다 */
const DANGEROUS_TAGS = /<(script|iframe|object|embed|form|link|meta)\b[^>]*>[\s\S]*?<\/\1>|<(script|iframe|object|embed|form|link|meta)\b[^>]*\/?>/gi;

/** 인라인 이벤트 핸들러 (onclick 등) */
const INLINE_HANDLERS = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

/** javascript: 스킴 */
const JS_SCHEME = /(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML에서 사람이 읽는 텍스트만 뽑는다 — 금지문구 검사용 */
function visibleText(html: string): string {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 이미지 목록으로 상세페이지 HTML을 만든다.
 *
 * 국내 상세페이지는 세로로 긴 이미지를 이어 붙이는 형태가 표준이다.
 * 폭 100%로 세로 배열하는 것 외에 꾸미지 않는다 — 외부 툴이 이미 디자인을
 * 끝냈으므로 우리가 덧붙이면 오히려 어긋난다.
 */
function htmlFromImages(urls: string[], productName?: string): string {
  const alt = escapeHtml(productName ?? "상품 상세");
  const imgs = urls
    .map(
      (u, i) =>
        `<img src="${escapeHtml(u)}" alt="${alt} 상세 ${i + 1}" ` +
        `style="display:block;width:100%;max-width:100%;height:auto;border:0" loading="lazy">`,
    )
    .join("");
  return `<div style="max-width:860px;margin:0 auto;font-size:0;line-height:0">${imgs}</div>`;
}

/**
 * 외부 툴에서 만든 상세페이지를 받아 등록 가능한 형태로 만든다.
 *
 * 반환이 `rejected`면 등록하지 않는다. 자동으로 고쳐서 통과시키지 않는 이유는,
 * 우리가 만들지 않은 페이지를 조용히 고치면 사람이 최종 결과를 확인할 기회를
 * 잃기 때문이다 — 금지문구 제거처럼 명확한 것만 자동으로 처리하고, 판단이
 * 필요한 건 blockers로 올려 사람에게 돌린다.
 */
export function importExternalDetailPage(input: ImportedDetailInput): ImportedDetailResult {
  const blockers: string[] = [];
  const removed: string[] = [];

  const rawHtml = input.html?.trim();
  const urls = (input.imageUrls ?? []).map((u) => u.trim()).filter(Boolean);

  if (!rawHtml && urls.length === 0) {
    return {
      engineVersion: DETAIL_IMPORT_VERSION,
      status: "rejected",
      removed,
      blockers: ["HTML도 이미지도 없음"],
      note: "반입할 내용이 없습니다. 외부 툴에서 만든 HTML을 붙여넣거나 이미지 URL을 넣어주세요.",
    };
  }

  let html = rawHtml ?? htmlFromImages(urls, input.productName);

  // 1) 위험 태그·핸들러 제거
  const beforeTags = html;
  html = html.replace(DANGEROUS_TAGS, "").replace(INLINE_HANDLERS, "").replace(JS_SCHEME, "");
  if (html !== beforeTags) {
    removed.push("스크립트·iframe·인라인 이벤트 핸들러 — 상세페이지에서 실행될 수 없게 제거");
  }

  // 2) 금지 문구 검사 — 토스 정책 위반은 페널티로 이어지고,
  //    페널티는 배송 인센티브를 날려 전 상품 마진을 깎는다
  const text = visibleText(html);
  const copy = sanitizeCopy(text);
  if (copy.removed.length > 0) {
    // ⚠️ 문구는 자동으로 지우지 않는다.
    //
    // 텍스트만 뽑아 검사했기 때문에, 그 문구가 HTML 어느 노드에 있는지
    // 정확히 모른다. 여기서 문자열 치환으로 지우면 태그 속성이나 스타일
    // 값에 우연히 같은 문자열이 있을 때 페이지가 깨진다. 게다가 이 페이지는
    // 우리가 만들지 않았으므로, 조용히 고쳐 놓으면 사람이 최종 모습을 확인할
    // 기회를 잃는다. 그래서 막고 사람에게 돌린다.
    blockers.push(
      `토스 정책 위반 소지 문구 ${copy.removed.length}건 — 외부 툴에서 수정 후 다시 반입: ` +
        copy.removed.join(" / "),
    );
  }

  // 3) 최소 분량 — 너무 짧으면 상세페이지 구실을 못 한다
  if (!rawHtml && urls.length > 0) {
    // 이미지 반입은 장수로 본다
    if (urls.length < 2) {
      blockers.push(`상세 이미지 ${urls.length}장 — 최소 2장은 있어야 상세페이지가 된다`);
    }
  } else if (text.length < 120 && !/<img\b/i.test(html)) {
    blockers.push(`본문 ${text.length}자 · 이미지 없음 — 내용이 부족해 등록해도 전환이 나오지 않는다`);
  }

  if (blockers.length > 0) {
    return {
      engineVersion: DETAIL_IMPORT_VERSION,
      status: "rejected",
      removed,
      blockers,
      note: `반입 보류 — ${blockers.length}건을 해결해야 등록할 수 있습니다.`,
    };
  }

  return {
    engineVersion: DETAIL_IMPORT_VERSION,
    status: "ready",
    html,
    removed,
    blockers,
    note:
      `${input.sourceLabel ?? "외부 툴"} 상세페이지 반입 완료` +
      (removed.length ? ` (검수에서 ${removed.length}건 정리)` : "") +
      ". 등록·가격·광고는 자비스가 이어서 처리합니다.",
  };
}
