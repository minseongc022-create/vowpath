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
