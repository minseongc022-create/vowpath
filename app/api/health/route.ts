import { NextResponse } from "next/server";
import { useKvStore } from "@/lib/kv-config";
import { getCircuitBreakerState } from "@/lib/resilience";
import { isTwilioConfigured } from "@/lib/twilio-config";

export const dynamic = "force-dynamic";

/**
 * Public, no-auth health check for external uptime monitors (UptimeRobot etc).
 * Reports config presence + in-memory circuit breaker state per service — cheap to
 * ping on a schedule since it never calls out to OpenAI/Twilio/KV itself.
 */
export async function GET() {
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const openaiBreaker = getCircuitBreakerState("openai");

  const twilioConfigured = isTwilioConfigured();
  const kvConfigured = useKvStore();
  const onVercel = process.env.VERCEL === "1";
  // On Vercel, the file-based store isn't durable — KV is required for a working DB.
  const databaseOk = kvConfigured || !onVercel;

  const services = {
    openai: {
      configured: openaiConfigured,
      circuitBreaker: openaiBreaker,
      ok: openaiConfigured && !openaiBreaker.open,
    },
    twilio: {
      configured: twilioConfigured,
      ok: twilioConfigured,
    },
    database: {
      store: kvConfigured ? "kv" : "file",
      ok: databaseOk,
    },
  };

  const ok = Object.values(services).every((s) => s.ok);

  return NextResponse.json(
    { ok, timestamp: new Date().toISOString(), services },
    { status: ok ? 200 : 503 },
  );
}
