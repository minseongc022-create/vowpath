import { NextResponse } from "next/server";
import { resolveBookingDetailForTenant } from "@/lib/booking-resolve";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const detail = await resolveBookingDetailForTenant(session.sub, id);
    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, detail });
  } catch (e) {
    console.error("[bookings/lookup]", e);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
