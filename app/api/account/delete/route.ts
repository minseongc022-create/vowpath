import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { deleteUserFromStore } from "@/lib/users-db";
import { kv } from "@vercel/kv";
import { useKvStore } from "@/lib/kv-config";
import { SESSION_COOKIE } from "@/lib/auth-token";

function kvRestConfig() {
  const url = process.env.KV_REST_API_URL?.trim() || process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim() || process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

async function redisCmd(cfg: { url: string; token: string }, command: string[]) {
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}` },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  try {
    return (await res.json()) as { result: unknown };
  } catch {
    throw new Error("Redis response was not valid JSON");
  }
}

const SCAN_MAX_ITERATIONS = 200;

async function deleteUserKvKeys(userId: string): Promise<number> {
  const cfg = kvRestConfig();
  if (!cfg) return 0;

  const keys: string[] = [];
  let cursor = "0";
  let iterations = 0;
  do {
    const result = await redisCmd(cfg, ["SCAN", cursor, "MATCH", `effiroad:*:${userId}*`, "COUNT", "100"]);
    const tuple = result.result as [string, string[]];
    cursor = String(tuple[0]);
    keys.push(...(tuple[1] ?? []));
    iterations += 1;
  } while (cursor !== "0" && iterations < SCAN_MAX_ITERATIONS);

  if (keys.length === 0) return 0;
  await redisCmd(cfg, ["DEL", ...keys]);
  return keys.length;
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = session.sub;

  try {
    if (useKvStore()) {
      await deleteUserKvKeys(userId);
    }
    await deleteUserFromStore(userId);

    const jar = await cookies();
    jar.delete(SESSION_COOKIE);

    return NextResponse.json({ ok: true, deleted: userId });
  } catch (e) {
    console.error("[account/delete]", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
