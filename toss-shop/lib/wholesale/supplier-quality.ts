/**
 * 공급처 품질 판정 — 도매매/도매꾹 공급사 등급 + 출고 속도
 *
 * 사용자 요구: "공급처가 1등급에 당일발송 해주는 곳만" 소싱.
 *
 * 도매꾹/도매매 공급사 등급 기준(공식):
 *  - 출고 속도: 주문일→출고일 평균 1일 이하 = 우수
 *  - 정상 출고율: 80% 이상 = 우수
 *  → 우수/일반/신규 3단계
 *
 * ⚠️ 중요 — fail-closed 설계:
 * Open API 응답에 등급·출고 필드가 없거나 이름이 달라 판독에 실패하면
 * `verified: false`(= unknown)로 남기고, Jarvis 게이트에서 **탈락**시킨다.
 * "아마 좋을 것"이라는 추측으로 통과시키지 않는다 — 잘못 통과하면
 * 배송 지연·품절로 토스 페널티와 반품 손실이 발생하기 때문.
 */

export type SupplierGrade = "excellent" | "normal" | "new" | "unknown";
export type ShipSpeed = "same_day" | "next_day" | "slow" | "unknown";

export type SupplierQuality = {
  grade: SupplierGrade;
  shipSpeed: ShipSpeed;
  /** 등급·출고속도를 응답에서 실제로 판독했는가 (추정 아님) */
  verified: boolean;
  /** 정상 출고율 % (응답에 있을 때만) */
  fulfillmentRatePct?: number;
  /** 평균 출고 소요일 (응답에 있을 때만) */
  avgShipDays?: number;
  /** 판독에 사용된 원본 필드명 — 스펙 검증·디버깅용 */
  readFrom: string[];
  /** 사람이 읽는 사유 */
  reason: string;
};

/**
 * 등급/출고 값이 담길 수 있는 필드 후보.
 *
 * ⚠️ 이 후보군은 **도매꾹/도매매 응답 기준**이다. 다른 도매 플랫폼은 필드명이
 * 전혀 다르므로, 이 기본값을 그대로 쓰면 전부 판독 실패 → verified:false →
 * 전량 탈락한다. fail-closed라 안전하긴 하지만 그 플랫폼 상품이 하나도
 * 안 올라간다. 그래서 플랫폼별 어댑터가 자기 필드맵을 넘기도록 한다.
 */
export type SupplierQualityFieldMap = {
  grade: string[];
  shipDays: string[];
  shipFlag: string[];
  rate: string[];
  /** 판매자 정보가 중첩될 수 있는 키 */
  nested: string[];
};

export const DOMEGGOOK_QUALITY_FIELDS: SupplierQualityFieldMap = {
  grade: ["grade", "sellerGrade", "seller_grade", "lvl", "level", "sellerLevel"],
  shipDays: ["shipDays", "avgShipDays", "deliAvgDay", "avgDeliveryDay", "outDays"],
  shipFlag: ["todayShip", "isTodayShip", "sameDay", "isSameDayShip", "todayDeli"],
  rate: ["shipRate", "fulfillRate", "normalShipRate", "deliveryRate"],
  nested: ["seller", "sellerInfo", "supplier", "deli"],
};

function pick(src: Record<string, unknown>, fields: string[]): { value: unknown; from: string } | null {
  for (const f of fields) {
    const v = src[f];
    if (v !== undefined && v !== null && v !== "") return { value: v, from: f };
  }
  return null;
}

function toNum(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function toBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["y", "1", "true", "t", "당일", "당일발송"].includes(s)) return true;
    if (["n", "0", "false", "f"].includes(s)) return false;
  }
  return undefined;
}

function normalizeGrade(v: unknown): SupplierGrade | undefined {
  if (typeof v === "number") {
    // 1등급이 최상위인 숫자 등급 체계
    if (v === 1) return "excellent";
    if (v >= 2) return "normal";
    return undefined;
  }
  if (typeof v !== "string") return undefined;
  const s = v.trim().toLowerCase();
  if (["우수", "excellent", "best", "1", "1등급", "a", "s"].includes(s)) return "excellent";
  if (["일반", "normal", "general", "2", "2등급", "b"].includes(s)) return "normal";
  if (["신규", "new", "3", "3등급"].includes(s)) return "new";
  return undefined;
}

/**
 * 도매꾹/도매매 상품 응답 객체에서 공급처 품질을 판독한다.
 * 판독 실패 시 verified:false (게이트에서 탈락) — 추측하지 않는다.
 */
export function readSupplierQuality(
  raw: unknown,
  fields: SupplierQualityFieldMap = DOMEGGOOK_QUALITY_FIELDS,
): SupplierQuality {
  const readFrom: string[] = [];
  if (!raw || typeof raw !== "object") {
    return {
      grade: "unknown",
      shipSpeed: "unknown",
      verified: false,
      readFrom,
      reason: "공급처 응답 없음 — 등급·출고속도 미확인",
    };
  }

  // 상품 객체 안에 판매자 정보가 중첩될 수 있으므로 평탄화해서 함께 검사
  const obj = raw as Record<string, unknown>;
  const nested = fields.nested
    .map((k) => obj[k])
    .filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object");
  const flat: Record<string, unknown> = Object.assign({}, ...nested, obj);

  let grade: SupplierGrade = "unknown";
  const gHit = pick(flat, fields.grade);
  if (gHit) {
    const g = normalizeGrade(gHit.value);
    if (g) {
      grade = g;
      readFrom.push(gHit.from);
    }
  }

  let shipSpeed: ShipSpeed = "unknown";
  let avgShipDays: number | undefined;

  const flagHit = pick(flat, fields.shipFlag);
  if (flagHit) {
    const b = toBool(flagHit.value);
    if (b === true) {
      shipSpeed = "same_day";
      readFrom.push(flagHit.from);
    } else if (b === false) {
      shipSpeed = "slow";
      readFrom.push(flagHit.from);
    }
  }

  if (shipSpeed === "unknown") {
    const dHit = pick(flat, fields.shipDays);
    const d = dHit ? toNum(dHit.value) : undefined;
    if (dHit && d !== undefined) {
      avgShipDays = d;
      shipSpeed = d <= 0.5 ? "same_day" : d <= 1 ? "next_day" : "slow";
      readFrom.push(dHit.from);
    }
  }

  let fulfillmentRatePct: number | undefined;
  const rHit = pick(flat, fields.rate);
  if (rHit) {
    const r = toNum(rHit.value);
    if (r !== undefined) {
      fulfillmentRatePct = r;
      readFrom.push(rHit.from);
    }
  }

  const verified = grade !== "unknown" && shipSpeed !== "unknown";

  return {
    grade,
    shipSpeed,
    verified,
    fulfillmentRatePct,
    avgShipDays,
    readFrom,
    reason: verified
      ? `공급사 ${gradeLabel(grade)} · ${shipLabel(shipSpeed)}${
          fulfillmentRatePct !== undefined ? ` · 정상출고 ${fulfillmentRatePct}%` : ""
        }`
      : `등급·출고속도 미확인 (판독 필드 ${readFrom.length}개) — Jarvis 게이트 탈락`,
  };
}

export function gradeLabel(g: SupplierGrade): string {
  return g === "excellent" ? "우수(1등급)" : g === "normal" ? "일반" : g === "new" ? "신규" : "미확인";
}

export function shipLabel(s: ShipSpeed): string {
  return s === "same_day" ? "당일발송" : s === "next_day" ? "익일발송" : s === "slow" ? "발송지연" : "미확인";
}

/**
 * 배송 인센티브(판매수수료 0%)가 요구하는 발송기한 준수율은 **100%**다.
 * 준수율이 한 번이라도 깨지면 인센티브가 통째로 날아가고, 발송지연은
 * 셀러 페널티로도 쌓여 이중으로 맞는다. 그래서 오늘출발을 약속하려면
 * 공급처의 정상 출고율이 사실상 무결점이어야 한다.
 *
 * 종전 기준 80%는 "5건 중 1건 지연"을 허용하는 값이라 오늘출발 전략에서는
 * 재앙이다. 인센티브 손실 없이 감당 가능한 수준으로 올린다.
 */
export const SAME_DAY_MIN_FULFILLMENT_RATE_PCT = 98;

/**
 * 사용자 정책: 1등급(우수) + 당일발송만 통과.
 * 미확인은 통과시키지 않는다 (fail-closed).
 *
 * 출고율은 **필수 판독 항목**이다. 종전에는 `!== undefined` 조건이라
 * 출고율 필드가 없는 공급처는 검사를 통째로 건너뛰었는데, 그건 "모르면 통과"라
 * 이 파일의 fail-closed 원칙과 정면으로 어긋난다.
 */
export function meetsSupplierPolicy(q: SupplierQuality | undefined): boolean {
  if (!q || !q.verified) return false;
  if (q.grade !== "excellent") return false;
  if (q.shipSpeed !== "same_day") return false;
  // 출고율 미확인 = 탈락. 오늘출발은 남의 창고에 거는 약속이라 추측할 수 없다.
  if (q.fulfillmentRatePct === undefined) return false;
  if (q.fulfillmentRatePct < SAME_DAY_MIN_FULFILLMENT_RATE_PCT) return false;
  return true;
}

export function supplierPolicyDetail(q: SupplierQuality | undefined): string {
  if (!q) return "공급처 정보 없음 — 1등급·당일발송 확인 불가";
  if (!q.verified) return q.reason;
  if (q.grade !== "excellent") return `공급사 ${gradeLabel(q.grade)} — 1등급 아님`;
  if (q.shipSpeed !== "same_day") return `${shipLabel(q.shipSpeed)} — 당일발송 아님`;
  if (q.fulfillmentRatePct === undefined) {
    return "정상출고율 미확인 — 오늘출발 약속 불가 (인센티브 준수율 100% 요구)";
  }
  if (q.fulfillmentRatePct < SAME_DAY_MIN_FULFILLMENT_RATE_PCT) {
    return `정상출고율 ${q.fulfillmentRatePct}% — ${SAME_DAY_MIN_FULFILLMENT_RATE_PCT}% 미만이면 발송기한 준수율 100%를 못 지켜 인센티브가 날아간다`;
  }
  return q.reason;
}
