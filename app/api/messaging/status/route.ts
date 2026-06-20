import { NextResponse } from "next/server";
import { getEmailFromAddress, isEmailConfigured } from "@/lib/send-email";
import { isSmsConfigured } from "@/lib/send-sms";
import { isTwilioConfigured } from "@/lib/twilio-config";
import { getTenantTwilioPhone } from "@/lib/twilio-provision";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  const twilioPhone = session
    ? await getTenantTwilioPhone(session.sub)
    : process.env.TWILIO_PHONE_NUMBER?.trim() ?? null;

  return NextResponse.json({
    emailConfigured: isEmailConfigured(),
    emailFrom: isEmailConfigured() ? getEmailFromAddress() : null,
    smsConfigured: isSmsConfigured(),
    twilioPhone,
    resendNote: !isEmailConfigured()
      ? "RESEND_API_KEY를 Vercel 환경 변수에 추가하세요."
      : getEmailFromAddress().includes("resend.dev")
        ? "테스트 발신: Resend에 가입한 이메일로만 수신 가능. 도메인 인증 후 전체 발송."
        : null,
    twilioNote: !isTwilioConfigured()
      ? "Twilio 환경 변수를 추가하세요."
      : !twilioPhone
        ? "가입 시 Vowpath 번호가 자동 발급됩니다. 연동 설정에서 발급을 완료하세요."
        : "Pay-as-you-go Twilio: US (+1) SMS to customers. Enable United States in Messaging Geo permissions.",
  });
}
