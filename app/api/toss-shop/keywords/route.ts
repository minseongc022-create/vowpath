import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import {
  addKeyword,
  analyzeKeywordForMerchant,
  getKeywordHistory,
  getKeywords,
  removeKeyword,
} from "@/toss-shop/lib/store";
import { verifySameOriginRequest } from "@/lib/security/request-guard";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword");
  const analyze = searchParams.get("analyze");

  if (keyword && analyze === "1") {
    const [analysis, history] = await Promise.all([
      analyzeKeywordForMerchant(session.merchantId, keyword),
      getKeywordHistory(keyword),
    ]);
    return NextResponse.json({ analysis, history });
  }

  const keywords = await getKeywords(session.merchantId);
  return NextResponse.json({ keywords });
}

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { keyword?: string; myProductId?: string };
    if (!body.keyword?.trim()) {
      return NextResponse.json({ error: "키워드를 입력해주세요." }, { status: 400 });
    }
    const item = await addKeyword(session.merchantId, body.keyword, body.myProductId);
    const analysis = await analyzeKeywordForMerchant(session.merchantId, body.keyword);
    return NextResponse.json({ item, analysis });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FAILED";
    return NextResponse.json({ error: msg }, { status: msg === "KEYWORD_EXISTS" ? 409 : 500 });
  }
}

export async function DELETE(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await removeKeyword(session.merchantId, id);
  return NextResponse.json({ ok: true });
}
