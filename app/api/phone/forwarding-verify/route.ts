import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { listInboundEvents } from "@/lib/inbound-events";
import { getSession } from "@/lib/session";
import { getTenantTwilioPhone } from "@/lib/twilio-provision";
import { findUserById } from "@/lib/users-db";
import { isTenantProductEntitled } from "@/lib/tenant-product-access";
import { useKvStore } from "@/lib/kv-config";
import { kvGetSafe } from "@/lib/kv-safe";

const WAIT_MS = 20 * 60 * 1000;
const TEST_TTL_SECONDS = 25 * 60;

// The forwarding test start-time must survive across serverless instances: the
// POST (start test) and the GET (poll) frequently land on different instances,
// so a per-instance Map would drop the start time and make verification flaky.
// Store it in KV; fall back to an in-process Map only for local dev without KV.
const localWaitStarted = new Map<string, number>();

function fwdTestKey(userId: string) {
  return `effiroad:fwd-test:${userId}`;
}
async function setTestStart(userId: string, ts: number): Promise<void> {
  if (useKvStore()) {
    await kv.set(fwdTestKey(userId), ts, { ex: TEST_TTL_SECONDS });
    return;
  }
  localWaitStarted.set(userId, ts);
}
async function getTestStart(userId: string): Promise<number | null> {
  if (useKvStore()) {
    return (await kvGetSafe<number>(fwdTestKey(userId)).catch(() => null)) ?? null;
  }
  return localWaitStarted.get(userId) ?? null;
}
async function clearTestStart(userId: string): Promise<void> {
  if (useKvStore()) {
    await kv.del(fwdTestKey(userId)).catch(() => undefined);
    return;
  }
  localWaitStarted.delete(userId);
}

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

  await setTestStart(session.sub, Date.now());
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

  const sinceMs = (await getTestStart(session.sub)) ?? Date.now() - WAIT_MS;
  const events = await listInboundEvents(session.sub, {
    since: new Date(sinceMs),
    limit: 20,
  });

  const hit = events.find((e) => inboundLooksLikeTest(e.status));
  if (hit) {
    await clearTestStart(session.sub);
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
