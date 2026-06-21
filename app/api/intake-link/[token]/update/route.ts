import { NextResponse } from "next/server";
import {
  getLinkIntakeSession,
  isLinkIntakePortalOpen,
  isLinkIntakeSessionExpired,
} from "@/lib/call-intake/link-intake-store";
import { updateLinkIntakeBooking } from "@/lib/link-intake-portal";
import { parseLinkUrgency } from "@/lib/link-intake-urgency";
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

    const session = await getLinkIntakeSession(token);
    if (
      !session ||
      isLinkIntakeSessionExpired(session) ||
      !isLinkIntakePortalOpen(session) ||
      !session.callId
    ) {
      return NextResponse.json({ error: "Link expired or invalid" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const urgency = parseLinkUrgency(body.urgency) ?? "this_week";

    const result = await updateLinkIntakeBooking({
      session,
      bookingId: String(body.bookingId ?? ""),
      callId: String(body.callId ?? session.callId),
      customerName: String(body.customerName ?? "").trim(),
      phone: String(body.phone ?? "").trim(),
      address: String(body.address ?? "").trim(),
      issueDescription: String(body.issueDescription ?? "").trim(),
      urgency,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, booking: result.booking });
  } catch (e) {
    console.error("[intake-link/update]", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again in a moment." },
      { status: 500 },
    );
  }
}
