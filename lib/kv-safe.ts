import { kv } from "@vercel/kv";

export const DEFAULT_KV_TIMEOUT_MS = 4_000;

export class KvReadTimeoutError extends Error {
  constructor() {
    super("KV_TIMEOUT");
    this.name = "KvReadTimeoutError";
  }
}

/** KV read with a hard timeout so API routes never hang the dashboard. */
export async function kvGetSafe<T>(
  key: string,
  timeoutMs = DEFAULT_KV_TIMEOUT_MS,
): Promise<T | null> {
  try {
    const result = await Promise.race([
      kv.get<T>(key),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new KvReadTimeoutError()), timeoutMs);
      }),
    ]);
    return result ?? null;
  } catch (e) {
    if (e instanceof KvReadTimeoutError) throw e;
    return null;
  }
}
