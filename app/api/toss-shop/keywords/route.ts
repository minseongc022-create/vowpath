import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { getAccountAccess, keywordLimitResponse } from "@/toss-shop/lib/billing-access";
import { FREE_DAILY_KEYWORD_LIMIT } from "@/toss-shop/lib/billing";
import {
  addKeyword,
  analyzeKeywordForMerchant,
  getKeywordHistory,
  getKeywordUsageToday,
  getKeywords,
  recordKeywordAnalysis,
  removeKeyword,
} from "@/toss-shop/lib/store";
import { verifySameOriginRequest } from "@/lib/security/request-guard";

async function guardKeywordAnalyze(accountId: string) {
  const { account, access } = await getAccountAccess(accountId);
  if (!account || !access) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (access.fullAccess) {
    await recordKeywordAnalysis(accountId);
    return { ok: true as const };
  }
  const used = await getKeywordUsageToday(accountId);
  if (used >= FREE_DAILY_KEYWORD_LIMIT) {
    return { ok: false as const, response: keywordLimitResponse(used, FREE_DAILY_KEYWORD_LIMIT) };
  }
  await recordKeywordAnalysis(accountId);
  return { ok: true as const, used: used + 1, limit: FREE_DAILY_KEYWORD_LIMIT };
}

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword");
  const analyze = searchParams.get("analyze");

  if (keyword && analyze === "1") {
    const gate = await guardKeywordAnalyze(session.sub);
    if (!gate.ok) return gate.response;

    const [analysis, history] = await Promise.all([
      analyzeKeywordForMerchant(session.merchantId, keyword),
      getKeywordHistory(keyword),
    ]);
    const { access } = await getAccountAccess(session.sub);
    return NextResponse.json({
      analysis,
      history,
      usage: access?.fullAccess
        ? null
        : {
            used: gate.used,
            limit: gate.limit,
          },
    });
  }

  const keywords = await getKeywords(session.merchantId);
  const { access } = await getAccountAccess(session.sub);
  const used = access?.fullAccess ? null : await getKeywordUsageToday(session.sub);
  return NextResponse.json({
    keywords,
    usage: access?.fullAccess ? null : { used, limit: FREE_DAILY_KEYWORD_LIMIT },
  });
}

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gate = await guardKeywordAnalyze(session.sub);
  if (!gate.ok) return gate.response;

  try {
    const body = (await request.json()) as { keyword?: string; myProductId?: string };
    if (!body.keyword?.trim()) {
      return NextResponse.json({ error: "키워드를 입력해주세요." }, { status: 400 });
    }
    const item = await addKeyword(session.merchantId, body.keyword, body.myProductId);
    const analysis = await analyzeKeywordForMerchant(session.merchantId, body.keyword);
    return NextResponse.json({ item, analysis, usage: gate.used ? { used: gate.used, limit: gate.limit } : null });
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
