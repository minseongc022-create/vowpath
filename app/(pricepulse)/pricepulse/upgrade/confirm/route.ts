import { NextResponse } from "next/server";
import { confirmTossPayment } from "@/giu/lib/toss-payments";
import { getCurrentSeller } from "@/pricepulse/lib/dashboard/auth.ts";
import { getPayment, markPaidAndUpgrade } from "@/pricepulse/lib/dashboard/payments-db.ts";

/** Toss successUrl. Mirrors app/api/giu/payments/toss/confirm/route.ts's verify-then-confirm shape. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentKey = url.searchParams.get("paymentKey")?.trim();
  const orderId = url.searchParams.get("orderId")?.trim();
  const amountRaw = url.searchParams.get("amount")?.trim();

  const fail = (message: string) => {
    const target = new URL("/pricepulse/upgrade", request.url);
    target.searchParams.set("error", encodeURIComponent(message));
    return NextResponse.redirect(target);
  };

  if (!paymentKey || !orderId || !amountRaw) return fail("결제 정보가 올바르지 않습니다");
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return fail("결제 금액이 올바르지 않습니다");

  const seller = await getCurrentSeller();
  if (!seller) return NextResponse.redirect(new URL("/pricepulse/login", request.url));

  const order = await getPayment(orderId);
  if (!order || order.sellerId !== seller.sellerId) return fail("주문 정보를 찾을 수 없습니다");
  if (order.status === "paid") {
    return NextResponse.redirect(new URL("/pricepulse/upgrade?upgraded=1", request.url));
  }
  if (order.amount !== amount) return fail("결제 금액이 일치하지 않습니다");

  const result = await confirmTossPayment({ paymentKey, orderId, amount });
  if (!result.ok) return fail(result.error);

  await markPaidAndUpgrade(orderId, paymentKey, seller.sellerId);
  return NextResponse.redirect(new URL("/pricepulse/upgrade?upgraded=1", request.url));
}
