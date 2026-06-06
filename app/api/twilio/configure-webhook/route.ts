import { NextResponse } from "next/server";
import twilio from "twilio";
import { getSession } from "@/lib/session";
import {
  getTwilioWebhookBaseUrl,
  isTwilioConfigured,
} from "@/lib/twilio-config";
import { bindTwilioPhoneToUser } from "@/lib/tenant-routing";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isTwilioConfigured()) {
    return NextResponse.json(
      {
        error:
          ".env.local에 TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER를 설정한 뒤 서버를 재시작하세요.",
      },
      { status: 400 },
    );
  }

  const base = getTwilioWebhookBaseUrl();
  if (!base || base.includes("localhost") || base.includes("127.0.0.1")) {
    return NextResponse.json(
      {
        error:
          "공개 https URL이 필요합니다. Vercel에 NEXT_PUBLIC_APP_URL을 설정하거나 TWILIO_WEBHOOK_BASE_URL을 넣은 뒤 Redeploy 하세요.",
      },
      { status: 400 },
    );
  }

  const phone = process.env.TWILIO_PHONE_NUMBER!.trim();
  const baseUrl = base.replace(/\/$/, "");
  const voiceUrl = `${baseUrl}/api/twilio/voice`;
  const smsUrl = `${baseUrl}/api/twilio/sms`;

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!.trim(),
    process.env.TWILIO_AUTH_TOKEN!.trim(),
  );

  const numbers = await client.incomingPhoneNumbers.list({
    phoneNumber: phone,
    limit: 1,
  });

  if (!numbers[0]) {
    return NextResponse.json(
      {
        error: `Twilio 계정에서 ${phone} 번호를 찾지 못했습니다. 콘솔에서 번호를 구매했는지 확인하세요.`,
      },
      { status: 404 },
    );
  }

  await numbers[0].update({
    voiceUrl,
    voiceMethod: "POST",
    smsUrl,
    smsMethod: "POST",
  });

  await bindTwilioPhoneToUser(phone, session.sub);

  return NextResponse.json({
    ok: true,
    voiceUrl,
    smsUrl,
    phoneNumber: phone,
  });
}
