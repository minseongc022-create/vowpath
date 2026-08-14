import { NextResponse } from "next/server";
import { getGiuPublicOrigin } from "@/giu/lib/giu-host";
import { verifyVnpayCallback } from "@/giu/lib/vnpay";
import { confirmReservationPayment, getReservation } from "@/giu/lib/store";

function queryToRecord(url: URL): Record<string, string> {
  const out: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

async function handleVnpaySuccess(txnRef: string, transactionNo?: string) {
  const reservation = await getReservation(txnRef);
  if (!reservation) return { ok: false as const, reason: "not_found" };
  if (reservation.paymentStatus === "paid") {
    return { ok: true as const, reservation, alreadyPaid: true };
  }
  const confirmed = await confirmReservationPayment(
    txnRef,
    transactionNo ?? `vnpay_${Date.now()}`,
  );
  if (!confirmed) return { ok: false as const, reason: "confirm_failed" };
  return { ok: true as const, reservation: confirmed, alreadyPaid: false };
}

/** VNPay browser return — redirect customer to pickup code page. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = queryToRecord(url);
  const result = verifyVnpayCallback(params);
  const origin = getGiuPublicOrigin();

  if (!result.valid || !result.txnRef) {
    return NextResponse.redirect(`${origin}/hop?pay=invalid`);
  }

  if (!result.success) {
    return NextResponse.redirect(`${origin}/hop?pay=failed&ref=${result.txnRef}`);
  }

  const reservation = await getReservation(result.txnRef);
  if (reservation && reservation.totalVnd !== result.amountVnd) {
    return NextResponse.redirect(`${origin}/hop?pay=amount_mismatch`);
  }

  const handled = await handleVnpaySuccess(result.txnRef, result.transactionNo);
  if (!handled.ok) {
    return NextResponse.redirect(`${origin}/hop?pay=error`);
  }

  return NextResponse.redirect(`${origin}/dat/${handled.reservation.id}?paid=1`);
}
