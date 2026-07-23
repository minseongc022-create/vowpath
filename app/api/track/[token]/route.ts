import { NextResponse } from "next/server";
import {
  getVisitTrackByCustomerToken,
  publicTrackSnapshot,
} from "@/lib/visit-tracking/store";
import { guardPublicIntakeRoute } from "@/lib/security/intake-guard";

/** Customer polls live tech location (no auth — secret token). */
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const guard = await guardPublicIntakeRoute(request, token);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const session = await getVisitTrackByCustomerToken(token);
    if (!session) {
      return NextResponse.json({ error: "Tracking link expired or invalid." }, { status: 404 });
    }
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Tracking link expired." }, { status: 410 });
    }

    return NextResponse.json({
      ok: true,
      track: publicTrackSnapshot(session),
    });
  } catch (e) {
    console.error("[track/customer]", e);
    return NextResponse.json({ error: "Could not load tracking." }, { status: 500 });
  }
}
