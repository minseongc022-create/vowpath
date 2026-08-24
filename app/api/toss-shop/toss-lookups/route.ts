import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { getAccount, getMerchant } from "@/toss-shop/lib/store";
import { resolveApiConfig } from "@/toss-shop/lib/api/client";
import { listTossCategories } from "@/toss-shop/lib/api/category-lookup";
import { listTossReturnLocations } from "@/toss-shop/lib/api/return-location-lookup";

/**
 * 토스에 이미 등록된 카테고리 트리 / 반품지 목록을 실시간 조회한다.
 *
 * ?type=categories&parentId=123  — 카테고리 하위 목록 (parentId 생략 시 최상위)
 * ?type=return-locations         — 등록된 반품지 목록
 *
 * 이 값들을 TOSS_SHOP_CATEGORY_ID_MAP / TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP에
 * 넣을 실제 ID를 찾는 데 쓴다. 토스 셀러센터를 따로 열 필요 없이 여기서
 * 바로 확인할 수 있다 — 단, 어떤 값이 맞는지 최종 확인은 사람이 한다.
 */
export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [merchant, account] = await Promise.all([
    getMerchant(session.merchantId),
    getAccount(session.sub),
  ]);
  if (!merchant || !account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const config = await resolveApiConfig(
    session.merchantId,
    {
      accessKey: merchant.apiAccessKey,
      secretKey: merchant.apiSecretKey,
      sandbox: merchant.apiSandbox,
    },
    account.email,
  );
  if (!config) {
    return NextResponse.json(
      { error: "토스 API 미연동 — 설정 → API 연동에서 키 등록 필요" },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  try {
    if (type === "categories") {
      const parentIdRaw = url.searchParams.get("parentId");
      const parentId = parentIdRaw ? Number.parseInt(parentIdRaw, 10) : undefined;
      const { nodes } = await listTossCategories(session.merchantId, config, parentId);
      return NextResponse.json({ nodes });
    }
    if (type === "return-locations") {
      const { locations } = await listTossReturnLocations(session.merchantId, config);
      return NextResponse.json({ locations });
    }
    return NextResponse.json({ error: "type은 categories 또는 return-locations" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "TOSS_LOOKUP_FAILED" },
      { status: 502 },
    );
  }
}
