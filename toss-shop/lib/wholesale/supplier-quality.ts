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

/** 도매꾹 Open API 응답에서 등급/출고 관련 값이 담길 수 있는 필드 후보 */
const GRADE_FIELDS = ["grade", "sellerGrade", "seller_grade", "lvl", "level", "sellerLevel"];
const SHIP_DAY_FIELDS = ["shipDays", "avgShipDays", "deliAvgDay", "avgDeliveryDay", "outDays"];
const SHIP_FLAG_FIELDS = ["todayShip", "isTodayShip", "sameDay", "isSameDayShip", "todayDeli"];
const RATE_FIELDS = ["shipRate", "fulfillRate", "normalShipRate", "deliveryRate"];

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
export function readSupplierQuality(raw: unknown): SupplierQuality {
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
  const nested = ["seller", "sellerInfo", "supplier", "deli"]
    .map((k) => obj[k])
    .filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object");
  const flat: Record<string, unknown> = Object.assign({}, ...nested, obj);

  let grade: SupplierGrade = "unknown";
  const gHit = pick(flat, GRADE_FIELDS);
  if (gHit) {
    const g = normalizeGrade(gHit.value);
    if (g) {
      grade = g;
      readFrom.push(gHit.from);
    }
  }

  let shipSpeed: ShipSpeed = "unknown";
  let avgShipDays: number | undefined;

  const flagHit = pick(flat, SHIP_FLAG_FIELDS);
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
    const dHit = pick(flat, SHIP_DAY_FIELDS);
    const d = dHit ? toNum(dHit.value) : undefined;
    if (dHit && d !== undefined) {
      avgShipDays = d;
      shipSpeed = d <= 0.5 ? "same_day" : d <= 1 ? "next_day" : "slow";
      readFrom.push(dHit.from);
    }
  }

  let fulfillmentRatePct: number | undefined;
  const rHit = pick(flat, RATE_FIELDS);
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
 * 사용자 정책: 1등급(우수) + 당일발송만 통과.
 * 미확인은 통과시키지 않는다 (fail-closed).
 */
export function meetsSupplierPolicy(q: SupplierQuality | undefined): boolean {
  if (!q || !q.verified) return false;
  if (q.grade !== "excellent") return false;
  if (q.shipSpeed !== "same_day") return false;
  if (q.fulfillmentRatePct !== undefined && q.fulfillmentRatePct < 80) return false;
  return true;
}

export function supplierPolicyDetail(q: SupplierQuality | undefined): string {
  if (!q) return "공급처 정보 없음 — 1등급·당일발송 확인 불가";
  if (!q.verified) return q.reason;
  if (q.grade !== "excellent") return `공급사 ${gradeLabel(q.grade)} — 1등급 아님`;
  if (q.shipSpeed !== "same_day") return `${shipLabel(q.shipSpeed)} — 당일발송 아님`;
  if (q.fulfillmentRatePct !== undefined && q.fulfillmentRatePct < 80) {
    return `정상출고율 ${q.fulfillmentRatePct}% — 80% 미만`;
  }
  return q.reason;
}
