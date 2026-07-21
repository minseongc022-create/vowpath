import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";
import { kvGetSafe } from "./kv-safe";

const TTL_SEC = 60 * 60 * 24 * 120; // 120 days

function billedKey(userId: string, callSid: string): string {
  return `effiroad:voice-billed:${userId}:${callSid}`;
}

/** Returns true if this CallSid was already metered (or claim fails closed as already billed). */
export async function claimVoiceCallBilling(
  userId: string,
  callSid: string,
): Promise<"claimed" | "already"> {
  const key = billedKey(userId, callSid);
  if (!useKvStore()) {
    // Local/file mode: in-memory set on globalThis for this process.
    const g = globalThis as unknown as { __voiceBilled?: Set<string> };
    if (!g.__voiceBilled) g.__voiceBilled = new Set();
    if (g.__voiceBilled.has(key)) return "already";
    g.__voiceBilled.add(key);
    return "claimed";
  }
  try {
    const existing = await kvGetSafe<boolean>(key);
    if (existing) return "already";
    // set NX via conditional: write only if absent
    const ok = await kv.set(key, true, { nx: true, ex: TTL_SEC });
    if (ok === null) return "already";
    return "claimed";
  } catch (e) {
    console.warn("[voice-meter] claim failed — skip charge to avoid double bill", e);
    return "already";
  }
}
