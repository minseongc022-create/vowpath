import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runCloudGenerateAll } from "@/lib/content-autopilot/run";
import { ensurePin } from "@/lib/content-autopilot/store";

/**
 * Nightly / scheduled: cron-job.org → GET/POST /api/cron/content-autopilot
 * Auth: Authorization: Bearer $CRON_SECRET or $AUTOPILOT_CRON_SECRET
 */
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  const secret = process.env.AUTOPILOT_CRON_SECRET || process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensurePin();
  const job = await runCloudGenerateAll();
  return NextResponse.json(job);
}
