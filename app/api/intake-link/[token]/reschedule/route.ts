import { NextResponse } from "next/server";
import {
  getLinkIntakeSession,
  isLinkIntakeSessionExpired,
} from "@/lib/call-intake/link-intake-store";
import {
  customerRescheduleBooking,
  loadCustomerBookingPortalView,
} from "@/lib/customer-booking-portal";
import { guardPublicIntakeRoute } from "@/lib/security/intake-guard";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const guard = await guardPublicIntakeRoute(request, token);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const session = await getLinkIntakeSession(token);
  if (!session || isLinkIntakeSessionExpired(session) || !session.callId) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  const view = await loadCustomerBookingPortalView({ session, token });
  if (!view?.canReschedule) {
    return NextResponse.json({ error: "Reschedule is not available." }, { status: 400 });
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
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const updated = await loadCustomerBookingPortalView({ session, token });
  return NextResponse.json({ ok: true, booking: updated, arrivalWindow: result.arrivalWindow });
}
