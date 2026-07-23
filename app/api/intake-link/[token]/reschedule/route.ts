import { NextResponse } from "next/server";
import { requireLinkIntakeSession } from "@/lib/call-intake/link-intake-route-guard";
import {
  customerRescheduleBooking,
  loadCustomerBookingPortalView,
} from "@/lib/customer-booking-portal";
import { guardPublicIntakeRoute } from "@/lib/security/intake-guard";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const guard = await guardPublicIntakeRoute(request, token);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const sessionGuard = await requireLinkIntakeSession(token, { requireCallId: true });
    if (!sessionGuard.ok) {
      return NextResponse.json(
        { error: sessionGuard.error, code: sessionGuard.code },
        { status: sessionGuard.status },
      );
    }
    const session = sessionGuard.session;

    const view = await loadCustomerBookingPortalView({ session, token });
    if (!view?.canReschedule) {
      return NextResponse.json(
        { error: view?.needsSchedule === false ? "Reschedule is not available." : "Scheduling is not available." },
        { status: 400 },
      );
    }

    let slotId = "";
    try {
      const body = await request.json();
      slotId = String(body?.slotId ?? "").trim();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (!slotId) {
      return NextResponse.json({ error: "Pick a visit time." }, { status: 400 });
    }

    const result = await customerRescheduleBooking({
      userId: session.userId,
      bookingId: view.bookingId,
      callId: view.callId,
      slotId,
      customerName: view.customerName,
      urgency: view.urgency,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const updated = await loadCustomerBookingPortalView({ session, token });
    return NextResponse.json({
      ok: true,
      booking: updated,
      arrivalWindow: result.arrivalWindow,
    });
  } catch (e) {
    console.error("[intake-link/reschedule]", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again in a moment." },
      { status: 500 },
    );
  }
}
