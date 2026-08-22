import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import { publishApprovedListingDraft } from "@/toss-shop/lib/store";

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
    const draft = await publishApprovedListingDraft({
      merchantId: session.merchantId,
      draftId: id,
      categoryId: body.categoryId,
      exchangeReturnLocationId: body.exchangeReturnLocationId,
    });
    return NextResponse.json({ draft });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PUBLISH_FAIL";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
