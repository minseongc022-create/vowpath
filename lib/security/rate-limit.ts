import { kv } from "@vercel/kv";
import { useKvStore } from "@/lib/kv-config";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  ok: boolean;
  count: number;
  remaining: number;
  resetAt: number;
};

type MemoryBucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, MemoryBucket>();

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function safeKey(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:._-]+/g, "_")
    .slice(0, 160);
}

export function rateLimitKey(scope: string, value: string) {
  return `vowroad:rl:${safeKey(scope)}:${safeKey(value || "unknown")}`;
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

export async function checkRateLimit({
  key,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = nowSeconds();
  const resetAt = now + windowSeconds;

  if (useKvStore()) {
    const existing = await kv.get<{ count: number; resetAt: number }>(key);
    const bucket =
      existing && existing.resetAt > now
        ? { count: existing.count + 1, resetAt: existing.resetAt }
        : { count: 1, resetAt };
    await kv.set(key, bucket, { ex: Math.max(1, bucket.resetAt - now) });
    return {
      ok: bucket.count <= limit,
      count: bucket.count,
      remaining: Math.max(0, limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  }

  const existing = memoryBuckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? { count: existing.count + 1, resetAt: existing.resetAt }
      : { count: 1, resetAt };
  memoryBuckets.set(key, bucket);
  return {
    ok: bucket.count <= limit,
    count: bucket.count,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export async function resetRateLimit(key: string): Promise<void> {
  if (useKvStore()) {
    await kv.del(key);
    return;
  }
  memoryBuckets.delete(key);
}
