import { NextResponse } from "next/server";
import {
  notifyCustomerOnMyWay,
  ON_MY_WAY_ETA_OPTIONS,
  type OnMyWayEtaMinutes,
} from "@/lib/tech-dispatch/on-my-way";
import { getSession } from "@/lib/session";
import { verifySameOriginRequest } from "@/lib/security/request-guard";

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      bookingId?: string;
      etaMinutes?: number;
      techName?: string;
      customerName?: string;
      customerPhone?: string;
    };

    const bookingId = body.bookingId?.trim();
    const etaMinutes = body.etaMinutes;
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }
    if (
      typeof etaMinutes !== "number" ||
      !ON_MY_WAY_ETA_OPTIONS.includes(etaMinutes as OnMyWayEtaMinutes)
    ) {
      return NextResponse.json(
        { error: `etaMinutes must be one of: ${ON_MY_WAY_ETA_OPTIONS.join(", ")}` },
        { status: 400 },
      );
    }

    const result = await notifyCustomerOnMyWay({
      userId: session.sub,
      bookingId,
      etaMinutes: etaMinutes as OnMyWayEtaMinutes,
      techName: body.techName,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "SMS failed" }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      customerPhone: result.customerPhone,
      etaMinutes,
    });
  } catch (e) {
    console.error("[bookings/on-my-way]", e);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
