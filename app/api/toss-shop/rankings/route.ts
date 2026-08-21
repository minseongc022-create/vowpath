import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import {
  getPriceHistory,
  getRankings,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "@/toss-shop/lib/store";
import { verifySameOriginRequest } from "@/lib/security/request-guard";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  const productId = searchParams.get("productId");

  if (productId) {
    const history = await getPriceHistory(productId);
    return NextResponse.json({ history });
  }

  const [rankings, watchlist] = await Promise.all([
    getRankings(category),
    getWatchlist(session.merchantId),
  ]);

  const watchlistWithProducts = watchlist.map((w) => {
    const product = rankings.find((p) => p.id === w.productId);
    return { ...w, product };
  });

  return NextResponse.json({ rankings, watchlist: watchlistWithProducts });
}

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      productId?: string;
      alertPriceDropPct?: number;
      alertRankUp?: number;
    };
    if (!body.productId) {
      return NextResponse.json({ error: "상품 ID가 필요합니다." }, { status: 400 });
    }
    const item = await addToWatchlist(session.merchantId, body.productId, {
      alertPriceDropPct: body.alertPriceDropPct,
      alertRankUp: body.alertRankUp,
    });
    return NextResponse.json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FAILED";
    const status = msg === "ALREADY_WATCHING" ? 409 : msg === "PRODUCT_NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
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

  await removeFromWatchlist(session.merchantId, id);
  return NextResponse.json({ ok: true });
}
