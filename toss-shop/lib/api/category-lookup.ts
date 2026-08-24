/**
 * 토스 카테고리 조회 API — 실제 토스 카테고리 트리를 셀러 계정으로 조회한다
 *
 * GET /api/v3/shopping-fep/products/categories/children?id={부모ID}
 * (id 생략 시 최상위 카테고리를 반환하는 것으로 보인다 — 공개 문서 색인 기준,
 * 실제 응답으로 검증되지 않았으니 아래 필드 판독은 방어적으로 짠다.)
 *
 * ⚠️ 이 조회가 있어도 "자비스가 알아서 카테고리를 정한다"는 여전히 안 된다.
 * 이 API는 토스의 카테고리 **트리를 보여줄 뿐**, 이 상품이 그중 어디에
 * 속하는지는 결정해주지 않는다. 즉 "숫자를 찾아 헤매는 것"은 없앨 수 있지만
 * (효피로드 화면에서 바로 검색·클릭), "이 카테고리가 맞다"는 판단은 여전히
 * 사람이 한 번 확인해야 한다 — 잘못된 리프 카테고리로 등록하면 노출 저하다.
 *
 * 응답 필드명이 공식 문서로 확인되지 않아, id/name/isLeaf 후보 필드를
 * 여러 개 시도하는 방어적 판독을 쓴다(supplier-quality.ts와 같은 패턴).
 * 실제 응답을 한 번 받아보면 이 후보 목록을 정확한 필드명으로 좁혀야 한다.
 */

import { tossApiGet } from "./client";
import type { TossApiConfig } from "./config";

export type TossCategoryNode = {
  id: number;
  name: string;
  isLeaf: boolean;
  /** 판독에 실패한 원본 — 필드명 확정 전까지 디버깅용으로 함께 반환 */
  raw: unknown;
};

const ID_FIELDS = ["id", "categoryId", "code"];
const NAME_FIELDS = ["name", "categoryName", "label"];
const LEAF_FIELDS = ["isLeaf", "leaf", "hasChildren"];

function pick(obj: Record<string, unknown>, fields: string[]): unknown {
  for (const f of fields) if (obj[f] !== undefined) return obj[f];
  return undefined;
}

function readNode(raw: unknown): TossCategoryNode | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id = pick(obj, ID_FIELDS);
  const name = pick(obj, NAME_FIELDS);
  if (typeof id !== "number" && typeof id !== "string") return null;
  const numId = Number(id);
  if (!Number.isFinite(numId)) return null;

  // isLeaf/leaf는 참이면 리프, hasChildren은 의미가 반대(false면 리프)이므로 뒤집는다.
  // 셋 다 없으면 판독 불가 — 안전하게 "리프 아님"으로 두어 등록에 잘못 쓰이지 않게 한다.
  const isLeaf =
    obj.isLeaf === true || obj.leaf === true || obj.hasChildren === false;

  return { id: numId, name: typeof name === "string" ? name : String(id), isLeaf, raw };
}

/**
 * parentId 생략 시 최상위 카테고리, 지정 시 그 하위 카테고리를 반환한다.
 * 응답 배열 위치를 추측해서 찾는다(공식 필드명 미확인) — items/children/list/data
 * 등 흔한 래퍼 이름을 순서대로 시도하고, 안 맞으면 최상위가 배열인 경우도 받는다.
 */
export async function listTossCategories(
  merchantId: string,
  config: TossApiConfig,
  parentId?: number,
): Promise<{ nodes: TossCategoryNode[]; rawResponse: unknown }> {
  const res = await tossApiGet<unknown>(
    merchantId,
    config,
    "/api/v3/shopping-fep/products/categories/children",
    parentId !== undefined ? { id: parentId } : undefined,
  );

  if (res.resultType === "FAIL") {
    throw new Error(res.error?.reason ?? res.error?.errorCode ?? "CATEGORY_LOOKUP_FAIL");
  }

  const success = res.success as Record<string, unknown> | unknown[] | undefined;
  let list: unknown[] = [];
  if (Array.isArray(success)) {
    list = success;
  } else if (success && typeof success === "object") {
    const wrapperKeys = ["items", "children", "categories", "list", "data"];
    for (const k of wrapperKeys) {
      const v = (success as Record<string, unknown>)[k];
      if (Array.isArray(v)) {
        list = v;
        break;
      }
    }
  }

  const nodes = list.map(readNode).filter((n): n is TossCategoryNode => n !== null);
  return { nodes, rawResponse: res.success };
}
