/**
 * 교환·반품지 결정 엔진 — 위탁 공급처별 반품 수거 방식 차이를 흡수한다
 *
 * ★ 이 엔진이 존재하는 이유 — 반품지를 하나로 고정하면 돈이 샌다:
 *
 * 위탁판매에서 반품 처리 방식은 공급처마다 다르다.
 *  · 공급처 직접 수거형 — 반품지를 그 공급처 주소로 등록해야 한다.
 *    셀러 주소로 등록해두면 고객이 셀러에게 보내고, 셀러가 다시 공급처로
 *    재발송해야 한다. 왕복 택배비가 건당 통째로 손실이다.
 *  · 셀러 처리형 — 셀러 주소로 등록해야 한다. 공급처 주소로 잘못 등록하면
 *    공급처가 수취를 거부하고 반품이 미아가 된다 → 분쟁 → 토스 페널티.
 *
 * 게다가 도매꾹/도매매는 **플랫폼 하나에 공급사가 수천 개**다. 따라서
 * 플랫폼 단위 매핑(`domeggook` → 반품지 1개)은 실운영에서 의미가 없고,
 * `platform:sellerId` 공급처 단위까지 내려가야 실제로 맞는다.
 *
 * ⚠️ fail-closed 설계 — supplier-quality.ts와 같은 원칙:
 *  1) 매핑 JSON이 깨졌으면 **등록을 차단한다**. 조용히 기본 반품지로 넘어가면
 *     셀러는 매핑이 동작한다고 믿는 동안 전 SKU가 틀린 주소로 등록된다.
 *     설정 오류는 한 건이 아니라 전량에 영향을 주므로 침묵이 가장 위험하다.
 *  2) 매핑을 쓰기 시작했다는 것은 "공급처마다 반품지가 다르다"는 선언이다.
 *     그 상태에서 매핑에 없는 공급처가 나오면 경고를 남긴다. STRICT 모드
 *     (무인 자동등록용)에서는 차단한다.
 *  3) 결정 근거(어떤 키로 어떤 반품지가 뽑혔는지)를 초안에 기록한다.
 *     반품 사고는 등록 몇 주 뒤에 터지므로 사후 추적이 가능해야 한다.
 */

import { z } from "zod";
import type { ReturnHandling } from "../wholesale/supplier-return-policy";

export const RETURN_LOCATION_ENGINE_VERSION = "1.0";

/** 반품지가 결정된 경로 — 구체적인 것이 우선한다 */
export type ReturnLocationSource =
  /** 승인 화면에서 사용자가 직접 지정 */
  | "explicit"
  /** `platform:sellerId` — 공급처 단위 */
  | "supplier"
  /** `platform` — 플랫폼 단위 */
  | "platform"
  /** `mode:consignment` / `mode:import` — 판매 방식 단위 */
  | "mode"
  /** TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID */
  | "default"
  /** 결정 실패 */
  | "unresolved";

export type ReturnLocationErrorCode =
  /** 매핑 env가 있는데 JSON/스키마가 깨졌다 — 전량 오등록 위험, 차단 */
  | "MAP_INVALID"
  /** 기본 반품지도 매핑도 없다 — 토스 등록 자체가 불가 */
  | "MISSING"
  /** STRICT 모드인데 이 공급처 매핑이 없다 */
  | "UNMAPPED"
  /**
   * 공급처 전용 반품지가 필요한데(공급처 수거형 또는 판독 실패) 매핑에 없다.
   * 기본 반품지로 폴백하면 그 주소의 주인이 남의 반품을 받게 된다.
   */
  | "SUPPLIER_ADDRESS_REQUIRED";

export type ReturnLocationDecision = {
  engineVersion: string;
  /** 결정된 토스 반품지 ID. error가 있으면 undefined */
  locationId?: number;
  source: ReturnLocationSource;
  /** 매핑에서 실제로 적중한 키 */
  matchedKey?: string;
  /** 조회를 시도한 키들 (구체적 → 일반 순) — 디버깅·문서화용 */
  triedKeys: string[];
  /** 사람이 읽는 경고. 등록은 되지만 확인이 필요한 상황 */
  warnings: string[];
  error?: { code: ReturnLocationErrorCode; message: string };
};

export function isReturnLocationResolved(
  d: ReturnLocationDecision,
): d is ReturnLocationDecision & { locationId: number } {
  return !d.error && typeof d.locationId === "number" && d.locationId > 0;
}

// ─────────────────────────────────────────────────────────────
// 매핑 파싱 — zod 검증 + env 원문 기준 캐시
// ─────────────────────────────────────────────────────────────

/**
 * 값은 숫자 또는 숫자 문자열을 허용한다. Vercel 환경변수는 문자열로만
 * 들어오는 경우가 흔해서, JSON 안에 `"123"`으로 적어둬도 받아준다.
 */
const LocationIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/, "반품지 ID는 양의 정수여야 합니다"),
]);

const ReturnLocationMapSchema = z.record(
  z.string().min(1),
  LocationIdSchema,
);

type ParsedMap = { ok: true; map: Map<string, number> } | { ok: false; message: string };

let mapCache: { raw: string; parsed: ParsedMap } | null = null;

function parseMap(raw: string): ParsedMap {
  if (mapCache && mapCache.raw === raw) return mapCache.parsed;

  let parsed: ParsedMap;
  try {
    const json: unknown = JSON.parse(raw);
    if (json === null || typeof json !== "object" || Array.isArray(json)) {
      parsed = { ok: false, message: "최상위가 JSON 객체가 아닙니다 (예: {\"domeggook:12345\":678})" };
    } else {
      const result = ReturnLocationMapSchema.safeParse(json);
      if (!result.success) {
        const first = result.error.issues[0];
        const at = first?.path.join(".") ?? "";
        parsed = {
          ok: false,
          message: `${at ? `키 "${at}": ` : ""}${first?.message ?? "스키마 검증 실패"}`,
        };
      } else {
        const map = new Map<string, number>();
        for (const [key, value] of Object.entries(result.data)) {
          map.set(normalizeKey(key), Number(value));
        }
        parsed = { ok: true, map };
      }
    }
  } catch (e) {
    parsed = { ok: false, message: e instanceof Error ? e.message : "JSON 파싱 실패" };
  }

  mapCache = { raw, parsed };
  return parsed;
}

/** 테스트·핫리로드용 — 캐시를 비운다 */
export function clearReturnLocationMapCache(): void {
  mapCache = null;
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function readDefaultLocationId(): number | undefined {
  const n = Number.parseInt(process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID?.trim() ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function isStrict(): boolean {
  return process.env.TOSS_SHOP_RETURN_LOCATION_STRICT?.trim().toLowerCase() === "true";
}

/**
 * 기본 반품지가 **셀러 자체 주소**임이 선언되었는가.
 *
 * 이 선언이 없으면 기본 반품지는 "성격 미상"으로 취급한다. 성격 미상 주소를
 * 공급처 수거형 상품의 반품지로 쓰면, 그 주소의 주인(예전 공급처)이 남의
 * 반품을 받게 되어 수취 거부·미아·분쟁으로 이어진다.
 *
 * 매핑의 `seller_default` 키로도 같은 선언이 가능하다 — 그쪽이 더 명시적이다.
 */
function sellerOwnedDefaultId(map?: Map<string, number>): number | undefined {
  const fromMap = map?.get("seller_default");
  if (fromMap) return fromMap;
  const declared =
    process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED?.trim().toLowerCase() === "true";
  return declared ? readDefaultLocationId() : undefined;
}

/**
 * 이 상품이 셀러 자체 반품지를 써도 되는가.
 * seller_handles로 확인된 경우에만 true — 나머지(공급처 수거형·판독 실패)는
 * 공급처 전용 주소가 필요하다.
 */
function mayUseSellerOwned(handling: ReturnHandling | undefined): boolean {
  return handling === "seller_handles";
}

// ─────────────────────────────────────────────────────────────
// 조회 키 생성
// ─────────────────────────────────────────────────────────────

export type ReturnLocationLookup = {
  /** 위탁: 도매 플랫폼 슬러그(domeggook/domeme/1688...) · 수입: 소싱 국가명 */
  supplierPlatform?: string;
  /** 도매꾹/도매매 공급사 ID — 공급처 단위 매핑의 핵심 키 */
  supplierId?: string;
  pickMode?: "consignment" | "import";
};

/**
 * 구체적인 것부터 시도할 키 목록을 만든다.
 *
 * 수입(해외구매대행)에서 `supplierPlatform`은 플랫폼 슬러그가 아니라
 * 국가명("중국"/"일본")이 들어온다. 국가는 공급처가 아니므로 플랫폼 키로
 * 취급하지 않고 `country:` 네임스페이스로 분리한다. 반품을 해외로 보낼 수는
 * 없으니 수입 건의 반품지는 결국 국내 주소여야 하고, 그 결정은 `mode:import`
 * 또는 기본 반품지가 담당한다.
 */
export function buildReturnLocationKeys(lookup: ReturnLocationLookup): string[] {
  const keys: string[] = [];
  const platform = lookup.supplierPlatform?.trim();
  const supplierId = lookup.supplierId?.trim();
  const isImport = lookup.pickMode === "import";

  if (platform && supplierId) {
    keys.push(normalizeKey(`${platform}:${supplierId}`));
  }
  if (platform) {
    keys.push(normalizeKey(isImport ? `country:${platform}` : platform));
  }
  if (lookup.pickMode) {
    keys.push(normalizeKey(`mode:${lookup.pickMode}`));
  }
  return keys;
}

function sourceForKey(key: string, index: number, hasSupplierKey: boolean): ReturnLocationSource {
  if (key.startsWith("mode:")) return "mode";
  if (hasSupplierKey && index === 0) return "supplier";
  return "platform";
}

// ─────────────────────────────────────────────────────────────
// 결정
// ─────────────────────────────────────────────────────────────

export type ResolveReturnLocationInput = ReturnLocationLookup & {
  /** 승인 화면에서 사용자가 직접 지정한 반품지 — 항상 최우선 */
  explicitLocationId?: number;
  /**
   * 무인 자동등록처럼 사람이 확인하지 않는 경로에서 true.
   * 매핑 누락 시 경고가 아니라 차단으로 처리한다.
   * 미지정 시 TOSS_SHOP_RETURN_LOCATION_STRICT를 따른다.
   */
  strict?: boolean;
  /**
   * 이 공급처의 반품 처리 방식 (supplier-return-policy.ts 판독 결과).
   *
   * seller_handles로 **확인된** 경우에만 셀러 자체 반품지 폴백을 허용한다.
   * supplier_collects·unknown이면 공급처 전용 반품지가 없는 한 등록을 막는다 —
   * 예전에 등록해둔 다른 공급처 주소가 기본 반품지로 걸려 있으면, 그 주소로
   * 엉뚱한 상품이 반품되어 수취 거부·미아·분쟁이 발생하기 때문이다.
   */
  returnHandling?: ReturnHandling;
};

export function resolveReturnLocation(input: ResolveReturnLocationInput): ReturnLocationDecision {
  const warnings: string[] = [];
  const base = { engineVersion: RETURN_LOCATION_ENGINE_VERSION, warnings };

  // 1) 사용자가 직접 지정했으면 그대로 쓴다.
  if (input.explicitLocationId && input.explicitLocationId > 0) {
    return { ...base, locationId: input.explicitLocationId, source: "explicit", triedKeys: [] };
  }

  const triedKeys = buildReturnLocationKeys(input);
  const defaultId = readDefaultLocationId();
  const rawMap = process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP?.trim();
  const strict = input.strict ?? isStrict();

  // 2) 매핑이 설정돼 있으면 반드시 유효해야 한다 (fail-closed).
  if (rawMap) {
    const parsed = parseMap(rawMap);
    if (!parsed.ok) {
      return {
        ...base,
        source: "unresolved",
        triedKeys,
        error: {
          code: "MAP_INVALID",
          message:
            `TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP 파싱 실패 — ${parsed.message}. ` +
            "매핑이 깨진 채로 등록하면 전 상품이 기본 반품지로 잘못 등록되므로 차단합니다.",
        },
      };
    }

    const hasSupplierKey = Boolean(input.supplierPlatform?.trim() && input.supplierId?.trim());
    for (const [i, key] of triedKeys.entries()) {
      const hit = parsed.map.get(key);
      if (hit) {
        return {
          ...base,
          locationId: hit,
          source: sourceForKey(key, i, hasSupplierKey),
          matchedKey: key,
          triedKeys,
        };
      }
    }

    // 매핑을 쓴다 = 공급처마다 반품지가 다르다는 선언. 그런데 이 건은 누락됐다.
    const label = describeSupplier(input);

    // 공급처 수거형(또는 판독 실패)인데 전용 주소가 없다 → 기본값 폴백 금지.
    // 폴백하면 기본 반품지 주인이 남의 반품을 받는다.
    const sellerOwned = sellerOwnedDefaultId(parsed.map);
    if (!mayUseSellerOwned(input.returnHandling) && !sellerOwned) {
      return {
        ...base,
        source: "unresolved",
        triedKeys,
        error: {
          code: "SUPPLIER_ADDRESS_REQUIRED",
          message:
            `${label}는 ${input.returnHandling === "supplier_collects" ? "공급처가 직접 수거하는 곳" : "반품 처리 주체가 확인되지 않은 곳"}이라 ` +
            "전용 반품지가 필요합니다. 기본 반품지로 등록하면 그 주소의 주인이 남의 반품을 받게 되어 " +
            `수취 거부·분쟁으로 이어집니다. 시도한 키: ${triedKeys.join(", ") || "없음"}. ` +
            "이 공급처 주소를 토스에 등록하고 매핑에 추가하거나, 셀러 자체 반품지를 " +
            "매핑의 seller_default 키로 선언하세요.",
        },
      };
    }

    if (strict) {
      return {
        ...base,
        source: "unresolved",
        triedKeys,
        error: {
          code: "UNMAPPED",
          message:
            `${label} 반품지가 매핑에 없습니다 (STRICT). 시도한 키: ${triedKeys.join(", ") || "없음"}. ` +
            "TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP에 추가하거나 승인 화면에서 직접 지정하세요.",
        },
      };
    }
    if (!hasSupplierKey && input.pickMode === "consignment") {
      warnings.push(
        "공급사 ID를 판독하지 못해 공급처 단위 반품지 매핑을 시도할 수 없었습니다 — 플랫폼/기본 반품지로 등록됩니다.",
      );
    }
    warnings.push(
      `${label} 반품지 매핑이 없어 기본 반품지로 등록됩니다. ` +
        "이 공급처가 직접 수거하는 곳이면 반품이 셀러에게 오므로 왕복 배송비가 발생합니다.",
    );
  }

  // 3) 기본 반품지
  //
  // ⚠️ 여기가 가장 위험한 지점이다. 셀러가 예전에 A공급처 상품을 팔면서
  // A의 주소를 반품지로 등록해뒀다면, 그게 기본 반품지가 되어 이후 B·C·D
  // 공급처 상품이 전부 A의 주소로 반품되도록 등록된다. A는 남의 물건이라
  // 수취를 거부하고, 반품은 미아가 되고, 분쟁·페널티는 셀러가 받는다.
  //
  // 그래서 기본 반품지는 **셀러 자체 주소임이 선언된 경우에만** 폴백으로 쓴다.
  // 선언은 매핑의 seller_default 키 또는
  // TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED=true 로 한다.
  const parsedMapForDefault = rawMap ? parseMap(rawMap) : undefined;
  const sellerOwned = sellerOwnedDefaultId(
    parsedMapForDefault?.ok ? parsedMapForDefault.map : undefined,
  );

  if (sellerOwned) {
    if (!mayUseSellerOwned(input.returnHandling)) {
      // 셀러 주소로 보내도 "남의 주소"는 아니라 분쟁은 안 나지만,
      // 공급처 수거형이면 셀러→공급처 재발송 왕복비가 든다. 경고만 남긴다.
      warnings.push(
        `${describeSupplier(input)}는 ${
          input.returnHandling === "supplier_collects"
            ? "공급처 직접수거형"
            : "반품 처리 주체 미확인"
        }인데 셀러 자체 반품지로 등록됩니다 — 반품 시 셀러가 받아 공급처로 재발송해야 해 왕복 택배비가 발생할 수 있습니다.`,
      );
    }
    if (input.pickMode === "import" && !rawMap) {
      warnings.push(
        "해외구매대행 건입니다 — 기본 반품지가 국내 주소인지 확인하세요. 반품은 해외로 보낼 수 없습니다.",
      );
    }
    return { ...base, locationId: sellerOwned, source: "default", triedKeys };
  }

  if (defaultId) {
    // 기본 반품지는 있는데 성격이 선언되지 않았다 — 누구 주소인지 모른다.
    return {
      ...base,
      source: "unresolved",
      triedKeys,
      error: {
        code: "SUPPLIER_ADDRESS_REQUIRED",
        message:
          `기본 반품지 ${defaultId}의 성격이 선언되지 않아 사용할 수 없습니다. ` +
          "이 주소가 예전 공급처 주소라면, 다른 공급처 상품의 반품이 그 공급처로 가서 " +
          "수취 거부·미아·분쟁이 발생합니다. " +
          "이 주소가 셀러(내) 자체 반품지가 맞다면 TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED=true 를 설정하고, " +
          "특정 공급처 전용 주소라면 TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP에 " +
          `"${input.supplierPlatform ?? "platform"}:${input.supplierId ?? "sellerId"}" 키로 매핑하세요.`,
      },
    };
  }

  return {
    ...base,
    source: "unresolved",
    triedKeys,
    error: {
      code: "MISSING",
      message:
        "교환·반품지 ID가 없습니다 — Vercel에 TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID를 설정하거나 " +
        "TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP에 이 공급처를 추가하세요.",
    },
  };
}

function describeSupplier(input: ReturnLocationLookup): string {
  const platform = input.supplierPlatform?.trim();
  const supplierId = input.supplierId?.trim();
  if (platform && supplierId) return `공급처 ${platform}:${supplierId}`;
  if (platform) return `공급처 ${platform}`;
  return "공급처 미상";
}

/** 설정 상태 요약 — 헬스체크/설정 화면용 */
export function describeReturnLocationConfig(): {
  defaultId?: number;
  mapEntryCount: number;
  mapValid: boolean;
  mapError?: string;
  strict: boolean;
  /** 폴백으로 쓸 수 있는 셀러 자체 반품지 (선언된 경우에만) */
  sellerOwnedId?: number;
  /** 기본 반품지는 있는데 성격이 선언되지 않았다 — 오배정 위험 */
  defaultUndeclared: boolean;
} {
  const defaultId = readDefaultLocationId();
  const strict = isStrict();
  const raw = process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP?.trim();

  if (!raw) {
    const sellerOwnedId = sellerOwnedDefaultId();
    return {
      defaultId,
      mapEntryCount: 0,
      mapValid: true,
      strict,
      sellerOwnedId,
      defaultUndeclared: Boolean(defaultId) && !sellerOwnedId,
    };
  }

  const parsed = parseMap(raw);
  if (!parsed.ok) {
    return {
      defaultId,
      mapEntryCount: 0,
      mapValid: false,
      mapError: parsed.message,
      strict,
      defaultUndeclared: false,
    };
  }
  const sellerOwnedId = sellerOwnedDefaultId(parsed.map);
  return {
    defaultId,
    mapEntryCount: parsed.map.size,
    mapValid: true,
    strict,
    sellerOwnedId,
    defaultUndeclared: Boolean(defaultId) && !sellerOwnedId,
  };
}
