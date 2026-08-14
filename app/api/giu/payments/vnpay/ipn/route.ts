import { NextResponse } from "next/server";
import { verifyVnpayCallback } from "@/giu/lib/vnpay";
import { confirmReservationPayment, getReservation } from "@/giu/lib/store";

function queryToRecord(url: URL): Record<string, string> {
  const out: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

/** VNPay IPN (server-to-server) — must return 200 with plain text. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = queryToRecord(url);
  const result = verifyVnpayCallback(params);

  if (!result.valid || !result.txnRef) {
    return new NextResponse("INVALID", { status: 200 });
  }

  if (!result.success) {
    return new NextResponse("FAILED", { status: 200 });
  }

  const reservation = await getReservation(result.txnRef);
  if (!reservation) {
    return new NextResponse("NOT_FOUND", { status: 200 });
  }

  if (reservation.totalVnd !== result.amountVnd) {
    return new NextResponse("AMOUNT_MISMATCH", { status: 200 });
  }

  if (reservation.paymentStatus === "paid") {
    return new NextResponse("OK", { status: 200 });
  }

  const confirmed = await confirmReservationPayment(
    result.txnRef,
    result.transactionNo ?? `vnpay_${Date.now()}`,
  );

  return new NextResponse(confirmed ? "OK" : "CONFIRM_FAILED", { status: 200 });
}
