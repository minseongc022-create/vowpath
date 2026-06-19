import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitKey,
} from "@/lib/security/rate-limit";

export async function guardPublicIntakeRoute(
  request: Request,
  token: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const ip = clientIpFromRequest(request);
  const ipLimit = await checkRateLimit({
    key: rateLimitKey("intake:ip", ip),
    limit: 60,
    windowSeconds: 10 * 60,
  });
  if (!ipLimit.ok) {
    return { ok: false, status: 429, error: "Too many requests. Try again later." };
  }

  const tokenLimit = await checkRateLimit({
    key: rateLimitKey("intake:token", token),
    limit: 40,
    windowSeconds: 10 * 60,
  });
  if (!tokenLimit.ok) {
    return { ok: false, status: 429, error: "Too many requests. Try again later." };
  }

  return { ok: true };
}
