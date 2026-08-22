import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import { rejectListingDraft } from "@/toss-shop/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { reason?: string };

  const draft = await rejectListingDraft({
    merchantId: session.merchantId,
    draftId: id,
    reason: body.reason,
  });

  return NextResponse.json({ draft });
}
