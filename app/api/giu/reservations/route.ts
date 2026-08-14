import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { getGiuPublicOrigin } from "@/giu/lib/giu-host";
import { giuPaymentStatus } from "@/giu/lib/payments";
import { createGiuStripeCheckout } from "@/giu/lib/stripe";
import {
  buildVnpayPaymentUrl,
  clientIpFromRequest,
  isGiuPaymentDemo,
} from "@/giu/lib/vnpay";
import { getBox, initiateReservationPayment, listReservations } from "@/giu/lib/store";

const createSchema = z.object({
  boxId: z.string().min(1),
  quantity: z.number().int().min(1).max(5).optional(),
  paymentMethod: z.enum(["momo", "vietqr", "card"]),
});

export async function GET(request: Request) {
  const session = await getGiuSessionFromRequest(request);
  const url = new URL(request.url);
  const merchantId = url.searchParams.get("merchantId") ?? undefined;
  const boxId = url.searchParams.get("boxId") ?? undefined;
  const phone = url.searchParams.get("phone") ?? undefined;

  if (merchantId) {
    if (!session || session.role !== "merchant" || session.merchantId !== merchantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (phone) {
    if (!session || session.phone.replace(/\s/g, "") !== phone.replace(/\s/g, "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (session?.role === "customer") {
    const reservations = await listReservations({ customerId: session.sub });
    return NextResponse.json({ reservations });
  } else if (session?.role === "merchant" && session.merchantId) {
    const reservations = await listReservations({ merchantId: session.merchantId });
    return NextResponse.json({ reservations });
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reservations = await listReservations({ phone, merchantId, boxId });
  return NextResponse.json({ reservations });
}

export async function POST(request: Request) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "customer") {
      return NextResponse.json(
        { error: "구출 및 결제를 위해 로그인해 주세요" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" },
        { status: 400 },
      );
    }

    const origin = getGiuPublicOrigin();
    const ip = clientIpFromRequest(request);

    const result = await initiateReservationPayment({
      boxId: parsed.data.boxId,
      customerId: session.sub,
      customerName: session.name,
      customerPhone: session.phone,
      paymentMethod: parsed.data.paymentMethod,
      quantity: parsed.data.quantity,
      paymentUrlBuilder: (reservation, totalVnd) =>
        buildVnpayPaymentUrl({
          amountVnd: totalVnd,
          txnRef: reservation.id,
          orderInfo: `Giu 구출 ${reservation.code}`,
          ipAddr: ip,
          returnUrl: `${origin}/api/giu/payments/vnpay/return`,
        }),
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const paymentMeta = giuPaymentStatus();

    if (result.mode === "demo") {
      return NextResponse.json(
        {
          mode: "demo",
          id: result.reservation.id,
          code: result.reservation.code,
          reservation: result.reservation,
          payment: paymentMeta,
          demo: isGiuPaymentDemo(),
        },
        { status: 201 },
      );
    }

    if (result.mode === "stripe") {
      const box = (await getBox(result.box.id)) ?? result.box;
      const checkout = await createGiuStripeCheckout({
        reservationId: result.reservation.id,
        code: result.reservation.code,
        boxTitle: box.title,
        amountVnd: result.reservation.totalVnd,
        customerEmail: session.email,
        successUrl: `${origin}/api/giu/payments/stripe/return?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/hop?pay=cancelled&ref=${result.reservation.id}`,
      });

      return NextResponse.json(
        {
          mode: "stripe",
          id: result.reservation.id,
          paymentUrl: checkout.url,
          reservation: result.reservation,
          payment: paymentMeta,
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        mode: "vnpay",
        id: result.reservation.id,
        paymentUrl: result.paymentUrl,
        reservation: result.reservation,
        payment: paymentMeta,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[giu/reservations] POST failed", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
