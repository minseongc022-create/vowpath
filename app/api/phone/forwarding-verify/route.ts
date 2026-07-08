import { NextResponse } from "next/server";
import { listInboundEvents } from "@/lib/inbound-events";
import { getSession } from "@/lib/session";
import { getTenantTwilioPhone } from "@/lib/twilio-provision";
import { findUserById } from "@/lib/users-db";
import { isTenantProductEntitled } from "@/lib/tenant-product-access";

const WAIT_MS = 20 * 60 * 1000;
const waitStarted = new Map<string, number>();

function inboundLooksLikeTest(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s === "voice_started" ||
    s === "initiated" ||
    s === "ringing" ||
    s === "in-progress" ||
    s === "completed"
  );
}

/** POST — owner started a forwarding test window. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isTenantProductEntitled(session.sub))) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  let testMode: "forward" | "direct" = "forward";
  try {
    const body = (await request.json()) as { testMode?: string };
    if (body?.testMode === "direct") testMode = "direct";
  } catch {
    /* empty body → forward test */
  }

  waitStarted.set(session.sub, Date.now());
  const user = await findUserById(session.sub);
  const effiroad = await getTenantTwilioPhone(session.sub);

  return NextResponse.json({
    ok: true,
    waitingSince: new Date().toISOString(),
    shopPhone: user?.phone ?? null,
    effiroadNumber: effiroad,
    testMode,
    instruction:
      testMode === "direct"
        ? "From a different phone, call your Effiroad number directly."
        : "From a different phone, call your main shop number (not the Effiroad number). Let it ring without answering.",
  });
}

/** GET — poll for inbound call after test started. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sinceMs = waitStarted.get(session.sub) ?? Date.now() - WAIT_MS;
  const events = await listInboundEvents(session.sub, {
    since: new Date(sinceMs),
    limit: 20,
  });

  const hit = events.find((e) => inboundLooksLikeTest(e.status));
  if (hit) {
    waitStarted.delete(session.sub);
    return NextResponse.json({
      verified: true,
      verifiedAt: hit.createdAt,
      callSid: hit.callSid,
    });
  }

  return NextResponse.json({
    verified: false,
    waitingSince: new Date(sinceMs).toISOString(),
    recentEvents: events.length,
  });
}
