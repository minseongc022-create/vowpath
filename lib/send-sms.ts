import { normalizeSmsPhone } from "./phone";
import { isTwilioConfigured } from "./twilio-config";

type SendResult = { ok: true } | { ok: false; error?: string };

export function isSmsConfigured(): boolean {
  return isTwilioConfigured();
}

export async function sendSms(
  phoneRaw: string,
  body: string,
  devLogLabel: string,
): Promise<SendResult> {
  const phone = normalizeSmsPhone(phoneRaw);
  if (!phone) {
    return { ok: false, error: "휴대폰 번호 형식을 확인해 주세요. (예: 010-1234-5678 또는 +1 512 555 0100)" };
  }

  if (!isTwilioConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[dev] ${devLogLabel} → ${phone}: ${body}`);
      return { ok: true };
    }
    return {
      ok: false,
      error:
        "문자 발송 설정이 없습니다. Vercel에 TWILIO_ACCOUNT_SID, AUTH_TOKEN, PHONE_NUMBER를 추가하세요.",
    };
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );

    await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone,
    });

    return { ok: true };
  } catch (e) {
    console.error("[send-sms]", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("21211") || msg.toLowerCase().includes("invalid")) {
      return { ok: false, error: "수신 번호가 올바르지 않습니다. 국가 코드 포함 번호를 확인해 주세요." };
    }
    if (msg.includes("21608") || msg.includes("21610")) {
      return {
        ok: false,
        error:
          "Twilio Trial: Verified Caller ID에 등록된 번호로만 문자를 보낼 수 있습니다. Upgrade 후 이용하세요.",
      };
    }
    return { ok: false, error: "문자 전송에 실패했습니다. Twilio 설정을 확인해 주세요." };
  }
}
