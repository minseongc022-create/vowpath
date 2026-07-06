import { kv } from "@vercel/kv";
import { useKvStore } from "./kv-config";

const LOCK_TTL_SECONDS = 15;
const POLL_MS = 200;
const MAX_WAIT_MS = 4_000;

// Per-instance fallback used only when KV isn't configured (local dev without
// Vercel KV / Upstash env vars). On Vercel this branch is never taken, so
// concurrent requests for the same key are always serialized cross-instance
// via KV below.
const localLocks = new Map<string, Promise<unknown>>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Serializes concurrent callers for the same key using a KV-backed lock
 * (SET NX + short TTL) so Twilio webhook retries landing on different
 * serverless instances don't read-modify-write the same state out of order.
 * Falls back to an in-process lock when KV isn't configured (local dev).
 * Fails open (runs fn without the lock) if the lock can't be acquired within
 * MAX_WAIT_MS, since a phone call must always get a TwiML response quickly.
 */
export async function withDistributedLock<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!useKvStore()) {
    const prior = localLocks.get(key) ?? Promise.resolve();
    const result = prior.then(fn, fn);
    localLocks.set(key, result.catch(() => undefined));
    return result;
  }

  const lockKey = `effiroad:lock:${key}`;
  const waitDeadline = Date.now() + MAX_WAIT_MS;
  let acquired = false;

  while (Date.now() < waitDeadline) {
    try {
      const set = await kv.set(lockKey, "1", { nx: true, ex: LOCK_TTL_SECONDS });
      if (set) {
        acquired = true;
        break;
      }
    } catch (e) {
      console.error("[distributed-lock] KV error acquiring lock, proceeding without it:", e);
      break;
    }
    await sleep(POLL_MS);
  }

  if (!acquired) {
    console.error(`[distributed-lock] could not acquire lock for ${key} in time, proceeding without it`);
  }

  try {
    return await fn();
  } finally {
    if (acquired) {
      try {
        await kv.del(lockKey);
      } catch (e) {
        console.error("[distributed-lock] KV error releasing lock (will expire via TTL):", e);
      }
    }
  }
}
