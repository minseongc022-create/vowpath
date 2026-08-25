import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { getAccount, getMerchant } from "@/toss-shop/lib/store";
import { isOwnerEmail } from "@/toss-shop/lib/billing";
import { getAccessToken, resolveApiConfig } from "@/toss-shop/lib/api/client";
import { tossApiBaseUrl } from "@/toss-shop/lib/api/config";
import { tossFetch } from "@/toss-shop/lib/api/toss-proxy-fetch";
import { listTossReturnLocations } from "@/toss-shop/lib/api/return-location-lookup";
import { fetchSupplierDetail } from "@/toss-shop/lib/wholesale/domeggook-detail";

/**
 * 자비스 실측 진단 — 문서로 확인되지 않는 API 스키마를 **실제 응답으로** 확인한다.
 *
 * 이 프로젝트에는 문서가 닫혀 있어 추측할 수밖에 없는 지점이 두 곳 있다.
 * 추측한 채로 코드를 굳히면, 스키마가 조금만 달라도 조용히 빈 값이 되고
 * 그 순간 전 상품이 잘못된 반품지로 등록된다. 그래서 추측 대신 여기서 찍어본다.
 *
 *  ?type=return-location-write  — 토스에 반품지 **등록(POST)** 이 되는지 확인.
 *                                 405면 지원 안 함(사람이 셀러센터에서 등록),
 *                                 400/422면 지원함(스키마만 맞추면 완전 자동 가능).
 *  ?type=return-location-raw    — 반품지 조회 원문. 주소가 어느 필드로 오는지 확인.
 *  ?type=supplier-detail&no=123 — 도매꾹 상세 응답에서 주소가 어느 경로로 잡히는지 확인.
 *
 * 오너 전용이다 — 실제 계정에 요청을 보내는 진단이므로 남에게 열어두지 않는다.
 */

const ENDPOINT = "/api/v3/shopping-fep/merchants/group-delivery/exchange-refund-location/v2";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [merchant, account] = await Promise.all([
    getMerchant(session.merchantId),
    getAccount(session.sub),
  ]);
  if (!merchant || !account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isOwnerEmail(account.email)) {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  // 도매꾹 상세는 토스 연동 없이도 확인할 수 있다
  if (type === "supplier-detail") {
    const no = Number.parseInt(url.searchParams.get("no") ?? "", 10);
    if (!Number.isFinite(no)) {
      return NextResponse.json({ error: "no(상품번호) 필요" }, { status: 400 });
    }
    const detail = await fetchSupplierDetail(no, "domeme");
    return NextResponse.json({ detail });
  }

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
    return NextResponse.json({ error: "토스 API 미연동" }, { status: 400 });
  }

  try {
    if (type === "return-location-raw") {
      const { locations, rawResponse } = await listTossReturnLocations(session.merchantId, config);
      return NextResponse.json({ locations, rawResponse });
    }

    if (type === "return-location-write") {
      // ⚠️ 의도적으로 **빈 본문**을 보낸다. 목적은 "이 경로가 POST를 받는가"만
      // 확인하는 것이지 실제로 반품지를 만드는 게 아니다. 유효한 본문을 추측해서
      // 보내면 실제 계정에 잘못된 반품지가 영구 생성될 수 있다.
      //  · 405 Method Not Allowed → 등록 API 없음
      //  · 400/422 (검증 실패)     → 등록 API 있음. 스키마만 맞추면 완전 자동 가능
      const token = await getAccessToken(session.merchantId, config);
      const probeUrl = new URL(ENDPOINT, tossApiBaseUrl(config.sandbox));
      probeUrl.searchParams.set("partnerName", config.partnerName);
      const res = await tossFetch(probeUrl.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        cache: "no-store",
      });
      const text = await res.text();
      return NextResponse.json({
        status: res.status,
        supportsWrite: res.status !== 404 && res.status !== 405,
        verdict:
          res.status === 405 || res.status === 404
            ? "등록 API 없음 — 반품지는 셀러센터에서 사람이 만들어야 함"
            : "등록 API 있음 — 응답 본문의 검증 오류로 필수 필드를 확인할 것",
        body: text.slice(0, 4000),
      });
    }

    return NextResponse.json(
      { error: "type은 return-location-write | return-location-raw | supplier-detail" },
      { status: 400 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PROBE_FAILED" },
      { status: 502 },
    );
  }
}
