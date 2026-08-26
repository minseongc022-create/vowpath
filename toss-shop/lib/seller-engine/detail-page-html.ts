/**
 * 상세페이지 HTML — AI 없이도 제대로 된 페이지를 만든다
 *
 * ★ 왜 필요한가 — 실측으로 본 상태
 *
 * 미리보기가 망가져 있었다. 상세에 작은 썸네일 한 장만 덩그러니 있고
 * 설명이 없었다. 원인은 두 가지가 겹친 것이다:
 *
 *  1. AI 상세페이지 생성이 실패하면(크레딧 소진) 본문이
 *     `<p>상세페이지 생성 실패 — ...</p>` 한 줄만 남았다.
 *  2. 그 본문을 토스에 보낼 방법이 없어 이미지 한 장으로 때웠다.
 *
 * 두 번째는 스펙을 다시 읽고 풀렸다. 토스 이미지 항목은 `url` 말고
 * **`html` 필드**를 받는다(DESCRIPTION_HTML). 즉 우리가 만든 HTML을
 * 그대로 실어 보낼 수 있다 — 어딘가에 호스팅할 필요가 없다.
 *
 * ★ 왜 AI 없이도 되는가
 *
 * 상세페이지에 필요한 건 창작이 아니라 **사실의 배치**다. 무엇인지,
 * 얼마나 오는지, 언제 오는지, 안 맞으면 어떻게 되는지 — 전부 우리가
 * 이미 아는 값이다. 구매 결정 순서대로 놓기만 하면 된다.
 * AI는 문장을 더 매끄럽게 다듬는 역할이지, 없다고 페이지가 비어야 할
 * 이유가 아니다.
 *
 * ★ 지어내지 않는다
 *
 * 확인되지 않은 효능·성분·수치는 쓰지 않는다. 과장 문구는 표시광고법
 * 문제이면서, 반품률을 올려 결국 마진을 깎는다.
 */

export const DETAIL_PAGE_HTML_VERSION = "1.0";

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type DetailPageInput = {
  productName: string;
  /** 사실로 확인된 셀링포인트만 */
  sellingPoints: string[];
  /** 상세 이미지 주소 */
  imageUrls: string[];
  /** 배송 안내 — 며칠 안에 나가는지 */
  dispatchDays?: number;
  /** 반품 안내 한 줄 */
  returnNote?: string;
  /** 구매 저항 해소 섹션 HTML (buyer-psychology가 만든 것) */
  objectionsHtml?: string;
  /** 옵션/구성 — "1개", "500g" 같은 확인된 사양 */
  specs?: Array<{ label: string; value: string }>;
};

/**
 * 상세페이지 본문을 만든다.
 *
 * 인라인 스타일만 쓴다 — 토스가 sanitization을 하므로 외부 CSS나
 * 스크립트는 살아남지 못한다. 모바일에서 보는 사람이 대부분이라
 * 폭을 고정하지 않고 세로로 흐르게 둔다.
 */
export function buildDetailPageHtml(input: DetailPageInput): string {
  const sections: string[] = [];

  // ── 1. 제목 — 이게 뭔지 먼저 ──
  sections.push(
    `<h2 style="margin:0 0 20px;font-size:20px;line-height:1.4;font-weight:700;color:#0f172a">` +
      `${esc(input.productName)}</h2>`,
  );

  // ── 2. 핵심 포인트 — 사실만, 구매 결정 순서대로 ──
  const points = input.sellingPoints.filter((p) => p && p.trim()).slice(0, 6);
  if (points.length) {
    const items = points
      .map(
        (p) =>
          `<li style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#334155">${esc(p)}</li>`,
      )
      .join("");
    sections.push(
      `<ul style="margin:0 0 28px;padding:0 0 0 20px">${items}</ul>`,
    );
  }

  // ── 3. 이미지 — 설명 다음에 놓는다 ──
  //
  // 사진부터 쭉 늘어놓으면 스크롤만 하다 끝난다. 무엇인지 알고 나서
  // 보는 사진이 실제로 읽힌다.
  for (const url of input.imageUrls.filter(Boolean).slice(0, 10)) {
    sections.push(
      `<img src="${esc(url)}" alt="${esc(input.productName)}" ` +
        `style="display:block;width:100%;max-width:100%;height:auto;margin:0 0 12px" />`,
    );
  }

  // ── 4. 사양 — 확인된 것만 표로 ──
  const specs = (input.specs ?? []).filter((s) => s.label && s.value);
  if (specs.length) {
    const rows = specs
      .map(
        (s) =>
          `<tr>` +
          `<th style="padding:12px 0;text-align:left;font-size:14px;font-weight:600;color:#64748b;width:35%;border-bottom:1px solid #f1f5f9">${esc(s.label)}</th>` +
          `<td style="padding:12px 0;font-size:14px;color:#0f172a;border-bottom:1px solid #f1f5f9">${esc(s.value)}</td>` +
          `</tr>`,
      )
      .join("");
    sections.push(
      `<div style="margin:28px 0 0">` +
        `<h3 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#0f172a">상품 정보</h3>` +
        `<table style="width:100%;border-collapse:collapse">${rows}</table>` +
        `</div>`,
    );
  }

  // ── 5. 배송·반품 — 사기 직전의 마지막 걱정 ──
  const notes: string[] = [];
  if (input.dispatchDays != null) {
    notes.push(
      input.dispatchDays <= 1
        ? "평일 주문은 당일 또는 다음 영업일에 출고됩니다."
        : `주문 확인 후 ${input.dispatchDays}영업일 이내 출고됩니다.`,
    );
  }
  if (input.returnNote?.trim()) notes.push(input.returnNote.trim());
  notes.push("상품 수령 후 7일 이내 교환·반품 신청이 가능합니다.");

  sections.push(
    `<div style="margin:28px 0 0;padding:18px;background:#f8fafc;border-radius:12px">` +
      `<h3 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#0f172a">배송·교환·반품</h3>` +
      notes
        .map(
          (n) =>
            `<p style="margin:0 0 6px;font-size:14px;line-height:1.7;color:#475569">${esc(n)}</p>`,
        )
        .join("") +
      `</div>`,
  );

  // ── 6. 구매 저항 해소 — 자랑 밑에 조용히 ──
  if (input.objectionsHtml?.trim()) sections.push(input.objectionsHtml);

  return `<div style="max-width:860px;margin:0 auto;padding:8px 0;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif">${sections.join(
    "",
  )}</div>`;
}
