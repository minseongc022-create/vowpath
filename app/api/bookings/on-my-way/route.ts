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
      departing?: boolean;
      techName?: string;
      customerName?: string;
      customerPhone?: string;
    };

    const bookingId = body.bookingId?.trim();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const departing = body.departing === true || body.etaMinutes == null;
    let etaMinutes: OnMyWayEtaMinutes | null = null;
    if (!departing) {
      if (
        typeof body.etaMinutes !== "number" ||
        !ON_MY_WAY_ETA_OPTIONS.includes(body.etaMinutes as OnMyWayEtaMinutes)
      ) {
        return NextResponse.json(
          { error: `etaMinutes must be one of: ${ON_MY_WAY_ETA_OPTIONS.join(", ")}` },
          { status: 400 },
        );
      }
      etaMinutes = body.etaMinutes as OnMyWayEtaMinutes;
    }

    const result = await notifyCustomerOnMyWay({
      userId: session.sub,
      bookingId,
      etaMinutes,
      departed: departing,
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
      departing,
      etaMinutes,
    });
  } catch (e) {
    console.error("[bookings/on-my-way]", e);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
