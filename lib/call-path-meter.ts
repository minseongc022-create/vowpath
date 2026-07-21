import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";
import { kvGetSafe } from "./kv-safe";

const TTL_SEC = 60 * 60 * 24 * 14; // 14 days

function pathKey(callSid: string): string {
  return `effiroad:call-path:${callSid}`;
}

/** Mark a CallSid as free-estimate IVR (press 2 / estimate_choice) — not billable on Voice. */
export async function markCallPathEstimate(callSid: string): Promise<void> {
  const sid = callSid.trim();
  if (!sid) return;
  const key = pathKey(sid);
  if (!useKvStore()) {
    const g = globalThis as unknown as { __callPathEstimate?: Set<string> };
    if (!g.__callPathEstimate) g.__callPathEstimate = new Set();
    g.__callPathEstimate.add(key);
    return;
  }
  try {
    await kv.set(key, "estimate", { ex: TTL_SEC });
  } catch (e) {
    console.warn("[call-path] mark estimate failed", e);
  }
}

export async function isCallPathEstimate(callSid: string): Promise<boolean> {
  const sid = callSid.trim();
  if (!sid) return false;
  const key = pathKey(sid);
  if (!useKvStore()) {
    const g = globalThis as unknown as { __callPathEstimate?: Set<string> };
    return Boolean(g.__callPathEstimate?.has(key));
  }
  try {
    const v = await kvGetSafe<string>(key);
    return v === "estimate";
  } catch {
    return false;
  }
}
