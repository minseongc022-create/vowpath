import { createHmac, timingSafeEqual } from "crypto";

/**
 * Retell signs webhook/function-call requests with header "x-retell-signature":
 * hex HMAC-SHA256 of the raw request body, keyed with the Retell API key.
 * Same dev-bypass pattern as validateTwilioWebhook — only enforced once a real
 * key is configured, so local dev without RETELL_API_KEY still works.
 */
export function validateRetellWebhook(request: Request, rawBody: string): boolean {
  const apiKey = process.env.RETELL_API_KEY?.trim();
  if (!apiKey) {
    return process.env.NODE_ENV !== "production";
  }
  const signature = request.headers.get("x-retell-signature");
  if (!signature) return false;

  const expected = createHmac("sha256", apiKey).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== gotBuf.length) return false;
  return timingSafeEqual(expectedBuf, gotBuf);
}
