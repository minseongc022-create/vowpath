import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import { approveListingDraft } from "@/toss-shop/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const { id } = await params;
  const draft = await approveListingDraft({
    merchantId: session.merchantId,
    draftId: id,
    approvedBy: session.sub,
  });

  return NextResponse.json({
    draft,
    message: "Jarvis OK 사인 완료 — 이제 토스 등록(publish) 가능",
  });
}
