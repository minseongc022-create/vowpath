/** True when Redis/KV env vars are set (Vercel KV or Upstash integration). */
export function useKvStore(): boolean {
  const kvUrl = process.env.KV_REST_API_URL?.trim();
  const kvToken = process.env.KV_REST_API_TOKEN?.trim();
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  return Boolean(
    (kvUrl && kvToken) || (upstashUrl && upstashToken),
  );
}
