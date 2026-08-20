import { NextResponse } from "next/server";
import { runCollection } from "@/pricepulse/lib/collect/run.ts";
import { listCollectionTargets } from "@/pricepulse/lib/store/targets.ts";

/**
 * Daily Toss Shopping snapshot.
 *
 * The watchlist is whatever sellers have registered (pricepulse_targets) —
 * no admin curation step. Vercel Hobby caps a function at 60s, and the
 * collector is deliberately slow (polite request gap), so it's sharded:
 * call this once per shard.
 *   /api/cron/pricepulse-collect?slice=0&of=3
 * Sharding is by target index, so a target usually lands in the same shard
 * run to run (a newly added keyword just joins whichever shard it sorts into).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const url = new URL(request.url);
  const slice = Number(url.searchParams.get("slice") ?? "0");
  const of = Math.max(1, Number(url.searchParams.get("of") ?? "1"));
  const dryRun = url.searchParams.get("dryRun") === "1";
  const onlyParam = url.searchParams.get("only");

  try {
    const all = await listCollectionTargets();
    const shard = all.filter((_, index) => index % of === slice % of);
    const only = onlyParam ? onlyParam.split(",").map((id) => id.trim()) : undefined;

    const run = await runCollection({ targets: shard, only, dryRun });

    return NextResponse.json(
      {
        ok: run.ok,
        runId: run.runId,
        slice: { slice: slice % of, of, targets: shard.length },
        totals: run.totals,
        alerts: run.alerts,
        targets: run.targets.map((target) => ({
          id: target.targetId,
          ok: target.ok,
          items: target.itemCount,
          stored: target.storedCount ?? 0,
          error: target.error,
        })),
      },
      { status: run.ok ? 200 : 500 },
    );
  } catch (error) {
    // Config/profile errors land here — they must be loud, not a 200 with zero rows.
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
