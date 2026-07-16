import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import { manualAssignTechToBooking, startTechAssignmentForBooking } from "@/lib/tech-dispatch/assign";
import { listActiveCrew } from "@/lib/scheduling/tech-lanes";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const crew = await listActiveCrew(session.sub);
  return NextResponse.json({ crew });
}

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      bookingId?: string;
      techId?: string;
      mode?: "manual" | "auto";
      notify?: boolean;
    };
    const bookingId = body.bookingId?.trim();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    if (body.mode === "auto" || !body.techId?.trim()) {
      const assignment = await startTechAssignmentForBooking(session.sub, bookingId);
      return NextResponse.json({ ok: true, assignment });
    }

    const result = await manualAssignTechToBooking(
      session.sub,
      bookingId,
      body.techId.trim(),
      { notify: body.notify !== false },
    );
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, assignment: result });
  } catch (e) {
    console.error("[tech-dispatch/assign]", e);
    return NextResponse.json({ error: "Could not assign crew." }, { status: 500 });
  }
}
