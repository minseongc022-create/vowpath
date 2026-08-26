/**
 * 상품 운영 API — 등록한 뒤에 손대는 것들
 *
 * ★ 이게 있어야 "운영"이 된다
 *
 * 지금까지 자비스는 상품을 **올리기만** 했다. 올린 뒤에 안 팔려도 할 수 있는
 * 게 없었다. 가격을 못 내리고, 죽은 상품을 못 숨기고, 품절을 못 막았다.
 * 그건 판매 대행이지 운영이 아니다.
 *
 * 엔드포인트는 토스 공식 문서(shopping-docs.toss.im)의 OpenAPI 스펙에서
 * 그대로 가져왔다. 추측한 경로가 하나도 없다.
 */

import { tossApiGet, tossApiPost, tossApiPut } from "./client";
import type { TossApiConfig } from "./config";

export const PRODUCT_OPS_VERSION = "1.0";

/**
 * 옵션 판매가를 바꾼다.
 *
 * ★ 토스가 거는 두 가지 제약 (문서 명시)
 *
 *  · 최소 1원 이상
 *  · **정상가(originPrice) 이하**여야 한다
 *
 * 두 번째가 중요하다. 정상가를 넘겨 올리려 하면 거절당하는데, 그걸 성공으로
 * 착각하면 "가격 올렸습니다"라고 보고해놓고 실제로는 안 바뀐 상태가 된다.
 * 그래서 이 함수는 실패를 삼키지 않고 사유를 그대로 돌려준다.
 */
export async function updateSalePrice(
  merchantId: string,
  config: TossApiConfig,
  input: { productId: number; productItemId: number; salePriceKrw: number },
): Promise<{ ok: boolean; reason?: string }> {
  if (!Number.isInteger(input.salePriceKrw) || input.salePriceKrw < 1) {
    return { ok: false, reason: "판매가는 1원 이상 정수여야 합니다" };
  }
  try {
    const res = await tossApiPut<Record<string, never>>(
      merchantId,
      config,
      `/api/v3/shopping-fep/product-items/${input.productItemId}/sale-price`,
      { productId: input.productId, salePrice: input.salePriceKrw },
    );
    if (res.resultType === "SUCCESS") return { ok: true };
    return { ok: false, reason: res.error?.reason ?? res.error?.errorCode ?? "FAIL" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "PRICE_UPDATE_FAIL" };
  }
}

/** 정상가를 바꾼다 — 할인율을 만들려면 정상가가 판매가보다 위에 있어야 한다 */
export async function updateOriginPrice(
  merchantId: string,
  config: TossApiConfig,
  input: { productId: number; productItemId: number; originPriceKrw: number },
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await tossApiPut<Record<string, never>>(
      merchantId,
      config,
      `/api/v3/shopping-fep/product-items/${input.productItemId}/origin-price`,
      { productId: input.productId, originPrice: input.originPriceKrw },
    );
    if (res.resultType === "SUCCESS") return { ok: true };
    return { ok: false, reason: res.error?.reason ?? res.error?.errorCode ?? "FAIL" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "ORIGIN_PRICE_FAIL" };
  }
}

/**
 * 상품을 숨긴다.
 *
 * 삭제가 아니라 숨김을 쓴다. 삭제하면 그동안 쌓인 리뷰와 판매 이력이 같이
 * 사라지는데, 그건 되돌릴 수 없다. 숨겨두면 시장이 바뀌었을 때 다시 꺼낼 수
 * 있고 리뷰도 그대로 남는다.
 */
export async function hideProduct(
  merchantId: string,
  config: TossApiConfig,
  productId: number,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await tossApiPost<Record<string, never>>(
      merchantId,
      config,
      "/api/v3/shopping-fep/products/hide",
      { productId },
    );
    if (res.resultType === "SUCCESS") return { ok: true };
    return { ok: false, reason: res.error?.reason ?? "FAIL" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "HIDE_FAIL" };
  }
}

/** 숨긴 상품을 다시 노출한다 */
export async function showProduct(
  merchantId: string,
  config: TossApiConfig,
  productId: number,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await tossApiPost<Record<string, never>>(
      merchantId,
      config,
      "/api/v3/shopping-fep/products/show",
      { productId },
    );
    if (res.resultType === "SUCCESS") return { ok: true };
    return { ok: false, reason: res.error?.reason ?? "FAIL" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "SHOW_FAIL" };
  }
}

/**
 * 재고 수량을 바꾼다.
 *
 * 위탁이라 재고를 안 쥐고 있지만, 공급처가 품절되면 0으로 내려야 한다.
 * 품절인 걸 계속 팔면 주문이 들어오고, 그건 취소로 이어지고, 취소율은
 * 배송 인센티브(수수료 0%)를 날린다.
 */
export async function updateStock(
  merchantId: string,
  config: TossApiConfig,
  input: { productItemId: number; remainingCount: number },
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await tossApiPut<Record<string, never>>(
      merchantId,
      config,
      `/api/v3/shopping-fep/product-items/${input.productItemId}/stocks/normal-stock/remaining-count`,
      { remainingCount: Math.max(0, Math.floor(input.remainingCount)) },
    );
    if (res.resultType === "SUCCESS") return { ok: true };
    return { ok: false, reason: res.error?.reason ?? "FAIL" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "STOCK_FAIL" };
  }
}

// ─────────────────────────────────────────────────────────────
// 택배사 코드
// ─────────────────────────────────────────────────────────────

/**
 * 토스가 받는 택배사 값 목록.
 *
 * ★ 실측으로 잡은 버그
 *
 * 문서에 이렇게 적혀 있다: `deliveryCompany`는 **"배송 회사 코드"**이고
 * "택배사 정보 조회 API에서 확인 가능"하다. 우리는 여태 "CJ대한통운" 같은
 * **이름**을 보내고 있었다. 그러면 송장 등록이 거절되고, 고객은 배송 조회를
 * 못 하고, 발송기한 미준수로 잡힌다.
 *
 * 그래서 실제 목록을 받아 와서 맞춘다. 못 받아 오면 **추측해서 보내지 않고**
 * 실패로 처리한다 — 틀린 값을 보내는 것보다 안 보내고 알리는 게 낫다.
 */
export async function listDeliveryCompanyCodes(
  merchantId: string,
  config: TossApiConfig,
): Promise<string[]> {
  try {
    const res = await tossApiGet<{ deliveryCompanies?: string[] }>(
      merchantId,
      config,
      "/api/v3/shopping-fep/orders/delivery-companies",
    );
    if (res.resultType !== "SUCCESS") return [];
    return res.success?.deliveryCompanies ?? [];
  } catch {
    return [];
  }
}

/**
 * 사장님이 말한 택배사를 토스가 받는 값으로 맞춘다.
 *
 * 사장님은 "CJ", "씨제이", "대한통운" 중 뭐라도 쓸 수 있다. 토스 목록에
 * 실제로 있는 값 중에서 고르되, **비슷한 게 없으면 null을 돌려준다** —
 * 아무거나 골라 보내면 엉뚱한 택배사로 등록되어 조회가 깨진다.
 */
export function matchDeliveryCompanyCode(
  spoken: string,
  codes: string[],
): string | null {
  if (codes.length === 0) return null;
  const norm = (v: string) => v.replace(/[\s\-_()]/g, "").toUpperCase();
  const target = norm(spoken);

  // 1. 완전히 같은 값
  const exact = codes.find((c) => norm(c) === target);
  if (exact) return exact;

  // 2. 한쪽이 다른 쪽을 포함 — "CJ"가 "CJ대한통운"을 찾아내는 경로
  const contains = codes.find((c) => norm(c).includes(target) || target.includes(norm(c)));
  if (contains) return contains;

  // 3. 별칭 — 사람이 쓰는 말과 코드가 아예 다른 경우
  const ALIASES: Record<string, string[]> = {
    CJ: ["씨제이", "대한통운", "CJ대한통운"],
    한진: ["한진택배"],
    롯데: ["롯데택배", "현대택배"],
    우체국: ["등기", "EPOST", "우편"],
    로젠: ["로젠택배"],
    쿠팡: ["CLO", "쿠팡로지스틱스"],
  };
  for (const [key, words] of Object.entries(ALIASES)) {
    if (words.some((w) => norm(w) === target || target.includes(norm(w)))) {
      const hit = codes.find((c) => norm(c).includes(norm(key)));
      if (hit) return hit;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// 옵션(아이템) 조회 — 가격을 만지려면 옵션 ID가 필요하다
// ─────────────────────────────────────────────────────────────

export type TossProductItem = {
  itemId: number;
  itemName: string;
  quantity: number;
  salePrice: number;
  originPrice: number;
  isMainOption: boolean;
};

/**
 * 상품의 옵션 목록을 읽는다.
 *
 * 판매가 수정은 상품이 아니라 **옵션 단위**로 걸린다(토스 설계). 그래서
 * 가격을 손보려면 먼저 여기서 옵션 ID와 현재가를 받아와야 한다.
 * 현재가를 우리 기록이 아니라 토스에서 읽는 이유: 사장님이 셀러센터에서
 * 직접 바꿨을 수 있고, 그걸 모른 채 우리 기록으로 계산하면 엉뚱한 값으로
 * 덮어쓰게 된다.
 */
export async function listProductItems(
  merchantId: string,
  config: TossApiConfig,
  productId: number,
): Promise<TossProductItem[]> {
  const out: TossProductItem[] = [];
  let cursor: number | undefined;

  // 옵션이 아주 많은 상품도 있으므로 커서를 따라간다. 다만 무한 루프를
  // 막기 위해 페이지 수에 상한을 둔다.
  for (let page = 0; page < 10; page += 1) {
    try {
      const res = await tossApiGet<{
        items?: TossProductItem[];
        hasNext?: boolean;
        nextCursor?: number;
      }>(merchantId, config, `/api/v3/shopping-fep/products/${productId}/product-items`, {
        cursorItemId: cursor,
      });
      if (res.resultType !== "SUCCESS") break;
      out.push(...(res.success?.items ?? []));
      if (!res.success?.hasNext || res.success.nextCursor == null) break;
      cursor = res.success.nextCursor;
    } catch {
      break;
    }
  }
  return out;
}
