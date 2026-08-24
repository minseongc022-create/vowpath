/**
 * 토스 카테고리 ID 결정 엔진 — 상품마다 자동으로 맞는 카테고리를 고른다
 *
 * ★ 이 엔진이 존재하는 이유:
 * 종전에는 `TOSS_SHOP_DEFAULT_CATEGORY_ID` 하나가 **모든 상품**에 그대로
 * 적용됐다. 자비스는 이미 각 픽을 food/beauty/home/digital/fashion/health
 * 여섯 개로 분류해두는데(`ConsignmentPick.category`), 그 정보가 카테고리
 * ID 선택에 전혀 쓰이지 않았다. 식품 카테고리로 설정해두면 뷰티 상품도
 * 그대로 식품 카테고리로 등록되는 셈이었다 — 잘못된 카테고리 등록은 토스
 * 노출 저하·페널티로 직결된다.
 *
 * ★ 그런데 실제 숫자는 자비스가 지어낼 수 없다.
 * 반품지 ID와 마찬가지로 카테고리 ID는 토스 자체 분류체계의 실제 값이다.
 * 임의의 숫자를 넣으면 등록 자체가 거부되거나(더 나쁘게는) 엉뚱한
 * 카테고리로 등록된다. 그래서 이 엔진이 하는 일은 "숫자를 만드는 것"이
 * 아니라 "셀러가 6개 카테고리에 대해 한 번만 입력해둔 실제 토스 ID 중,
 * 지금 이 상품에 맞는 걸 자동으로 골라 쓰는 것"이다.
 *
 * exchange-return-location.ts와 같은 설계 원칙:
 *  1) 매핑 JSON이 깨졌으면 등록을 차단한다 (fail-closed)
 *  2) 매핑에 이 카테고리가 없으면 기본값으로 폴백 + 경고
 *  3) 기본값도 매핑도 없으면 등록 차단
 */

import { z } from "zod";
import type { TossShopCategory } from "../types";

export const CATEGORY_RESOLVER_VERSION = "1.0";

export type CategoryDecision = {
  engineVersion: string;
  categoryId?: number;
  /** 어떤 근거로 결정됐는가 */
  source: "explicit" | "category_map" | "default" | "unresolved";
  matchedCategory?: TossShopCategory;
  warnings: string[];
  error?: { code: "MAP_INVALID" | "MISSING"; message: string };
};

export function isCategoryResolved(
  d: CategoryDecision,
): d is CategoryDecision & { categoryId: number } {
  return !d.error && typeof d.categoryId === "number" && d.categoryId > 0;
}

const CategoryIdSchema = z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]);
const CATEGORY_KEYS: TossShopCategory[] = ["food", "beauty", "home", "digital", "fashion", "health"];
// z.record(z.enum(...), ...) requires every enum member as a key (exhaustive record in zod v4).
// 매핑은 부분 지정이 정상(카테고리 6개 중 일부만 넣어도 됨)이라 문자열 키로 받고
// 유효한 카테고리인지는 파싱 후 직접 검증한다.
const CategoryMapSchema = z.record(z.string().min(1), CategoryIdSchema);

type ParsedMap = { ok: true; map: Partial<Record<TossShopCategory, number>> } | { ok: false; message: string };

let mapCache: { raw: string; parsed: ParsedMap } | null = null;

function parseMap(raw: string): ParsedMap {
  if (mapCache && mapCache.raw === raw) return mapCache.parsed;
  let parsed: ParsedMap;
  try {
    const json: unknown = JSON.parse(raw);
    const result = CategoryMapSchema.safeParse(json);
    if (!result.success) {
      const first = result.error.issues[0];
      const at = first?.path.join(".") ?? "";
      parsed = {
        ok: false,
        message: `${at ? `키 "${at}": ` : ""}${first?.message ?? "스키마 검증 실패"} — 키는 food/beauty/home/digital/fashion/health 중 하나, 값은 양의 정수`,
      };
    } else {
      const badKey = Object.keys(result.data).find(
        (k) => !CATEGORY_KEYS.includes(k as TossShopCategory),
      );
      if (badKey) {
        parsed = {
          ok: false,
          message: `키 "${badKey}"는 알 수 없는 카테고리입니다 — food/beauty/home/digital/fashion/health 중 하나여야 합니다`,
        };
      } else {
        const map: Partial<Record<TossShopCategory, number>> = {};
        for (const [k, v] of Object.entries(result.data)) map[k as TossShopCategory] = Number(v);
        parsed = { ok: true, map };
      }
    }
  } catch (e) {
    parsed = { ok: false, message: e instanceof Error ? e.message : "JSON 파싱 실패" };
  }
  mapCache = { raw, parsed };
  return parsed;
}

export function clearCategoryMapCache(): void {
  mapCache = null;
}

function readDefaultCategoryId(): number | undefined {
  const n = Number.parseInt(process.env.TOSS_SHOP_DEFAULT_CATEGORY_ID?.trim() ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function resolveCategoryId(input: {
  category?: TossShopCategory;
  explicitCategoryId?: number;
}): CategoryDecision {
  const warnings: string[] = [];
  const base = { engineVersion: CATEGORY_RESOLVER_VERSION, warnings };

  if (input.explicitCategoryId && input.explicitCategoryId > 0) {
    return { ...base, categoryId: input.explicitCategoryId, source: "explicit" };
  }

  const rawMap = process.env.TOSS_SHOP_CATEGORY_ID_MAP?.trim();
  const defaultId = readDefaultCategoryId();

  if (rawMap) {
    const parsed = parseMap(rawMap);
    if (!parsed.ok) {
      return {
        ...base,
        source: "unresolved",
        error: {
          code: "MAP_INVALID",
          message:
            `TOSS_SHOP_CATEGORY_ID_MAP 파싱 실패 — ${parsed.message}. ` +
            "매핑이 깨진 채로 등록하면 전 상품이 잘못된 카테고리로 등록되므로 차단합니다.",
        },
      };
    }
    if (input.category && parsed.map[input.category]) {
      return {
        ...base,
        categoryId: parsed.map[input.category],
        source: "category_map",
        matchedCategory: input.category,
      };
    }
    if (input.category) {
      warnings.push(`"${input.category}" 카테고리가 매핑에 없어 기본 카테고리로 등록됩니다.`);
    }
  }

  if (defaultId) {
    return { ...base, categoryId: defaultId, source: "default" };
  }

  return {
    ...base,
    source: "unresolved",
    error: {
      code: "MISSING",
      message:
        "토스 카테고리 ID가 없습니다 — TOSS_SHOP_DEFAULT_CATEGORY_ID(기본 1개) 또는 " +
        "TOSS_SHOP_CATEGORY_ID_MAP(카테고리별, 예: {\"food\":123,\"beauty\":456})을 설정하세요.",
    },
  };
}

export function describeCategoryConfig(): {
  defaultId?: number;
  mapEntryCount: number;
  mapValid: boolean;
  mapError?: string;
} {
  const defaultId = readDefaultCategoryId();
  const raw = process.env.TOSS_SHOP_CATEGORY_ID_MAP?.trim();
  if (!raw) return { defaultId, mapEntryCount: 0, mapValid: true };
  const parsed = parseMap(raw);
  return parsed.ok
    ? { defaultId, mapEntryCount: Object.keys(parsed.map).length, mapValid: true }
    : { defaultId, mapEntryCount: 0, mapValid: false, mapError: parsed.message };
}
