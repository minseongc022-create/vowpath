import { NextResponse } from "next/server";
import { updateBookingPriority } from "@/lib/booking-priority-update";
import { normalizeJobPriority } from "@/lib/priority-display";
import { getSession } from "@/lib/session";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { id?: string; priority?: string };
    const id = String(body.id ?? "").trim();
    const priority = normalizeJobPriority(body.priority);

    if (!id) {
      return NextResponse.json({ error: "Request id is required" }, { status: 400 });
    }

    const result = await updateBookingPriority(session.sub, id, priority);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      id,
      priority: result.priority,
      servicePriority: result.servicePriority,
    });
  } catch (e) {
    console.error("[bookings/priority PATCH]", e);
    return NextResponse.json({ error: "Failed to update priority" }, { status: 500 });
  }
}
