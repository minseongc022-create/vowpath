import { NextResponse } from "next/server";
import {
  endVisitTrack,
  getVisitTrackByTechToken,
  isVisitTrackExpired,
  markVisitTrackArrived,
  publicTrackSnapshot,
  updateVisitTrackLocation,
} from "@/lib/visit-tracking/store";
import { guardPublicIntakeRoute } from "@/lib/security/intake-guard";

/** Tech loads go-page session. */
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
    const session = await getVisitTrackByTechToken(token);
    if (!session || isVisitTrackExpired(session)) {
      return NextResponse.json(
        { error: "Link expired or invalid." },
        { status: session ? 410 : 404 },
      );
    }
    return NextResponse.json({
      ok: true,
      track: publicTrackSnapshot(session),
      techToken: token,
    });
  } catch (e) {
    console.error("[track/tech GET]", e);
    return NextResponse.json({ error: "Could not load." }, { status: 500 });
  }
}

/** Tech posts GPS / arrive / end. */
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

    const existing = await getVisitTrackByTechToken(token);
    if (!existing || isVisitTrackExpired(existing)) {
      return NextResponse.json(
        { error: "Link expired or invalid." },
        { status: existing ? 410 : 404 },
      );
    }

    const body = (await request.json()) as {
      action?: string;
      lat?: number;
      lng?: number;
      heading?: number;
      speedMps?: number;
      etaMinutes?: number;
    };

    const action = body.action ?? "ping";

    if (action === "arrive") {
      const session = await markVisitTrackArrived(token);
      if (!session) return NextResponse.json({ error: "Invalid link." }, { status: 404 });
      return NextResponse.json({ ok: true, track: publicTrackSnapshot(session) });
    }

    if (action === "end") {
      const session = await endVisitTrack(token);
      if (!session) return NextResponse.json({ error: "Invalid link." }, { status: 404 });
      return NextResponse.json({ ok: true, track: publicTrackSnapshot(session) });
    }

    if (existing.status === "ended" || existing.status === "arrived") {
      return NextResponse.json(
        { error: "Tracking already finished." },
        { status: 409 },
      );
    }

    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "lat/lng required." }, { status: 400 });
    }
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
    }

    const session = await updateVisitTrackLocation({
      techToken: token,
      lat,
      lng,
      heading: body.heading ?? null,
      speedMps: body.speedMps ?? null,
      etaMinutes: body.etaMinutes ?? null,
    });
    if (!session) return NextResponse.json({ error: "Invalid link." }, { status: 404 });
    return NextResponse.json({ ok: true, track: publicTrackSnapshot(session) });
  } catch (e) {
    console.error("[track/tech POST]", e);
    return NextResponse.json({ error: "Could not update location." }, { status: 500 });
  }
}
