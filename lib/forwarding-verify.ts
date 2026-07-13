import type { InboundEvent } from "./inbound-events";

export type ForwardingTestMode = "forward" | "direct";

export type ForwardingVerifyConfidence = "direct" | "forwarded" | "inbound_only";

export type ForwardingVerifyResult = {
  verified: boolean;
  confidence?: ForwardingVerifyConfidence;
  reason?: "wrong_forward_source";
};

function normalizeUsE164(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 10) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function phonesMatchE164(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeUsE164(a ?? "");
  const nb = normalizeUsE164(b ?? "");
  if (!na || !nb) return false;
  return na === nb;
}

export function evaluateForwardingVerifyHit(
  event: InboundEvent,
  opts: { testMode: ForwardingTestMode; shopPhone: string | null },
): ForwardingVerifyResult {
  if (opts.testMode === "direct") {
    return { verified: true, confidence: "direct" };
  }

  const forwardedFrom = event.forwardedFrom?.trim();
  if (forwardedFrom && opts.shopPhone) {
    if (phonesMatchE164(forwardedFrom, opts.shopPhone)) {
      return { verified: true, confidence: "forwarded" };
    }
    return { verified: false, reason: "wrong_forward_source" };
  }

  return { verified: true, confidence: "inbound_only" };
}
