import { NextResponse } from "next/server";
import { verifyBookingBelongsToTenant } from "@/lib/booking-ownership";
import { getSession } from "@/lib/session";
import { listTenantEvents } from "@/lib/tenant-events";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const owned = await verifyBookingBelongsToTenant(session.sub, id);
    if (!owned) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const since = new Date(Date.now() - 365 * 86_400_000).toISOString();
    const events = (await listTenantEvents(session.sub, { since, limit: 500 })).filter(
      (event) => event.bookingId === id,
    );
    return NextResponse.json({ ok: true, events });
  } catch (e) {
    console.error("[bookings/timeline]", e);
    return NextResponse.json({ events: [] }, { status: 500 });
  }
}
