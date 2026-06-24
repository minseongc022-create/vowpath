export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getEmailFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() ?? "Vowroad <onboarding@resend.dev>";
}

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  devLogLabel: string;
};

type SendResult = { ok: true } | { ok: false; error?: string };

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[dev] ${input.devLogLabel} → ${input.to}: see email body below`);
      console.info(input.text);
      return { ok: true };
    }
    return {
      ok: false,
      error:
        "이메일 발송 설정이 없습니다. Vercel에 RESEND_API_KEY를 추가하세요. (RESEND_SETUP.md 참고)",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFromAddress(),
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[send-email]", body);
      let message = "이메일 전송에 실패했습니다.";
      try {
        const parsed = JSON.parse(body) as { message?: string };
        if (parsed.message?.includes("only send testing emails to your own email")) {
          message =
            "Resend 무료 테스트: Resend에 등록한 본인 이메일로만 발송됩니다. 도메인 인증 후 모든 주소로 발송 가능합니다.";
        } else if (parsed.message) {
          message = parsed.message;
        }
      } catch {
        /* keep default */
      }
      return { ok: false, error: message };
    }

    return { ok: true };
  } catch (e) {
    console.error("[send-email]", e);
    return { ok: false, error: "이메일 전송에 실패했습니다." };
  }
}
