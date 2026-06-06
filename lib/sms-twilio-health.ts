import { normalizeSmsPhone } from "./phone";
import { isTwilioConfigured } from "./twilio-config";

export type SmsTwilioHealth = {
  configured: boolean;
  fromNumberValid: boolean;
  fromNumber: string | null;
  issues: string[];
  ready: boolean;
};

export function getSmsTwilioHealth(): SmsTwilioHealth {
  const issues: string[] = [];
  const configured = isTwilioConfigured();

  if (!configured) {
    issues.push(
      "Twilio 환경 변수가 없습니다. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER를 설정하세요.",
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
    issues.push(
      "TWILIO_PHONE_NUMBER 형식이 잘못되었습니다. E.164 형식(+15125550100)으로 입력하세요.",
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
