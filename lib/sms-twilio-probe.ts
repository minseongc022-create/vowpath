import { isKrSmsTestMode } from "./sms-region-config";
import { isTwilioConfigured } from "./twilio-config";
import { normalizeSmsPhone } from "./phone";

export type SmsTwilioProbeResult = {
  checkedAt: string;
  ok: boolean;
  code: number | null;
  message: string;
  probeTo: string;
};

let cached: { result: SmsTwilioProbeResult; expiresAt: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

function probeDestination(): string {
  const explicit = normalizeSmsPhone(process.env.SMS_PROBE_TO?.trim() ?? "");
  if (explicit) return explicit;
  const owner = normalizeSmsPhone(process.env.TWILIO_OWNER_ALERT_PHONE?.trim() ?? "");
  if (owner) return owner;
  return isKrSmsTestMode() ? "+15125550100" : "+15125550100";
}

function parseProbeError(e: unknown): { code: number | null; message: string } {
  const msg = e instanceof Error ? e.message : String(e);
  const code =
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "number"
      ? (e as { code: number }).code
      : null;

  if (code === 21408 || msg.includes("Permission to send an SMS")) {
    return {
      code,
      message:
        "Twilio Geo permissions: United States(US) SMS를 허용해야 합니다. Console → Messaging → Geo permissions.",
    };
  }
  if (code === 21608 || code === 21610 || msg.includes("unverified")) {
    return {
      code,
      message:
        "Twilio Trial: SMS_PROBE_TO 번호를 Verified Caller IDs에 등록하세요.",
    };
  }
  return { code, message: msg || "SMS probe failed" };
}

/** Live Twilio send probe (cached). Surfaces Geo / Trial issues before shop traffic. */
export async function probeTwilioSmsDelivery(): Promise<SmsTwilioProbeResult> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.result;
  }

  const probeTo = probeDestination();
  const checkedAt = new Date().toISOString();

  if (!isTwilioConfigured()) {
    const result: SmsTwilioProbeResult = {
      checkedAt,
      ok: false,
      code: null,
      message: "Twilio env missing",
      probeTo,
    };
    cached = { result, expiresAt: now + CACHE_MS };
    return result;
  }

  const from = normalizeSmsPhone(process.env.TWILIO_PHONE_NUMBER?.trim() ?? "");
  if (!from?.startsWith("+1")) {
    const result: SmsTwilioProbeResult = {
      checkedAt,
      ok: false,
      code: null,
      message: "TWILIO_PHONE_NUMBER must be US +1 E.164",
      probeTo,
    };
    cached = { result, expiresAt: now + CACHE_MS };
    return result;
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );
    await client.messages.create({
      body: "[Vowpath] SMS connectivity check",
      from,
      to: probeTo,
    });
    const result: SmsTwilioProbeResult = {
      checkedAt,
      ok: true,
      code: null,
      message: "Test SMS sent successfully",
      probeTo,
    };
    cached = { result, expiresAt: now + CACHE_MS };
    return result;
  } catch (e) {
    const { code, message } = parseProbeError(e);
    const result: SmsTwilioProbeResult = {
      checkedAt,
      ok: false,
      code,
      message,
      probeTo,
    };
    cached = { result, expiresAt: now + CACHE_MS };
    return result;
  }
}

export function clearSmsTwilioProbeCache(): void {
  cached = null;
}
