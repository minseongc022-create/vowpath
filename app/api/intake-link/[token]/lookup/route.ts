import { NextResponse } from "next/server";
import {
  getLinkIntakeSession,
  isLinkIntakePortalOpen,
} from "@/lib/call-intake/link-intake-store";
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
  const session = await getLinkIntakeSession(token);
  if (!isLinkIntakePortalOpen(session)) {
    return NextResponse.json({ error: "Link expired or invalid" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await lookupLinkIntakeBooking({
    session: session!,
    customerName: String(body.customerName ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true, booking: result.booking });
}
