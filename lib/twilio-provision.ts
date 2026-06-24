import twilio from "twilio";
import { getTwilioDefaultUserId, getTwilioWebhookBaseUrl } from "./twilio-config";
import { normalizeSmsPhone } from "./phone";
import {
  getTenantPhoneRecord,
  setTenantPhoneRecord,
  type TenantPhoneRecord,
} from "./tenant-phone-store";
import { bindTwilioPhoneToUser } from "./tenant-routing";

export type ProvisionResult =
  | {
      ok: true;
      phoneNumber: string;
      created: boolean;
      legacy?: boolean;
    }
  | { ok: false; error: string; code?: string };

export class TwilioProvisionError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "TwilioProvisionError";
    this.code = code;
  }
}

export function isTwilioAccountConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim(),
  );
}

function twilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  return twilio(sid, token);
}

function areaCodeFromPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  const norm = normalizeSmsPhone(phone);
  if (!norm?.startsWith("+1") || norm.length < 5) return undefined;
  const ac = norm.slice(2, 5);
  return /^\d{3}$/.test(ac) ? ac : undefined;
}

export async function getTenantTwilioPhone(userId: string): Promise<string | null> {
  const record = await getTenantPhoneRecord(userId);
  if (record?.phoneNumber) return record.phoneNumber;

  const legacy = process.env.TWILIO_PHONE_NUMBER?.trim();
  const defaultUser = getTwilioDefaultUserId();
  if (legacy && defaultUser && defaultUser === userId) {
    return legacy;
  }
  return null;
}

export async function configureTwilioWebhooksForNumber(
  phoneNumber: string,
): Promise<{ voiceUrl: string; smsUrl: string }> {
  const base = getTwilioWebhookBaseUrl();
  if (!base || base.includes("localhost") || base.includes("127.0.0.1")) {
    throw new TwilioProvisionError(
      "공개 https URL이 필요합니다. NEXT_PUBLIC_APP_URL 또는 TWILIO_WEBHOOK_BASE_URL을 설정하세요.",
      "WEBHOOK_BASE_MISSING",
    );
  }

  const baseUrl = base.replace(/\/$/, "");
  const voiceUrl = `${baseUrl}/api/twilio/voice`;
  const smsUrl = `${baseUrl}/api/twilio/sms`;
  const client = twilioClient();

  const numbers = await client.incomingPhoneNumbers.list({
    phoneNumber,
    limit: 1,
  });
  if (!numbers[0]) {
    throw new TwilioProvisionError(
      `Twilio 계정에서 ${phoneNumber} 번호를 찾지 못했습니다.`,
      "PHONE_NOT_IN_ACCOUNT",
    );
  }

  await numbers[0].update({
    voiceUrl,
    voiceMethod: "POST",
    smsUrl,
    smsMethod: "POST",
  });

  return { voiceUrl, smsUrl };
}

async function adoptLegacyPhone(userId: string, phone: string): Promise<ProvisionResult> {
  const e164 = normalizeSmsPhone(phone);
  if (!e164) {
    return { ok: false, error: "TWILIO_PHONE_NUMBER 형식이 올바르지 않습니다." };
  }

  const client = twilioClient();
  const numbers = await client.incomingPhoneNumbers.list({
    phoneNumber: e164,
    limit: 1,
  });
  const twilioSid = numbers[0]?.sid ?? "legacy-env";

  await configureTwilioWebhooksForNumber(e164);
  await bindTwilioPhoneToUser(e164, userId);
  await setTenantPhoneRecord(userId, {
    phoneNumber: e164,
    twilioSid,
    provisionedAt: new Date().toISOString(),
    legacy: true,
  });

  return { ok: true, phoneNumber: e164, created: false, legacy: true };
}

async function purchaseAndBindNumber(
  userId: string,
  areaCode?: string,
): Promise<ProvisionResult> {
  const client = twilioClient();

  const searchParams: {
    smsEnabled: boolean;
    voiceEnabled: boolean;
    limit: number;
    areaCode?: number;
  } = {
    smsEnabled: true,
    voiceEnabled: true,
    limit: 5,
  };
  if (areaCode) {
    const ac = Number.parseInt(areaCode, 10);
    if (!Number.isNaN(ac)) searchParams.areaCode = ac;
  }

  let candidates = await client.availablePhoneNumbers("US").local.list(searchParams);
  if (candidates.length === 0 && areaCode) {
    candidates = await client.availablePhoneNumbers("US").local.list({
      smsEnabled: true,
      voiceEnabled: true,
      limit: 5,
    });
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      error: "구매 가능한 미국 번호가 없습니다. Twilio 계정 잔액을 확인하세요.",
      code: "NO_NUMBERS_AVAILABLE",
    };
  }

  const base = getTwilioWebhookBaseUrl().replace(/\/$/, "");
  const voiceUrl = `${base}/api/twilio/voice`;
  const smsUrl = `${base}/api/twilio/sms`;

  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber: candidates[0].phoneNumber,
    voiceUrl,
    voiceMethod: "POST",
    smsUrl,
    smsMethod: "POST",
    friendlyName: `Effiroad ${userId.slice(0, 8)}`,
  });

  const e164 = purchased.phoneNumber;
  await bindTwilioPhoneToUser(e164, userId);
  await setTenantPhoneRecord(userId, {
    phoneNumber: e164,
    twilioSid: purchased.sid,
    provisionedAt: new Date().toISOString(),
    areaCode: areaCodeFromPhone(e164),
  });

  return { ok: true, phoneNumber: e164, created: true };
}

/**
 * Ensure the tenant has a dedicated inbound Twilio number (purchase or legacy bind).
 */
export async function ensureTenantTwilioPhone(
  userId: string,
  opts?: { shopPhone?: string | null; force?: boolean },
): Promise<ProvisionResult> {
  if (!opts?.force) {
    const existing = await getTenantPhoneRecord(userId);
    if (existing?.phoneNumber) {
      try {
        await configureTwilioWebhooksForNumber(existing.phoneNumber);
        await bindTwilioPhoneToUser(existing.phoneNumber, userId);
      } catch (e) {
        console.warn("[twilio-provision] webhook refresh failed", e);
      }
      return {
        ok: true,
        phoneNumber: existing.phoneNumber,
        created: false,
        legacy: existing.legacy,
      };
    }
  }

  const legacyPhone = process.env.TWILIO_PHONE_NUMBER?.trim();
  const defaultUser = getTwilioDefaultUserId();
  if (legacyPhone && defaultUser === userId && isTwilioAccountConfigured()) {
    return adoptLegacyPhone(userId, legacyPhone);
  }

  const autoProvision =
    process.env.TWILIO_AUTO_PROVISION?.trim().toLowerCase() !== "false";
  const forceProvision =
    process.env.TWILIO_FORCE_PROVISION?.trim().toLowerCase() === "true";

  const skipNewPurchase =
    !autoProvision ||
    (process.env.NODE_ENV === "development" && !forceProvision);

  if (skipNewPurchase) {
    if (legacyPhone && isTwilioAccountConfigured()) {
      return adoptLegacyPhone(userId, legacyPhone);
    }
    if (!isTwilioAccountConfigured()) {
      return {
        ok: false,
        error: "Twilio 계정(SID/Token)이 설정되지 않았습니다.",
        code: "TWILIO_NOT_CONFIGURED",
      };
    }
  }

  if (!isTwilioAccountConfigured()) {
    return {
      ok: false,
      error: "Twilio 계정(SID/Token)이 설정되지 않았습니다.",
      code: "TWILIO_NOT_CONFIGURED",
    };
  }

  const areaCode = areaCodeFromPhone(opts?.shopPhone);
  try {
    return await purchaseAndBindNumber(userId, areaCode);
  } catch (e) {
    console.error("[twilio-provision] purchase failed", e);
    const msg =
      e instanceof Error ? e.message : "Twilio 번호 구매에 실패했습니다.";
    if (legacyPhone) {
      try {
        return await adoptLegacyPhone(userId, legacyPhone);
      } catch (legacyErr) {
        console.error("[twilio-provision] legacy fallback failed", legacyErr);
      }
    }
    return { ok: false, error: msg, code: "PURCHASE_FAILED" };
  }
}
