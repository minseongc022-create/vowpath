/**
 * 토스 상품 등록의 **필수 부속 정보** — 구매옵션 템플릿과 정보제공 고시
 *
 * ★ 왜 이게 따로 필요한가
 *
 * 등록 payload를 다 채웠다고 생각했는데 토스가 이렇게 돌려줬다:
 *
 *   {"stocks":"필수 값이 누락되었습니다."}
 *
 * 공식 문서와 대조해보니 빠진 게 하나가 아니라 여섯이었다. 그중 둘은
 * **카테고리마다 값이 다른** 것이라 상수로 박을 수가 없다:
 *
 *  · `stocks[].options` — 구매옵션. 카테고리가 "색상은 필수"처럼 정해둔다.
 *  · `notice` — 정보제공 고시. 카테고리군마다 항목 ID와 제목이 다르다
 *    (전자상거래법상 의무 표시사항이라 빠뜨리면 등록이 거절된다).
 *
 * 그래서 등록 직전에 그 카테고리의 템플릿을 실제로 조회해서 채운다.
 *
 * ★ 값을 지어내지 않는다
 *
 * 고시 내용은 우리가 모르는 사실이 대부분이다(제조국, 제조연월, 소재…).
 * 모르는 걸 그럴듯하게 지어내면 표시광고법 위반이고, 그건 페널티가 아니라
 * 법적 문제다. 그래서 **모른다는 사실을 그대로 적는다** — 「상품 상세 참조」는
 * 실제 상세에 그 내용이 있을 때만 쓸 수 있으므로, 공급처가 준 정보로
 * 확인되지 않는 항목은 확인 불가임을 명시한다.
 */

import { tossApiGet } from "./client";
import type { TossApiConfig } from "./config";

export const PRODUCT_REQUIREMENTS_VERSION = "1.0";

export type CategorySalesOption = {
  key: string;
  /** false = 상품 등록 시 **필수** 옵션 (문서 표기가 뒤집혀 있으니 주의) */
  isOption: boolean;
  valueCandidates: string[];
  unitValues: string[] | null;
};

export type NoticeItem = { id: number; title: string };

/** 트리·템플릿은 자주 안 바뀐다 — 프로세스 생애주기 동안 캐시한다 */
const templateCache = new Map<string, CategorySalesOption[]>();
const noticeCodeCache = new Map<string, Array<{ categoryCode: string; firstCategoryName: string }>>();
const noticeItemCache = new Map<string, NoticeItem[]>();

export function clearProductRequirementsCache(): void {
  templateCache.clear();
  noticeCodeCache.clear();
  noticeItemCache.clear();
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * 카테고리의 구매옵션 템플릿을 읽는다.
 * GET /api/v3/shopping-fep/category/{categoryId}/constraint-templates
 */
export async function fetchCategorySalesOptions(
  merchantId: string,
  config: TossApiConfig,
  categoryId: number,
): Promise<CategorySalesOption[]> {
  const key = `${merchantId}:${categoryId}`;
  const cached = templateCache.get(key);
  if (cached) return cached;

  const res = await tossApiGet<Record<string, unknown>>(
    merchantId,
    config,
    `/api/v3/shopping-fep/category/${categoryId}/constraint-templates`,
  );
  const body = (res.success ?? {}) as Record<string, unknown>;
  const options = asArray(body.categorySalesOptions).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const o = raw as Record<string, unknown>;
    const k = str(o.key);
    if (!k) return [];
    return [
      {
        key: k,
        isOption: o.isOption === true,
        valueCandidates: asArray(o.valueCandidates).map(str).filter(Boolean),
        unitValues: Array.isArray(o.unitValues) ? o.unitValues.map(str).filter(Boolean) : null,
      },
    ];
  });
  templateCache.set(key, options);
  return options;
}

/**
 * 구매옵션 값을 정한다 — 위탁 단품이라 옵션이 하나뿐인 상품이 대부분이다.
 *
 * 고를 수 있는 값이 정해져 있으면(valueCandidates) 반드시 그중에서 고른다.
 * 자유 입력이면 상품명을 그대로 쓰지 않고 "단일" 같은 무난한 값을 쓴다 —
 * 옵션은 구매자가 고르는 선택지이지 상품 설명이 아니기 때문이다.
 *
 * 단위가 강제된 옵션(unitValues)은 숫자를 지어내야 해서 채울 수 없다.
 * 그런 필수 옵션이 있으면 null을 돌려 등록을 막는다 — 치수를 지어내
 * 올리면 반품·분쟁으로 돌아온다.
 */
export function buildStockOptions(
  template: CategorySalesOption[],
): { options: Array<{ groupName: string; valueName: string }> } | { blocked: string } {
  // isOption === false 가 "필수"다 (토스 문서 표기)
  const required = template.filter((t) => t.isOption === false);
  const options: Array<{ groupName: string; valueName: string }> = [];

  for (const t of required) {
    if (t.unitValues && t.unitValues.length > 0) {
      return {
        blocked: `필수 옵션 「${t.key}」는 숫자+단위(${t.unitValues.join("/")})를 요구하는데 공급처 정보로 확인할 수 없습니다.`,
      };
    }
    if (t.valueCandidates.length > 0) {
      options.push({ groupName: t.key, valueName: t.valueCandidates[0] });
      continue;
    }
    options.push({ groupName: t.key, valueName: "단일" });
  }

  return { options };
}

/** 정보제공 고시 카테고리 코드 목록 */
export async function fetchNoticeCategoryCodes(
  merchantId: string,
  config: TossApiConfig,
): Promise<Array<{ categoryCode: string; firstCategoryName: string }>> {
  const cached = noticeCodeCache.get(merchantId);
  if (cached) return cached;

  const res = await tossApiGet<Record<string, unknown>>(
    merchantId,
    config,
    "/api/v3/shopping-fep/notices/category-codes",
  );
  const items = asArray((res.success as Record<string, unknown>)?.items).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const o = raw as Record<string, unknown>;
    const code = str(o.categoryCode);
    if (!code) return [];
    return [{ categoryCode: code, firstCategoryName: str(o.firstCategoryName) }];
  });
  noticeCodeCache.set(merchantId, items);
  return items;
}

/** 한 고시 카테고리의 항목 목록 */
export async function fetchNoticeItems(
  merchantId: string,
  config: TossApiConfig,
  categoryCode: string,
): Promise<NoticeItem[]> {
  const key = `${merchantId}:${categoryCode}`;
  const cached = noticeItemCache.get(key);
  if (cached) return cached;

  const res = await tossApiGet<Record<string, unknown>>(
    merchantId,
    config,
    "/api/v3/shopping-fep/notices",
    { categoryCode },
  );
  const items = asArray((res.success as Record<string, unknown>)?.items).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const o = raw as Record<string, unknown>;
    const id = typeof o.id === "number" ? o.id : Number(o.id);
    if (!Number.isFinite(id)) return [];
    return [{ id, title: str(o.title) }];
  });
  noticeItemCache.set(key, items);
  return items;
}

/** 내부 6분류 → 고시 카테고리의 firstCategoryName 단서 */
const NOTICE_NAME_HINTS: Record<string, string[]> = {
  food: ["식품", "농수산", "가공"],
  beauty: ["화장품", "미용"],
  home: ["생활", "주방", "가구", "잡화"],
  digital: ["전자", "가전", "디지털", "통신"],
  fashion: ["의류", "패션", "잡화", "신발", "가방"],
  health: ["건강", "의료", "식품"],
};

/**
 * 상품에 맞는 고시 카테고리 코드를 고른다.
 *
 * 못 고르면 null — 아무 코드나 넣으면 그 카테고리의 의무 표시항목을
 * 엉뚱하게 채우게 되고, 그건 법정 표시사항 오기재다.
 */
export function pickNoticeCategoryCode(
  codes: Array<{ categoryCode: string; firstCategoryName: string }>,
  category: string | undefined,
): string | null {
  if (!codes.length) return null;
  const hints = NOTICE_NAME_HINTS[category ?? ""] ?? [];
  for (const h of hints) {
    const hit = codes.find((c) => c.firstCategoryName.includes(h));
    if (hit) return hit.categoryCode;
  }
  // 어느 분류에도 안 걸리면 "기타"류를 찾는다 — 이건 실제로 존재하는 코드다
  const etc = codes.find(
    (c) => c.firstCategoryName.includes("기타") || c.categoryCode.startsWith("ETC"),
  );
  return etc?.categoryCode ?? null;
}

/**
 * 고시 항목을 채운다.
 *
 * ★ 모르는 것은 모른다고 적는다
 *
 * 제조국·제조연월·소재 같은 항목은 도매 검색 응답에 없다. 그럴듯하게
 * 지어내면 표시광고법 위반이고 이건 페널티가 아니라 법적 문제다.
 * 「상품 상세 참조」도 상세에 실제로 그 내용이 있을 때만 허용되므로
 * 함부로 쓸 수 없다. 그래서 확인되지 않은 항목은 확인 불가임을 밝힌다.
 */
export function buildNoticeItems(
  items: NoticeItem[],
  known: { productName: string; brandName: string },
): Array<{ id: number; content: string }> {
  return items.map((it) => {
    const t = it.title;
    if (/제조자|수입자|판매자/.test(t)) return { id: it.id, content: known.brandName };
    if (/품명|모델/.test(t)) return { id: it.id, content: known.productName.slice(0, 100) };
    if (/A\/S|에이에스|고객상담|문의/.test(t)) return { id: it.id, content: "판매자 고객센터" };
    if (/교환|반품|환불|품질보증/.test(t)) {
      return { id: it.id, content: "관련 법령 및 소비자분쟁해결기준에 따름" };
    }
    return { id: it.id, content: "상세 확인 불가 — 공급처 확인 후 보완 예정" };
  });
}
