/**
 * 등록 전 검증기 — 토스가 반려할 것을 **보내기 전에** 잡는다
 *
 * ★ 왜 필요한가
 *
 * 상품이 반려됐다. 원인을 추측하지 않으려고 토스 공개 OpenAPI 스펙
 * (shopping-docs.toss.im/dev/api-2/product.md)의 필드 제약을 그대로 옮겨
 * 대조해 봤더니, 우리가 만들던 값이 두 군데서 스펙을 어기고 있었다:
 *
 *  1. **상품명 정규식** — 도매꾹 제목에는 `%`, `!` 같은 글자가 흔한데
 *     토스 상품명은 허용 글자가 정해져 있다. 하나만 섞여도 거절된다.
 *  2. **검색 키워드 정규식** — `[0-9a-zA-Z가-힣]{1,10}`, 즉 **공백이 안 되고
 *     10자를 넘을 수 없다.** 그런데 우리 대표 키워드는 "주방 집게"처럼
 *     롱테일 구절이라 거의 항상 공백이 들어간다. 사실상 전 상품이 걸린다.
 *
 * ★ 고치는 방식 — 고칠 수 있는 건 고치고, 못 고칠 건 막는다
 *
 * 허용되지 않는 글자를 빼는 건 **뜻을 바꾸지 않는 정리**다(「특가!」→「특가」).
 * 반면 값이 아예 없거나(이미지 0장), 사실을 지어내야 하는 것(모르는 치수)은
 * 정리로 해결되지 않으므로 등록을 막고 사유를 남긴다.
 *
 * 반려는 단순한 재시도로 끝나지 않는다 — 반복되면 셀러 신뢰도에 영향을 주고,
 * 그 사이 그 상품은 팔리지 않는다. 그래서 "보내보고 결과를 보자"가 아니라
 * "보내기 전에 확실히 한다".
 */

export const LISTING_VALIDATOR_VERSION = "1.0";

/** 토스 상품명 허용 글자 — 스펙의 정규식을 그대로 옮겼다 */
const NAME_ALLOWED = /[0-9a-zA-Z가-힣 ()\-·\[\]/&+,~.*_#]/;
/** 토스 검색 키워드 — 공백 불가, 1~10자 */
const KEYWORD_ALLOWED = /[0-9a-zA-Z가-힣]/;
/** 브랜드명 허용 글자 */
const BRAND_ALLOWED = /[0-9a-zA-Z가-힣 *()\-_+/.,]/;
/** 브랜드명에 쓸 수 없는 단어 — 스펙에 명시돼 있다 */
const BRAND_BANNED = ["없음", "중국", "기타", "OEM", "협력사"];

export const MAX_NAME_LEN = 100;
export const MAX_KEYWORD_LEN = 10;
export const MAX_BRAND_LEN = 50;
export const MAX_DESCRIPTION_LEN = 1500;
export const MAX_POLICY_DESC_LEN = 500;
export const MAX_NOTICE_CONTENT_LEN = 4000;
/** 옵션 그룹은 1~3개만 허용된다 */
export const MAX_OPTION_GROUPS = 3;

function keepAllowed(text: string, allowed: RegExp): string {
  return [...text].filter((c) => allowed.test(c)).join("");
}

function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * 상품명을 토스가 받는 형태로 정리한다.
 *
 * 허용되지 않는 글자를 **빼기만** 한다 — 없는 말을 넣지 않는다.
 * 「특가!」가 「특가」가 되는 건 뜻이 그대로다. 반면 글자를 다 빼서
 * 아무것도 안 남으면 그건 상품명이 아니므로 null을 돌려 등록을 막는다.
 */
export function sanitizeProductName(raw: string): string | null {
  const cleaned = collapseSpaces(keepAllowed(raw ?? "", NAME_ALLOWED)).slice(0, MAX_NAME_LEN);
  // 특수문자만 남고 이름이랄 게 없으면 상품명으로 못 쓴다
  if (!/[0-9a-zA-Z가-힣]/.test(cleaned)) return null;
  return cleaned;
}

/**
 * 검색 키워드를 토스 규격으로 쪼갠다.
 *
 * ★ 공백이 안 된다는 게 핵심이다
 *
 * "주방 집게"는 그대로는 거절된다. 그렇다고 버리면 롱테일 검색 노출을
 * 통째로 잃는다. 그래서 **구절을 낱말로 쪼개서 둘 다 넣고**, 붙여 쓴 형태
 * ("주방집게")도 함께 넣는다 — 실제 사용자가 붙여서 검색하는 경우가 많다.
 * 어느 쪽도 지어낸 말이 아니라 원래 키워드에서 나온 것이다.
 *
 * 10자를 넘는 낱말은 자르지 않고 버린다. 잘라낸 조각은 뜻이 달라져
 * 엉뚱한 검색어에 걸리기 때문이다.
 */
export function sanitizeSearchKeywords(raw: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (word: string) => {
    const w = keepAllowed(word, KEYWORD_ALLOWED);
    if (!w || w.length > MAX_KEYWORD_LEN) return;
    if (seen.has(w)) return;
    seen.add(w);
    out.push(w);
  };

  for (const phrase of raw ?? []) {
    if (typeof phrase !== "string") continue;
    const parts = phrase.trim().split(/\s+/).filter(Boolean);
    // 낱말 하나하나
    for (const p of parts) add(p);
    // 붙여 쓴 형태도 — "주방 집게" → "주방집게"
    if (parts.length > 1) add(parts.join(""));
  }

  return out;
}

/** 브랜드명 규격 검사 — 금지어가 들어가면 반려된다 */
export function sanitizeBrandName(raw: string): string | null {
  const cleaned = collapseSpaces(keepAllowed(raw ?? "", BRAND_ALLOWED)).slice(0, MAX_BRAND_LEN);
  if (!cleaned) return null;
  for (const banned of BRAND_BANNED) {
    if (cleaned.includes(banned)) return null;
  }
  return cleaned;
}

export type ListingViolation = { field: string; reason: string };

/**
 * 등록 직전 마지막 점검 — 스펙을 어기는 값이 하나라도 있으면 잡아낸다.
 *
 * 정리(sanitize)로 이미 고친 뒤에 부르는 것이 전제다. 여기서 걸리는 건
 * 정리로는 해결이 안 되는 것들이므로, 등록을 막고 사유를 남긴다.
 */
export function validateListingBody(body: {
  name?: string;
  brandName?: string;
  categoryId?: number;
  stocks?: Array<{
    options?: Array<{ groupName: string; valueName: string }>;
    remainingCount?: number;
    isMainPrice?: boolean;
    originPrice?: number;
    salePrice?: number;
  }>;
  images?: Array<{ type: string; url?: string; html?: string; order: string }>;
  exposure?: { searchKeywords?: string[]; description?: string };
  deliveryPolicy?: { deliveryFeeType?: string; preparationDays?: number };
  exchangeReturnPolicy?: {
    exchangeRefundLocationId?: number;
    refundOneWayDeliveryFee?: number;
    exchangeRoundTripDeliveryFee?: number;
    applicationMethodDescription?: string;
    applicationTermDescription?: string;
  };
  notice?: { categoryCode?: string; items?: Array<{ id: number; content: string }> };
}): ListingViolation[] {
  const v: ListingViolation[] = [];

  // ── 상품명 ──
  const name = body.name ?? "";
  if (!name) v.push({ field: "name", reason: "상품명이 비어 있습니다" });
  else if (name.length > MAX_NAME_LEN) {
    v.push({ field: "name", reason: `상품명이 ${MAX_NAME_LEN}자를 넘습니다 (${name.length}자)` });
  } else {
    const bad = [...name].filter((c) => !NAME_ALLOWED.test(c));
    if (bad.length) {
      v.push({
        field: "name",
        reason: `상품명에 쓸 수 없는 글자: ${[...new Set(bad)].join("")}`,
      });
    }
  }

  // ── 브랜드명 ──
  if (body.brandName) {
    if (body.brandName.length > MAX_BRAND_LEN) {
      v.push({ field: "brandName", reason: `브랜드명이 ${MAX_BRAND_LEN}자를 넘습니다` });
    }
    for (const banned of BRAND_BANNED) {
      if (body.brandName.includes(banned)) {
        v.push({ field: "brandName", reason: `브랜드명에 쓸 수 없는 단어: ${banned}` });
      }
    }
  }

  // ── 카테고리 ──
  if (!body.categoryId || body.categoryId <= 0) {
    v.push({ field: "categoryId", reason: "카테고리 ID가 없습니다 (리프 카테고리만 가능)" });
  }

  // ── 재고·가격 ──
  const stocks = body.stocks ?? [];
  if (stocks.length === 0) v.push({ field: "stocks", reason: "판매 옵션이 하나도 없습니다" });
  const mainCount = stocks.filter((s) => s.isMainPrice).length;
  if (stocks.length > 0 && mainCount !== 1) {
    v.push({ field: "stocks.isMainPrice", reason: `대표 가격은 정확히 1개여야 합니다 (현재 ${mainCount}개)` });
  }
  stocks.forEach((s, i) => {
    if ((s.originPrice ?? 0) < 1) {
      v.push({ field: `stocks[${i}].originPrice`, reason: "정상가는 1원 이상이어야 합니다" });
    }
    if ((s.salePrice ?? 0) < 1) {
      v.push({ field: `stocks[${i}].salePrice`, reason: "판매가는 1원 이상이어야 합니다" });
    }
    // 스펙: 판매가는 정상가 이하여야 한다. 넘으면 거절된다.
    if ((s.salePrice ?? 0) > (s.originPrice ?? 0)) {
      v.push({
        field: `stocks[${i}].salePrice`,
        reason: `판매가(${s.salePrice})가 정상가(${s.originPrice})보다 높습니다`,
      });
    }
    if ((s.remainingCount ?? -1) < 0) {
      v.push({ field: `stocks[${i}].remainingCount`, reason: "재고는 0 이상이어야 합니다" });
    }
    if ((s.options?.length ?? 0) > MAX_OPTION_GROUPS) {
      v.push({
        field: `stocks[${i}].options`,
        reason: `옵션 그룹은 최대 ${MAX_OPTION_GROUPS}개입니다 (현재 ${s.options?.length}개)`,
      });
    }
  });

  // ── 이미지 ──
  // 스펙: THUMBNAIL 1개, DESCRIPTION 또는 DESCRIPTION_HTML 1개가 **필수**다.
  const images = body.images ?? [];
  const thumbs = images.filter((i) => i.type === "THUMBNAIL");
  const descs = images.filter((i) => i.type === "DESCRIPTION" || i.type === "DESCRIPTION_HTML");
  if (thumbs.length < 1) v.push({ field: "images", reason: "썸네일 이미지가 없습니다" });
  if (descs.length < 1) v.push({ field: "images", reason: "상세 이미지가 없습니다" });
  images.forEach((img, i) => {
    // DESCRIPTION_HTML은 html로 준다 — url이 없어도 되지만 둘 다 없으면 빈 항목이다.
    if (img.type === "DESCRIPTION_HTML" && !img.html && !img.url) {
      v.push({ field: `images[${i}]`, reason: "상세 HTML 항목에 내용이 없습니다" });
    }
    if (img.type !== "DESCRIPTION_HTML" && !img.url) {
      v.push({ field: `images[${i}]`, reason: `${img.type} 이미지에 주소가 없습니다` });
    }
    if (img.url && img.url.length > 255) {
      v.push({ field: `images[${i}].url`, reason: "이미지 주소가 255자를 넘습니다" });
    }
  });

  // ── 검색 키워드 ──
  for (const kw of body.exposure?.searchKeywords ?? []) {
    if (kw.length > MAX_KEYWORD_LEN) {
      v.push({ field: "exposure.searchKeywords", reason: `키워드 "${kw}"가 ${MAX_KEYWORD_LEN}자를 넘습니다` });
      continue;
    }
    const bad = [...kw].filter((c) => !KEYWORD_ALLOWED.test(c));
    if (bad.length) {
      v.push({
        field: "exposure.searchKeywords",
        reason: `키워드 "${kw}"에 쓸 수 없는 글자(공백 포함): ${[...new Set(bad)].join("")}`,
      });
    }
  }
  if ((body.exposure?.description?.length ?? 0) > MAX_DESCRIPTION_LEN) {
    v.push({ field: "exposure.description", reason: `상품 설명이 ${MAX_DESCRIPTION_LEN}자를 넘습니다` });
  }

  // ── 배송 ──
  const prep = body.deliveryPolicy?.preparationDays;
  if (prep != null && (prep < 1 || prep > 14)) {
    v.push({ field: "deliveryPolicy.preparationDays", reason: "상품 준비 기간은 1~14일이어야 합니다" });
  }

  // ── 교환·반품 ──
  const er = body.exchangeReturnPolicy;
  if (!er?.exchangeRefundLocationId) {
    v.push({ field: "exchangeReturnPolicy", reason: "교환·반품지 ID가 없습니다" });
  }
  if ((er?.refundOneWayDeliveryFee ?? -1) < 0) {
    v.push({ field: "exchangeReturnPolicy.refundOneWayDeliveryFee", reason: "반품 편도 배송비는 0 이상이어야 합니다" });
  }
  if ((er?.exchangeRoundTripDeliveryFee ?? -1) < 0) {
    v.push({ field: "exchangeReturnPolicy.exchangeRoundTripDeliveryFee", reason: "교환 왕복 배송비는 0 이상이어야 합니다" });
  }
  for (const [f, val] of [
    ["applicationMethodDescription", er?.applicationMethodDescription],
    ["applicationTermDescription", er?.applicationTermDescription],
  ] as const) {
    if (!val || val.length < 1) {
      v.push({ field: `exchangeReturnPolicy.${f}`, reason: "필수 설명이 비어 있습니다" });
    } else if (val.length > MAX_POLICY_DESC_LEN) {
      v.push({ field: `exchangeReturnPolicy.${f}`, reason: `${MAX_POLICY_DESC_LEN}자를 넘습니다` });
    }
  }

  // ── 정보제공 고시 ──
  if (!body.notice?.categoryCode) {
    v.push({ field: "notice.categoryCode", reason: "정보제공 고시 카테고리가 없습니다" });
  }
  const noticeItems = body.notice?.items ?? [];
  if (noticeItems.length === 0) {
    v.push({ field: "notice.items", reason: "정보제공 고시 항목이 없습니다" });
  }
  noticeItems.forEach((it, i) => {
    if (!it.content || it.content.length < 1) {
      v.push({ field: `notice.items[${i}]`, reason: "고시 항목 내용이 비어 있습니다" });
    } else if (it.content.length > MAX_NOTICE_CONTENT_LEN) {
      v.push({ field: `notice.items[${i}]`, reason: `고시 항목이 ${MAX_NOTICE_CONTENT_LEN}자를 넘습니다` });
    }
  });

  return v;
}
