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
 * ★ 왜 텍스트만 나열하지 않는가 — 실측 지적
 *
 * "텍스트만 많고 사진도 없다"는 지적을 받았다. 한국 이커머스 상세페이지의
 * 표준 구조는 텍스트 목록이 아니라 **사진 한 장 + 그 사진이 보여주는 것을
 * 설명하는 짧은 문구**를 반복하는 것이다(예: 선풍기 상세페이지 — 리모컨
 * 사진 아래 "리모컨 조작", 접이식 다리 사진 아래 "간편 분리·수납"). 이
 * 파일은 셀링포인트와 실제 상품 사진을 짝지어 그 구조로 배열한다.
 *
 * ★ 사진은 전부 진짜다 — 지어낸 각도가 없다
 *
 * 여기 들어오는 이미지는 공급사가 상세 조회(getItemView)에 실제로 올려둔
 * 사진들이다(domeggook-detail.ts가 상세 응답 전체를 스캔해 모은다).
 * 어떤 이미지 편집·생성도 하지 않는다 — 안 보이는 부분을 추측해 새로
 * 그리면 실물과 다른 상품처럼 보일 위험이 있고, 그건 반품·분쟁으로
 * 돌아온다. 사진이 적으면 적은 대로 쓰고, 부족한 설명은 사실 텍스트로
 * 보완한다 — 사진을 지어내는 것보다 정직한 쪽이 항상 낫다.
 *
 * ★ 지어내지 않는다
 *
 * 확인되지 않은 효능·성분·수치는 쓰지 않는다. 과장 문구는 표시광고법
 * 문제이면서, 반품률을 올려 결국 마진을 깎는다.
 */

export const DETAIL_PAGE_HTML_VERSION = "2.0";

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 인라인 스타일 조각 — 반복되는 것만 상수로 뺀다 */
const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif";

function img(url: string, alt: string, extraStyle = ""): string {
  return (
    `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" ` +
    `style="display:block;width:100%;max-width:100%;height:auto;${extraStyle}" />`
  );
}

export type DetailPageInput = {
  productName: string;
  /** 사실로 확인된 셀링포인트만 — 구매 결정 순서대로 정렬돼 있다고 가정한다 */
  sellingPoints: string[];
  /** 공급사가 실제로 올린 상품 사진 — 지어낸 이미지가 아니다 */
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
 *
 * ★ 레이아웃 순서 — 한국 이커머스 표준 상세페이지 구조를 따른다
 *
 *   1. 히어로 — 가장 좋은 사진 한 장을 크게, 제목과 함께
 *   2. 특징 블록 — 사진 한 장 + 그걸 설명하는 문구, 반복
 *      (사진이 문구보다 적으면 문구만, 문구가 사진보다 적으면 사진만
 *       나머지 갤러리로 — 짝을 억지로 안 맞춘다)
 *   3. 상품 정보 — 사양을 표로 (구매 직전 마지막으로 보는 곳)
 *   4. 배송·교환·반품 — 사기 직전의 마지막 걱정
 *   5. 구매 저항 해소 — 자랑 밑에 조용히
 */
export function buildDetailPageHtml(input: DetailPageInput): string {
  const sections: string[] = [];
  const images = input.imageUrls.filter(Boolean);
  const points = input.sellingPoints.filter((p) => p && p.trim());

  // ── 1. 히어로 — 제목 + 대표 사진 ──
  sections.push(
    `<div style="text-align:center;padding:4px 0 28px">` +
      `<h1 style="margin:0 0 20px;font-size:22px;line-height:1.4;font-weight:700;color:#0f172a">` +
      `${esc(input.productName)}</h1>` +
      (images[0] ? img(images[0], input.productName, "border-radius:8px") : "") +
      `</div>`,
  );

  // ── 2. 특징 블록 — 사진 하나에 문구 하나, 번갈아 ──
  //
  // 히어로에 쓴 첫 사진은 다시 안 쓴다. 남은 사진과 남은 셀링포인트를
  // 순서대로 짝짓는다 — 짝이 안 맞으면(사진 4장, 문구 2개처럼) 남는 쪽만
  // 이어서 보여준다. 억지로 같은 개수를 만들지 않는다.
  const restImages = images.slice(1);
  const pairCount = Math.max(restImages.length, points.length);
  for (let i = 0; i < pairCount; i++) {
    const point = points[i];
    const photo = restImages[i];
    if (!point && !photo) continue;

    sections.push(`<div style="margin:0 0 32px">`);
    if (point) {
      sections.push(
        `<p style="margin:0 0 14px;font-size:17px;line-height:1.6;font-weight:600;` +
          `color:#0f172a;text-align:center">${esc(point)}</p>`,
      );
    }
    if (photo) sections.push(img(photo, `${input.productName} 상세 ${i + 1}`, "border-radius:8px"));
    sections.push(`</div>`);
  }

  // 짝짓고 남은 사진이 있으면(사진이 훨씬 많은 경우) 갤러리로 이어 붙인다.
  // 실제 사진이 많다는 건 성의 있는 페이지라는 뜻이므로 버리지 않는다.
  if (restImages.length > pairCount) {
    for (const url of restImages.slice(pairCount)) {
      sections.push(img(url, input.productName, "border-radius:8px;margin:0 0 12px"));
    }
  }

  // ── 3. 사양 — 확인된 것만 표로 ──
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
      `<div style="margin:0 0 28px">` +
        `<h3 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#0f172a">상품 정보</h3>` +
        `<table style="width:100%;border-collapse:collapse">${rows}</table>` +
        `</div>`,
    );
  }

  // ── 4. 배송·반품 — 사기 직전의 마지막 걱정 ──
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
    `<div style="margin:0 0 8px;padding:18px;background:#f8fafc;border-radius:12px">` +
      `<h3 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#0f172a">배송·교환·반품</h3>` +
      notes
        .map(
          (n) =>
            `<p style="margin:0 0 6px;font-size:14px;line-height:1.7;color:#475569">${esc(n)}</p>`,
        )
        .join("") +
      `</div>`,
  );

  // ── 5. 구매 저항 해소 — 자랑 밑에 조용히 ──
  if (input.objectionsHtml?.trim()) sections.push(input.objectionsHtml);

  return `<div style="max-width:860px;margin:0 auto;padding:8px 0;font-family:${FONT_STACK}">${sections.join(
    "",
  )}</div>`;
}
