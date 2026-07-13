import { NextResponse } from "next/server";
import { ensurePilotTrial, ensurePilotTrialForMappedPhone } from "@/lib/pilot-trial";
import { listUsers } from "@/lib/users-db";
import { kv } from "@vercel/kv";
import { useKvStore } from "@/lib/kv-config";

/**
 * Backfill 30-day pilot trials for tenants with inbound Twilio lines.
 * Run once after deploy: GET /api/cron/ensure-pilot-trials (CRON_SECRET).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const isDeployed = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  if (isDeployed && !secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  if (secret) {
    const auth = request.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    const header = request.headers.get("x-cron-secret");
    if (bearer !== secret && header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const granted: string[] = [];
  const skipped: string[] = [];

  try {
    if (useKvStore()) {
      let cursor = 0;
      do {
        const result = await kv.scan(cursor, {
          match: "effiroad:twilio-phone:*",
          count: 100,
        });
        cursor = Number(result[0]);
        for (const key of result[1]) {
          const userId = await kv.get<string>(key);
          if (!userId || typeof userId !== "string") continue;
          const phone = key.replace("effiroad:twilio-phone:", "");
          const ok = await ensurePilotTrialForMappedPhone(userId, phone);
          if (ok) granted.push(userId);
          else skipped.push(userId);
        }
      } while (cursor !== 0);
    } else {
      const users = await listUsers();
      for (const user of users) {
        const ok = await ensurePilotTrial(user.id);
        if (ok) granted.push(user.id);
        else skipped.push(user.id);
      }
    }

    return NextResponse.json({
      ok: true,
      granted: [...new Set(granted)],
      skipped: [...new Set(skipped)],
    });
  } catch (e) {
    console.error("[cron/ensure-pilot-trials]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Backfill failed" },
      { status: 500 },
    );
  }
}
