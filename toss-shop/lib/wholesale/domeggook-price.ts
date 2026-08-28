/**
 * 도매꾹·도매매 가격 판독 — "1개 살 때 실제로 얼마인가"
 *
 * ★ 무엇이 잘못돼 있었나
 *
 * 검색 응답을 이렇게 읽고 있었다:
 *
 *     unitPriceKrw: item.price,
 *     moq: item.unitQty ?? 1,
 *
 * 두 줄 다 위험하다.
 *
 * **1) `unitQty ?? 1` 은 fail-open이다.**
 * `unitQty`는 공식 문서상 **상품 최소구매수량(MOQ)**이다. 응답에 이 필드가
 * 없을 때 1로 가정하면 "1개씩 살 수 있다"고 단정하는 것인데, 실제 MOQ가
 * 10이면 주문이 성립하지 않는다. 위탁은 주문이 들어온 뒤 발주하므로,
 * 이 가정이 틀리면 **고객 주문을 받아 놓고 발주를 못 한다** — 취소·페널티로
 * 이어지고, 페널티는 배송 인센티브(수수료 0%)를 날려 전 상품 마진을 깎는다.
 * 이 저장소가 공급처 등급 판독에서 쓰는 fail-closed 원칙이 여기에도 필요하다.
 *
 * **2) 가격은 MOQ에 딸린 값이다.**
 * 상세 조회(getItemView)의 가격 필드는 수량별 구간 문자열이다:
 *
 *     price.dome   = "1+3800|20+3500|50+3300"
 *     price.supply = "1+4000"
 *
 * 즉 1~19개는 개당 3,800원, 20~49개는 3,500원이다. 검색 응답의 `price`는
 * 이 구간표에서 **그 상품의 MOQ에 해당하는 단가**다. MOQ가 2인 상품의
 * price는 "2개 이상 살 때의 개당 가격"이지 "1개 살 때의 가격"이 아니다.
 * 1개만 팔면서 그 값을 원가로 쓰면 실제로 나가는 돈과 다르다.
 *
 * ★ 도매꾹과 도매매는 같은 상품의 다른 판매 방식이다
 *
 * 상품번호는 하나인데 가격·구매단위가 마켓별로 따로 있다:
 *
 *     price.dome / qty.domeMoq / qty.domeUnit      — 도매꾹(묶음 도매)
 *     price.supply / qty.supplyUnit                 — 도매매(낱개 배송대행)
 *
 * 그래서 "도매꾹에서 본 상품을 도매매에서 낱개로 살 수 있는가"는 추측할
 * 필요가 없다 — **같은 상품번호로 상세를 조회해 `price.supply`가 있는지
 * 보면 된다.** 있으면 낱개 위탁이 성립하고, 없으면 그 상품은 묶음으로만
 * 팔리므로 위탁 소싱에서 제외해야 한다.
 *
 * 이 파일은 그 판독만 담당한다. 판독에 실패하면 실패했다고 답한다 —
 * 모르는 값을 채워 넣지 않는다.
 *
 * 출처: 도매꾹 Open API 공식 문서 (상품리스트 / 상품상세정보).
 */

export const DOMEGGOOK_PRICE_VERSION = "1.0";

/** 수량 구간 하나 — "이 수량 이상 살 때 개당 얼마" */
export type PriceTier = {
  /** 이 구간이 시작되는 수량 */
  minQty: number;
  /** 그 구간에서의 개당 가격 */
  unitPriceKrw: number;
};

export type TieredPrice = {
  tiers: PriceTier[];
  /** 판독에 성공했는가 — 실패면 tiers는 비어 있다 */
  parsed: boolean;
  raw: string;
};

/**
 * 수량별 가격 문자열을 판독한다.
 *
 * 형식: `"1+3800|20+3500|50+3300"` (수량+단가, 파이프로 구분)
 * 고정가면 구간이 하나뿐이거나 숫자만 올 수도 있다.
 *
 * 판독 실패 시 `parsed: false`. 빈 배열을 "가격 0"으로 오해하면 안 되므로
 * 호출부는 반드시 `parsed`를 확인해야 한다.
 */
export function parseTieredPrice(raw: unknown): TieredPrice {
  const text = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : "";
  if (!text) return { tiers: [], parsed: false, raw: "" };

  // 고정가: 숫자만 오는 경우
  if (/^\d+$/.test(text)) {
    const v = Number(text);
    return v > 0
      ? { tiers: [{ minQty: 1, unitPriceKrw: v }], parsed: true, raw: text }
      : { tiers: [], parsed: false, raw: text };
  }

  const tiers: PriceTier[] = [];
  for (const chunk of text.split("|")) {
    const m = chunk.trim().match(/^(\d+)\s*\+\s*(\d+)$/);
    if (!m) continue;
    const minQty = Number(m[1]);
    const unitPriceKrw = Number(m[2]);
    if (!Number.isFinite(minQty) || !Number.isFinite(unitPriceKrw)) continue;
    if (minQty <= 0 || unitPriceKrw <= 0) continue;
    tiers.push({ minQty, unitPriceKrw });
  }

  if (tiers.length === 0) return { tiers: [], parsed: false, raw: text };
  tiers.sort((a, b) => a.minQty - b.minQty);
  return { tiers, parsed: true, raw: text };
}

/**
 * 이 수량을 살 때의 개당 가격.
 *
 * 구간표에서 `minQty <= qty`인 가장 큰 구간을 고른다. qty가 첫 구간보다
 * 작으면 **그 수량으로는 살 수 없다**는 뜻이므로 null을 돌려준다 —
 * 첫 구간 가격을 대신 쓰면 살 수 없는 수량의 가격을 지어내는 것이 된다.
 */
export function unitPriceAtQty(tiered: TieredPrice, qty: number): number | null {
  if (!tiered.parsed || tiered.tiers.length === 0) return null;
  if (!Number.isFinite(qty) || qty <= 0) return null;
  if (qty < tiered.tiers[0].minQty) return null;

  let picked: PriceTier | null = null;
  for (const t of tiered.tiers) {
    if (t.minQty <= qty) picked = t;
    else break;
  }
  return picked?.unitPriceKrw ?? null;
}

// ─────────────────────────────────────────────────────────────
// 낱개 구매 가능 여부 판정
// ─────────────────────────────────────────────────────────────

/**
 * 위탁으로 1개씩 발주할 수 있는가, 그 때 개당 얼마인가.
 *
 * `supply`(도매매) 쪽을 먼저 본다 — 도매매가 낱개 배송대행 마켓이라
 * 위탁 판매에 성립하는 경로이기 때문이다. 도매매 가격이 없으면 그 상품은
 * 묶음(도매꾹)으로만 팔리므로 위탁 소싱 대상이 아니다.
 */
export type SingleUnitSourcing = {
  /** 1개 발주가 성립하는가 */
  available: boolean;
  /** 성립할 때 개당 공급가 */
  unitPriceKrw: number | null;
  /** 실제로 한 번에 발주해야 하는 최소 수량 */
  minOrderQty: number | null;
  /** 어느 마켓에서 성립하는가 */
  market: "supply" | "dome" | null;
  /** 판독 근거 — 사후 검증·진단용 */
  reason: string;
  /** 값을 실제로 읽었는가 (추정이면 false) */
  verified: boolean;
};

export type ItemViewPriceInput = {
  /** price.supply — 도매매 단가 (수량별 문자열) */
  supplyPrice?: unknown;
  /** price.dome — 도매꾹 단가 (수량별 문자열) */
  domePrice?: unknown;
  /** qty.supplyUnit — 도매매 구매단위 */
  supplyUnit?: unknown;
  /** qty.domeMoq — 도매꾹 최소구매수량 */
  domeMoq?: unknown;
  /** qty.domeUnit — 도매꾹 구매단위(배수 조건) */
  domeUnit?: unknown;
};

function toPositiveInt(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v.replace(/[^\d]/g, ""), 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * 상세 응답의 가격·수량 필드로 낱개 발주 가능 여부를 판정한다.
 *
 * fail-closed: 필드를 못 읽으면 `available: false`. "아마 1개씩 살 수 있을
 * 것"이라는 추측으로 통과시키면, 주문을 받아 놓고 발주를 못 하는 상황이 된다.
 */
export function resolveSingleUnitSourcing(input: ItemViewPriceInput): SingleUnitSourcing {
  // ── 도매매(낱개 배송대행) ──────────────────────────────
  const supply = parseTieredPrice(input.supplyPrice);
  if (supply.parsed) {
    // 구매단위가 있으면 그 배수로만 살 수 있다. 없으면 구간표의 첫 수량이
    // 사실상 최소 주문 수량이다.
    const unit = toPositiveInt(input.supplyUnit) ?? supply.tiers[0].minQty;
    const price = unitPriceAtQty(supply, unit);
    if (price != null) {
      return {
        available: unit === 1,
        unitPriceKrw: price,
        minOrderQty: unit,
        market: "supply",
        verified: true,
        reason:
          unit === 1
            ? `도매매 낱개 발주 가능 — 개당 ${price.toLocaleString()}원`
            : `도매매 구매단위 ${unit}개 — 1개 발주 불가(개당 ${price.toLocaleString()}원)`,
      };
    }
  }

  // ── 도매꾹(묶음) ───────────────────────────────────────
  //
  // 도매매 가격이 없으면 이 상품은 묶음으로만 팔린다. MOQ가 1인 예외적인
  // 경우에만 위탁이 성립한다.
  const dome = parseTieredPrice(input.domePrice);
  const domeMoq = toPositiveInt(input.domeMoq) ?? toPositiveInt(input.domeUnit);
  if (dome.parsed && domeMoq != null) {
    const price = unitPriceAtQty(dome, domeMoq);
    if (price != null) {
      return {
        available: domeMoq === 1,
        unitPriceKrw: price,
        minOrderQty: domeMoq,
        market: "dome",
        verified: true,
        reason:
          domeMoq === 1
            ? `도매꾹 낱개 발주 가능 — 개당 ${price.toLocaleString()}원`
            : `도매꾹 최소구매 ${domeMoq}개 — 위탁으로 1개씩 발주 불가. ` +
              `도매매 가격(price.supply)이 없어 낱개 경로도 없다`,
      };
    }
  }

  return {
    available: false,
    unitPriceKrw: null,
    minOrderQty: null,
    market: null,
    verified: false,
    reason:
      "가격·구매단위를 판독하지 못했다 — 1개 발주가 가능한지 확인되지 않아 소싱하지 않는다. " +
      "추측으로 통과시키면 주문을 받아 놓고 발주를 못 하는 상황이 된다",
  };
}

/**
 * 상세 응답(getItemView) 어디에 가격·수량이 있든 찾아낸다.
 *
 * 문서상 경로는 `price.supply`·`qty.domeMoq`지만, 응답은 바깥 껍질이 한 겹
 * 더 있는 경우가 있다(`{ domeggook: { price: {...} } }`). 검색 응답 파서가
 * 같은 이유로 한 번 무너진 적이 있으므로, 여기서도 경로를 하나로 찍지 않고
 * **키 이름으로 찾아 들어간다.**
 */
export function readPriceFieldsFromItemView(data: unknown): ItemViewPriceInput {
  const out: ItemViewPriceInput = {};
  const MAX_DEPTH = 6;

  const walk = (node: unknown, depth: number): void => {
    if (depth > MAX_DEPTH || !node || typeof node !== "object") return;

    const obj = node as Record<string, unknown>;

    // price 컨테이너
    const price = obj.price;
    if (price && typeof price === "object") {
      const p = price as Record<string, unknown>;
      if (out.supplyPrice === undefined && p.supply !== undefined) out.supplyPrice = p.supply;
      if (out.domePrice === undefined && p.dome !== undefined) out.domePrice = p.dome;
    }

    // qty 컨테이너
    const qty = obj.qty;
    if (qty && typeof qty === "object") {
      const q = qty as Record<string, unknown>;
      if (out.supplyUnit === undefined && q.supplyUnit !== undefined) out.supplyUnit = q.supplyUnit;
      if (out.domeMoq === undefined && q.domeMoq !== undefined) out.domeMoq = q.domeMoq;
      if (out.domeUnit === undefined && q.domeUnit !== undefined) out.domeUnit = q.domeUnit;
    }

    for (const v of Object.values(obj)) walk(v, depth + 1);
  };

  walk(data, 0);
  return out;
}
