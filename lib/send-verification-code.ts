import { sendEmail } from "./send-email";
import { sendSms, smsDevPreviewEnabled } from "./send-sms";

export { isEmailConfigured as isEmailDeliveryConfigured } from "./send-email";
export { isSmsConfigured } from "./send-sms";

export async function sendSignupCodeEmail(email: string, code: string) {
  return sendEmail({
    to: email,
    subject: "Effiroad 회원가입 인증번호",
    devLogLabel: "Signup verification code",
    text: [
      "Effiroad 회원가입을 진행 중입니다.",
      "",
      `인증번호: ${code}`,
      "",
      "10분 내에 입력해 주세요. 본인이 요청하지 않았다면 이 메일을 무시하세요.",
      "인증번호는 절대 다른 사람과 공유하지 마세요.",
    ].join("\n"),
  });
}

export async function sendSignupCodeSms(
  phone: string,
  code: string,
  options?: { allowKrRecipient?: boolean },
) {
  const body = `[Effiroad] 회원가입 인증번호: ${code}. 10분 내 입력. 타인에게 공유하지 마세요.`;
  const result = await sendSms(phone, body, "Signup verification SMS", {
    strict: true,
    usRecipientsOnly: options?.allowKrRecipient ? false : undefined,
  });

  if (result.ok) return result;

  // Only surface the raw code locally when a developer has explicitly opted
  // into SMS_DEV_PREVIEW — never as an automatic fallback on send failure.
  if (smsDevPreviewEnabled()) {
    console.info(`[dev] Signup verification SMS → ${phone}: ${code}`);
    return { ok: true as const };
  }

  return result;
}

export async function sendResetCodeEmail(email: string, code: string) {
  return sendEmail({
    to: email,
    subject: "Effiroad 비밀번호 재설정 인증번호",
    devLogLabel: "Password reset code",
    text: [
      "Effiroad 비밀번호 재설정을 요청하셨습니다.",
      "",
      `인증번호: ${code}`,
      "",
      "10분 내에 입력해 주세요. 본인이 요청하지 않았으면 이 메일을 무시하세요.",
      "인증번호는 절대 다른 사람과 공유하지 마세요.",
    ].join("\n"),
  });
}

export async function sendResetCodeSms(phone: string, code: string) {
  return sendSms(
    phone,
    `[Effiroad] 비밀번호 재설정 인증번호: ${code}. 10분 내 입력. 타인에게 공유하지 마세요.`,
    "Password reset SMS",
    { strict: true },
  );
}
