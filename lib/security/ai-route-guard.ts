import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitKey,
  type RateLimitResult,
} from "@/lib/security/rate-limit";
import {
  aiPrivacyRefusal,
  aiRateLimitMessage,
  clampAiText,
  detectAiPrivacyBlock,
  sanitizeAiOutput,
  type AiPrivacyBlockReason,
} from "@/lib/security/ai-privacy";

export type AiGuardLocale = "en" | "es" | "ko";

export type AiGuardResult =
  | { ok: true; text: string }
  | { ok: false; status: number; error: string; reason: "rate_limit" | AiPrivacyBlockReason };

export async function enforceAiRateLimits(
  request: Request,
  scopes: { key: string; limit: number; windowSeconds: number }[],
): Promise<RateLimitResult | null> {
  for (const scope of scopes) {
    const result = await checkRateLimit(scope);
    if (!result.ok) return result;
  }
  return null;
}

export function guardAiUserInput(
  raw: string,
  maxChars: number,
  locale: AiGuardLocale = "en",
): AiGuardResult {
  const text = clampAiText(raw, maxChars);
  if (!text) {
    return { ok: false, status: 400, error: "Question required", reason: "too_long" };
  }
  const block = detectAiPrivacyBlock(text);
  if (block) {
    return { ok: false, status: 403, error: aiPrivacyRefusal(locale), reason: block };
  }
  return { ok: true, text };
}

export function finalizeAiAnswer(answer: string): string {
  return sanitizeAiOutput(answer);
}

export function aiGuardRateLimitResponse(locale: AiGuardLocale = "en") {
  return { error: aiRateLimitMessage(locale), code: "rate_limit" as const };
}

export function siteAssistantRateLimitKeys(request: Request) {
  const ip = clientIpFromRequest(request);
  return {
    ip,
    hourly: {
      key: rateLimitKey("site-assistant:hour", ip),
    },
    burst: {
      key: rateLimitKey("site-assistant:burst", ip),
    },
  };
}

export function shopAiRateLimitKeys(userId: string) {
  return {
    daily: { key: rateLimitKey("effiroad-ai:day", userId) },
    hourly: { key: rateLimitKey("effiroad-ai:hour", userId) },
  };
}

const DAJEONG_AI_BURST_LIMIT = 20;
const DAJEONG_AI_BURST_WINDOW_SEC = 60;
const DAJEONG_AI_HOURLY_LIMIT = 100;
const DAJEONG_AI_HOURLY_WINDOW_SEC = 60 * 60;

/**
 * Every dajeong route that calls the concierge/planning AI is reachable without login (the
 * pre-login trust model in identity-guard.ts's verifyClaimedIdentity is a deliberate no-op for
 * anonymous ids), so IP is the only handle available to stop an open loop from running up real
 * OpenAI charges on the shared key. 20/min is far above anything a person typing can hit;
 * 100/hour catches a slow drip that stays under the burst limit.
 */
export async function dajeongAiRateLimit(request: Request): Promise<{ error: string; code: "rate_limit" } | null> {
  const ip = clientIpFromRequest(request);
  const burst = await checkRateLimit({
    key: rateLimitKey("dajeong-ai:burst", ip),
    limit: DAJEONG_AI_BURST_LIMIT,
    windowSeconds: DAJEONG_AI_BURST_WINDOW_SEC,
  });
  const hourly = burst.ok
    ? await checkRateLimit({
        key: rateLimitKey("dajeong-ai:hour", ip),
        limit: DAJEONG_AI_HOURLY_LIMIT,
        windowSeconds: DAJEONG_AI_HOURLY_WINDOW_SEC,
      })
    : burst;
  if (!burst.ok || !hourly.ok) return { error: "잠시 후 다시 시도해 주세요.", code: "rate_limit" };
  return null;
}
