import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitKey,
} from "@/lib/security/rate-limit";
import { INTAKE_SUBMIT_PER_TOKEN_LIMIT, INTAKE_SUBMIT_WINDOW_SEC } from "@/lib/security/ai-limits";

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

/** Stricter cap on form POST submits (separate from page loads). */
export async function guardIntakeSubmitRoute(
  request: Request,
  token: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const base = await guardPublicIntakeRoute(request, token);
  if (!base.ok) return base;

  const submitLimit = await checkRateLimit({
    key: rateLimitKey("intake:submit", token),
    limit: INTAKE_SUBMIT_PER_TOKEN_LIMIT,
    windowSeconds: INTAKE_SUBMIT_WINDOW_SEC,
  });
  if (!submitLimit.ok) {
    return { ok: false, status: 429, error: "Too many submit attempts. Try again later." };
  }
  return { ok: true };
}
