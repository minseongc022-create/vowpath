import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { listInboundEvents } from "@/lib/inbound-events";
import { getSession } from "@/lib/session";
import { getTenantTwilioPhone } from "@/lib/twilio-provision";
import { findUserById } from "@/lib/users-db";
import { isTenantProductEntitled } from "@/lib/tenant-product-access";
import { useKvStore } from "@/lib/kv-config";
import { kvGetSafe } from "@/lib/kv-safe";
import {
  evaluateForwardingVerifyHit,
  type ForwardingTestMode,
} from "@/lib/forwarding-verify";

const WAIT_MS = 20 * 60 * 1000;
const TEST_TTL_SECONDS = 25 * 60;

type FwdTestSession = {
  startedAt: number;
  testMode: ForwardingTestMode;
  shopPhone: string | null;
};

// The forwarding test start-time must survive across serverless instances: the
// POST (start test) and the GET (poll) frequently land on different instances,
// so a per-instance Map would drop the start time and make verification flaky.
// Store it in KV; fall back to an in-process Map only for local dev without KV.
const localWaitStarted = new Map<string, FwdTestSession>();

function fwdTestKey(userId: string) {
  return `effiroad:fwd-test:${userId}`;
}

async function setTestSession(userId: string, session: FwdTestSession): Promise<void> {
  if (useKvStore()) {
    await kv.set(fwdTestKey(userId), session, { ex: TEST_TTL_SECONDS });
    return;
  }
  localWaitStarted.set(userId, session);
}

async function getTestSession(userId: string): Promise<FwdTestSession | null> {
  if (useKvStore()) {
    return (await kvGetSafe<FwdTestSession>(fwdTestKey(userId)).catch(() => null)) ?? null;
  }
  return localWaitStarted.get(userId) ?? null;
}

async function clearTestSession(userId: string): Promise<void> {
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

  let testMode: ForwardingTestMode = "forward";
  try {
    const body = (await request.json()) as { testMode?: string };
    if (body?.testMode === "direct") testMode = "direct";
  } catch {
    /* empty body → forward test */
  }

  const user = await findUserById(session.sub);
  const effiroad = await getTenantTwilioPhone(session.sub);
  const shopPhone = user?.phone?.trim() ?? null;

  await setTestSession(session.sub, {
    startedAt: Date.now(),
    testMode,
    shopPhone,
  });

  return NextResponse.json({
    ok: true,
    waitingSince: new Date().toISOString(),
    shopPhone,
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

  const testSession = await getTestSession(session.sub);
  const sinceMs = testSession?.startedAt ?? Date.now() - WAIT_MS;
  const testMode = testSession?.testMode ?? "forward";
  const shopPhone = testSession?.shopPhone ?? null;

  const events = await listInboundEvents(session.sub, {
    since: new Date(sinceMs),
    limit: 20,
  });

  const hit = events.find((e) => inboundLooksLikeTest(e.status));
  if (hit) {
    const verdict = evaluateForwardingVerifyHit(hit, { testMode, shopPhone });
    if (!verdict.verified) {
      return NextResponse.json({
        verified: false,
        reason: verdict.reason,
        waitingSince: new Date(sinceMs).toISOString(),
        recentEvents: events.length,
      });
    }

    await clearTestSession(session.sub);
    return NextResponse.json({
      verified: true,
      verifiedAt: hit.createdAt,
      callSid: hit.callSid,
      confidence: verdict.confidence,
      forwardedFrom: hit.forwardedFrom ?? null,
    });
  }

  return NextResponse.json({
    verified: false,
    waitingSince: new Date(sinceMs).toISOString(),
    recentEvents: events.length,
  });
}
