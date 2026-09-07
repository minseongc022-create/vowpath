import { NextResponse } from "next/server";
import { clawOpsReadiness, monthlyMinuteAllowance, reservationWorkerCapacity } from "@/dajeong/lib/clawops-config";
import { reservationPersistenceMode } from "@/dajeong/lib/reservation-store";

function authorized(request: Request): boolean {
  const expected = process.env.HARUWITH_OPS_TOKEN?.trim();
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected && provided === expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clawops = clawOpsReadiness();
  const persistence = reservationPersistenceMode();
  const publicBaseUrlConfigured = Boolean(process.env.HARUWITH_PUBLIC_BASE_URL?.trim() || process.env.VERCEL_URL?.trim());
  const workerTokenConfigured = Boolean(process.env.HARUWITH_WORKER_TOKEN?.trim() || process.env.CRON_SECRET?.trim());
  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const ready = clawops.configured && persistence === "vercel_kv" && publicBaseUrlConfigured && workerTokenConfigured && openAiConfigured;

  return NextResponse.json({
    ready,
    checkedAt: new Date().toISOString(),
    clawops,
    persistence,
    publicBaseUrlConfigured,
    workerTokenConfigured,
    openAiConfigured,
    concurrency: reservationWorkerCapacity(),
    monthlyMinuteAllowance: monthlyMinuteAllowance(),
  }, { status: ready ? 200 : 503 });
}
