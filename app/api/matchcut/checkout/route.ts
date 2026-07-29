import { NextResponse } from "next/server";
import { createMatchCutCheckout } from "@/lib/matchcut/billing";
import { grantCredits, getCreditBalance } from "@/lib/matchcut/credits-store";
import { packById, type CreditPackId } from "@/lib/matchcut/constants";
import { requireMatchCutSession } from "@/lib/matchcut/session";

export async function POST(request: Request) {
  try {
    const session = await requireMatchCutSession();
    const body = await request.json();
    const packId = String(body.packId ?? "") as CreditPackId;
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

    // Dev instant grant when LS not configured
    if (body.devGrant === true) {
      if (
        process.env.NODE_ENV === "production" &&
        process.env.MATCHCUT_DEV_CHECKOUT !== "1"
      ) {
        return NextResponse.json({ error: "Not allowed" }, { status: 403 });
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
        mode: "dev",
        message: `[DEV] ${pack.name} ${pack.credits}크레딧 충전됨`,
        credits: {
          total: wallet.subscriptionCredits + wallet.permanentCredits,
          subscriptionCredits: wallet.subscriptionCredits,
          permanentCredits: wallet.permanentCredits,
        },
      });
    }

    const checkout = await createMatchCutCheckout({
      packId: pack.id,
      userId: session.sub,
      email: session.email,
      name: session.displayName,
    });

    if (checkout.mode === "dev") {
      const kind = pack.type === "subscription" ? "subscription" : "permanent";
      const wallet = await grantCredits(
        session.sub,
        pack.credits,
        kind,
        pack.type === "subscription" ? pack.id : null,
      );
      return NextResponse.json({
        ok: true,
        mode: "dev",
        message: `[DEV] ${pack.name} ${pack.credits}크레딧 충전됨 (LS 미설정)`,
        credits: {
          total: wallet.subscriptionCredits + wallet.permanentCredits,
          subscriptionCredits: wallet.subscriptionCredits,
          permanentCredits: wallet.permanentCredits,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      mode: "live",
      checkoutUrl: checkout.url,
      checkoutId: checkout.checkoutId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "CHECKOUT_FAILED";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (msg === "CHECKOUT_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "결제가 아직 설정되지 않았습니다. hello@matchcut.kr 로 문의해 주세요." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
