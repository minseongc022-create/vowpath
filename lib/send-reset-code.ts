import { isTwilioConfigured } from "./twilio-config";

type SendResult = { ok: true } | { ok: false; error?: string };

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendResetCodeEmail(email: string, code: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() ?? "Vowpath <onboarding@resend.dev>";

  const subject = "Vowpath 비밀번호 재설정 인증번호";
  const text = [
    "Vowpath 비밀번호 재설정을 요청하셨습니다.",
    "",
    `인증번호: ${code}`,
    "",
    "10분 내에 입력해 주세요. 본인이 요청하지 않았다면 이 메일을 무시하세요.",
    "인증번호는 절대 다른 사람과 공유하지 마세요.",
  ].join("\n");

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[dev] Password reset code for ${email}: ${code}`);
      return { ok: true };
    }
    return { ok: false, error: "이메일 발송 설정이 되어 있지 않습니다." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject,
        text,
      }),
    });

    if (!res.ok) {
      console.error("[send-reset-code/email]", await res.text());
      return { ok: false, error: "이메일 전송에 실패했습니다." };
    }

    return { ok: true };
  } catch (e) {
    console.error("[send-reset-code/email]", e);
    return { ok: false, error: "이메일 전송에 실패했습니다." };
  }
}

export async function sendResetCodeSms(phone: string, code: string): Promise<SendResult> {
  if (!isTwilioConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[dev] Password reset SMS for ${phone}: ${code}`);
      return { ok: true };
    }
    return { ok: false, error: "문자 발송 설정이 되어 있지 않습니다." };
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );

    await client.messages.create({
      body: `[Vowpath] 비밀번호 재설정 인증번호: ${code}. 10분 내 입력. 타인에게 공유하지 마세요.`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone,
    });

    return { ok: true };
  } catch (e) {
    console.error("[send-reset-code/sms]", e);
    return { ok: false, error: "문자 전송에 실패했습니다." };
  }
}
