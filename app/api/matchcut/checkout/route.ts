import { NextResponse } from "next/server";
import { grantCredits, getCreditBalance } from "@/lib/matchcut/credits-store";
import { packById } from "@/lib/matchcut/constants";
import { requireMatchCutSession } from "@/lib/matchcut/session";

function devCheckoutEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.MATCHCUT_DEV_CHECKOUT === "1"
  );
}

/** MVP: dev/mock checkout. Production → Lemon Squeezy webhook 연동 예정 */
export async function POST(request: Request) {
  try {
    if (!devCheckoutEnabled()) {
      return NextResponse.json(
        { error: "결제는 곧 오픈됩니다. 문의: hello@matchcut.kr" },
        { status: 503 },
      );
    }

    const session = await requireMatchCutSession();
    const body = await request.json();
    const packId = String(body.packId ?? "");
    const pack = packById(packId);
    if (!pack || pack.id === "welcome") {
      return NextResponse.json({ error: "유효하지 않은 상품입니다." }, { status: 400 });
    }

    if (pack.type === "topup") {
      const balance = await getCreditBalance(session.sub);
      if (!balance.subscriptionPlan) {
        return NextResponse.json(
          { error: "추가 충전은 구독 회원만 구매할 수 있습니다." },
          { status: 403 },
        );
      }
    }

    const kind = pack.type === "subscription" ? "subscription" : "permanent";
    const wallet = await grantCredits(
      session.sub,
      pack.credits,
      kind,
      pack.type === "subscription" ? pack.id : null,
    );

    return NextResponse.json({
      ok: true,
      mock: true,
      message: `[DEV] ${pack.name} ${pack.credits}크레딧 충전됨`,
      credits: {
        total: wallet.subscriptionCredits + wallet.permanentCredits,
        subscriptionCredits: wallet.subscriptionCredits,
        permanentCredits: wallet.permanentCredits,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "CHECKOUT_FAILED";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
