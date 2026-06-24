import { normalizeSmsPhone } from "./phone";
import { getTenantTwilioPhone } from "./twilio-provision";
import { isTwilioConfigured } from "./twilio-config";

export type SmsTwilioHealth = {
  configured: boolean;
  fromNumberValid: boolean;
  fromNumber: string | null;
  issues: string[];
  ready: boolean;
};

export async function getSmsTwilioHealthForUser(
  userId?: string | null,
): Promise<SmsTwilioHealth> {
  const issues: string[] = [];
  const configured = isTwilioConfigured();

  if (!configured) {
    issues.push(
      "Twilio 환경 변수가 없습니다. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN를 설정하세요.",
    );
    return {
      configured: false,
      fromNumberValid: false,
      fromNumber: null,
      issues,
      ready: false,
    };
  }

  let rawFrom: string | null = null;
  if (userId) {
    rawFrom = (await getTenantTwilioPhone(userId)) ?? null;
  }
  if (!rawFrom) {
    rawFrom = process.env.TWILIO_PHONE_NUMBER?.trim() ?? null;
  }

  const fromNumber = rawFrom ? normalizeSmsPhone(rawFrom) : null;

  if (!fromNumber) {
    issues.push(
      userId
        ? "이 업체에 할당된 Vowroad 번호가 없습니다. 연동 설정에서 번호 발급을 완료하세요."
        : "발신 Twilio 번호가 없습니다.",
    );
  } else if (!fromNumber.startsWith("+1")) {
    issues.push(
      "발신 번호는 미국 (+1) Twilio 번호여야 합니다. Geo permissions에서 US SMS도 허용하세요.",
    );
  }

  const fromNumberValid = Boolean(fromNumber?.startsWith("+1"));

  return {
    configured,
    fromNumberValid,
    fromNumber,
    issues,
    ready: configured && fromNumberValid,
  };
}

/** Sync helper when userId is unknown (env fallback only). */
export function getSmsTwilioHealth(): SmsTwilioHealth {
  const issues: string[] = [];
  const configured = isTwilioConfigured();

  if (!configured) {
    issues.push(
      "Twilio 환경 변수가 없습니다. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN를 설정하세요.",
    );
    return {
      configured: false,
      fromNumberValid: false,
      fromNumber: null,
      issues,
      ready: false,
    };
  }

  const rawFrom = process.env.TWILIO_PHONE_NUMBER?.trim() ?? "";
  const fromNumber = normalizeSmsPhone(rawFrom);
  if (!fromNumber) {
    issues.push("테넌트별 Vowroad 번호가 필요합니다.");
  } else if (!fromNumber.startsWith("+1")) {
    issues.push("발신 번호는 미국 (+1) Twilio 번호여야 합니다.");
  }

  const fromNumberValid = Boolean(fromNumber?.startsWith("+1"));
  return {
    configured,
    fromNumberValid,
    fromNumber: fromNumber ?? null,
    issues,
    ready: configured && fromNumberValid,
  };
}
