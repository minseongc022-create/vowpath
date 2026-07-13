import { NextResponse } from "next/server";
import { requireLinkIntakeSession } from "@/lib/call-intake/link-intake-route-guard";
import { lookupLinkIntakeBooking } from "@/lib/link-intake-portal";
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
  const sessionGuard = await requireLinkIntakeSession(token, { requirePortalOpen: true });
  if (!sessionGuard.ok) {
    return NextResponse.json(
      { error: sessionGuard.error, code: sessionGuard.code },
      { status: sessionGuard.status },
    );
  }
  const session = sessionGuard.session;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await lookupLinkIntakeBooking({
    session,
    customerName: String(body.customerName ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true, booking: result.booking });
}
