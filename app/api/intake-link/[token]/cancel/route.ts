import { NextResponse } from "next/server";
import { requireLinkIntakeSession } from "@/lib/call-intake/link-intake-route-guard";
import {
  customerCancelBooking,
  loadCustomerBookingPortalView,
} from "@/lib/customer-booking-portal";
import { guardPublicIntakeRoute } from "@/lib/security/intake-guard";
import { sendSms } from "@/lib/send-sms";
import { findUserById } from "@/lib/users-db";
import { resolveShopDisplayName } from "@/lib/shop-display-name";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
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
  if (!view?.canCancel) {
    return NextResponse.json({ error: "This booking cannot be cancelled." }, { status: 400 });
  }

  const result = await customerCancelBooking({
    userId: session.userId,
    bookingId: view.bookingId,
    callId: view.callId,
    customerName: view.customerName,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const phone = view.phone?.trim();
  if (phone) {
    const user = await findUserById(session.userId);
    const shop = resolveShopDisplayName(user?.shopName);
    await sendSms(
      phone,
      `${shop}: Your visit was cancelled. Call us anytime if you need help!`,
      "customer_cancelled",
      {
        context: {
          userId: session.userId,
          operation: "customer_cancelled",
          bookingId: view.bookingId,
        },
      },
    );
  }

  const updated = await loadCustomerBookingPortalView({ session, token });
  return NextResponse.json({ ok: true, booking: updated });
}
