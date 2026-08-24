/**
 * 토스 교환·반품지 조회 API — 셀러 계정에 이미 등록된 반품지 목록을 가져온다
 *
 * GET /api/v3/shopping-fep/merchants/group-delivery/exchange-refund-location/v2
 * 응답 항목의 id를 그대로 exchangeReturnPolicy.exchangeRefundLocationId로 쓴다.
 *
 * ⚠️ 이 조회로 "반품지를 찾는 것"은 없앨 수 있지만 "반품지를 만드는 것"은
 * 여전히 토스 셀러센터에서 사람이 해야 한다. 이 API는 이미 등록된 걸
 * 읽어올 뿐, 새 주소를 등록해주지 않는다. 그리고 등록된 게 하나뿐이면
 * 공급처별로 다르게 쓸 선택지 자체가 없다 — 여러 개를 실제로 등록해둬야
 * 공급처별 자동 라우팅(exchange-return-location.ts)이 의미가 있다.
 *
 * 응답 필드명이 공식 문서로 확인되지 않아 방어적으로 판독한다
 * (category-lookup.ts와 동일한 패턴).
 */

import { tossApiGet } from "./client";
import type { TossApiConfig } from "./config";

export type TossReturnLocation = {
  id: number;
  name: string;
  address?: string;
  raw: unknown;
};

const ID_FIELDS = ["id", "locationId", "exchangeRefundLocationId"];
const NAME_FIELDS = ["name", "locationName", "label", "title"];
const ADDRESS_FIELDS = ["address", "addr", "fullAddress", "roadAddress"];

function pick(obj: Record<string, unknown>, fields: string[]): unknown {
  for (const f of fields) if (obj[f] !== undefined) return obj[f];
  return undefined;
}

function readLocation(raw: unknown): TossReturnLocation | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id = pick(obj, ID_FIELDS);
  if (typeof id !== "number" && typeof id !== "string") return null;
  const numId = Number(id);
  if (!Number.isFinite(numId)) return null;

  const name = pick(obj, NAME_FIELDS);
  const address = pick(obj, ADDRESS_FIELDS);
  return {
    id: numId,
    name: typeof name === "string" ? name : `반품지 #${numId}`,
    address: typeof address === "string" ? address : undefined,
    raw,
  };
}

export async function listTossReturnLocations(
  merchantId: string,
  config: TossApiConfig,
): Promise<{ locations: TossReturnLocation[]; rawResponse: unknown }> {
  const res = await tossApiGet<unknown>(
    merchantId,
    config,
    "/api/v3/shopping-fep/merchants/group-delivery/exchange-refund-location/v2",
  );

  if (res.resultType === "FAIL") {
    throw new Error(res.error?.reason ?? res.error?.errorCode ?? "RETURN_LOCATION_LOOKUP_FAIL");
  }

  const success = res.success as Record<string, unknown> | unknown[] | undefined;
  let list: unknown[] = [];
  if (Array.isArray(success)) {
    list = success;
  } else if (success && typeof success === "object") {
    const wrapperKeys = ["items", "locations", "list", "data"];
    for (const k of wrapperKeys) {
      const v = (success as Record<string, unknown>)[k];
      if (Array.isArray(v)) {
        list = v;
        break;
      }
    }
  }

  const locations = list.map(readLocation).filter((l): l is TossReturnLocation => l !== null);
  return { locations, rawResponse: res.success };
}
