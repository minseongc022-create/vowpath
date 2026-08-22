import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import {
  createListingDraftFromPick,
  listListingDraftsForMerchant,
} from "@/toss-shop/lib/store";
import { LISTING_AUTOMATION_VERSION } from "@/toss-shop/lib/seller-engine/listing-automation";
import { MATCHCUT_ADAPTER_VERSION } from "@/toss-shop/lib/seller-engine/matchcut-adapter";
import { DETAIL_PAGE_ENGINE_VERSION } from "@/toss-shop/lib/seller-engine/detail-page-engine";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const drafts = await listListingDraftsForMerchant(session.merchantId);
  return NextResponse.json({
    drafts,
    listingAutomationVersion: LISTING_AUTOMATION_VERSION,
    detailPageEngineVersion: DETAIL_PAGE_ENGINE_VERSION,
    matchcutAdapterVersion: MATCHCUT_ADAPTER_VERSION,
    message: "Jarvis 등록 초안 — OK 사인 후 publish",
  });
}

export async function POST(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const body = (await request.json()) as {
    pickId?: string;
    mode?: "consignment" | "import";
  };

  if (!body.pickId || !body.mode) {
    return NextResponse.json({ error: "pickId and mode required" }, { status: 400 });
  }

  try {
    const draft = await createListingDraftFromPick({
      merchantId: session.merchantId,
      pickId: body.pickId,
      mode: body.mode,
    });
    return NextResponse.json({ draft });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "CREATE_DRAFT_FAIL";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
