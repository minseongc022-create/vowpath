import { NextResponse } from "next/server";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import { requireLinkIntakeSession } from "@/lib/call-intake/link-intake-route-guard";
import { loadCustomerBookingPortalView } from "@/lib/customer-booking-portal";
import { guardPublicIntakeRoute } from "@/lib/security/intake-guard";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const guard = await guardPublicIntakeRoute(request, token);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const sessionGuard = await requireLinkIntakeSession(token);
  if (!sessionGuard.ok) {
    return NextResponse.json(
      { error: sessionGuard.error, code: sessionGuard.code },
      { status: sessionGuard.status },
    );
  }
  const session = sessionGuard.session;

  if (!session.callId) {
    return NextResponse.json(
      { error: "Complete your request first or use lookup." },
      { status: 403 },
    );
  }

  const booking = await loadCustomerBookingPortalView({ session, token });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const shopName = await shopDisplayNameForUser(session.userId);
  return NextResponse.json({ booking, shopName });
}
