import { NextResponse } from "next/server";
import { patchEnvLocal } from "@/lib/env-local-patch";
import { getSession } from "@/lib/session";
import { getTwilioWebhookBaseUrl } from "@/lib/twilio-config";
import { ensureTenantTwilioPhone } from "@/lib/twilio-provision";

const DEFAULT_SID = "AC02c2031966fc0fbd8baf35f64ba698b3";
const DEFAULT_PHONE = "+12255291680";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "개발 환경에서만 사용할 수 있습니다." }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let authToken = "";
  try {
    const body = await request.json();
    authToken = typeof body?.authToken === "string" ? body.authToken.trim() : "";
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (authToken.length < 10) {
    return NextResponse.json(
      { error: "Twilio Auth Token을 붙여넣어 주세요. (콘솔 → Account → Auth Token → Show)" },
      { status: 400 },
    );
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || DEFAULT_SID;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim() || DEFAULT_PHONE;
  const webhookBase = getTwilioWebhookBaseUrl();

  if (
    !webhookBase ||
    webhookBase.includes("localhost") ||
    webhookBase.includes("127.0.0.1")
  ) {
    return NextResponse.json(
      {
        error:
          "TWILIO_WEBHOOK_BASE_URL이 없습니다. 터미널에서 npm run tunnel 실행 후 .env.local에 https 주소를 넣고 dev 서버를 재시작하세요.",
      },
      { status: 400 },
    );
  }

  await patchEnvLocal({
    TWILIO_ACCOUNT_SID: accountSid,
    TWILIO_AUTH_TOKEN: authToken,
    TWILIO_PHONE_NUMBER: phoneNumber,
    TWILIO_WEBHOOK_BASE_URL: webhookBase.replace(/\/$/, ""),
    TWILIO_DEFAULT_USER_ID: session.sub,
  });

  process.env.TWILIO_ACCOUNT_SID = accountSid;
  process.env.TWILIO_AUTH_TOKEN = authToken;
  process.env.TWILIO_PHONE_NUMBER = phoneNumber;

  const provisioned = await ensureTenantTwilioPhone(session.sub);
  if (!provisioned.ok) {
    return NextResponse.json({ error: provisioned.error }, { status: 502 });
  }

  const boundPhone = provisioned.phoneNumber;
  const baseUrl = webhookBase.replace(/\/$/, "");
  const voiceUrl = `${baseUrl}/api/twilio/voice`;
  const smsUrl = `${baseUrl}/api/twilio/sms`;

  return NextResponse.json({
    ok: true,
    phoneNumber: boundPhone,
    voiceUrl,
    smsUrl,
    message:
      "Twilio 저장 및 Voice/SMS 웹훅 등록 완료. 전화·문자(1=승인, 2=거절)를 테스트하세요.",
  });
}
