import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import { executeJarvisListing } from "@/toss-shop/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    categoryId?: number;
    exchangeReturnLocationId?: number;
  };

  try {
    const draft = await executeJarvisListing({
      merchantId: session.merchantId,
      draftId: id,
      approvedBy: session.sub,
      categoryId: body.categoryId,
      exchangeReturnLocationId: body.exchangeReturnLocationId,
    });

    const orderMsg =
      draft.consignmentOrder?.status === "ordered"
        ? " · 위탁 발주 기록 완료"
        : draft.consignmentOrder?.status === "skipped"
          ? " · 수입(발주 수동)"
          : draft.consignmentOrder?.status === "ready"
            ? " · 발주 URL 준비"
            : "";

    const publishMsg =
      draft.status === "published"
        ? `토스 등록 완료${draft.tossProductId ? ` (ID ${draft.tossProductId})` : ""}`
        : draft.publishError
          ? `토스 등록 대기 — ${draft.publishError}`
          : "실행 완료";

    return NextResponse.json({
      draft,
      message: `${publishMsg}${orderMsg}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "EXECUTE_FAIL";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
