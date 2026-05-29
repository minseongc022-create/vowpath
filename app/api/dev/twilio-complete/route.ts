import { NextResponse } from "next/server";
import twilio from "twilio";
import { patchEnvLocal } from "@/lib/env-local-patch";
import { getSession } from "@/lib/session";
import { getTwilioWebhookBaseUrl } from "@/lib/twilio-config";

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

  const voiceUrl = `${webhookBase.replace(/\/$/, "")}/api/twilio/voice`;
  const client = twilio(accountSid, authToken);

  const numbers = await client.incomingPhoneNumbers.list({
    phoneNumber,
    limit: 1,
  });

  if (!numbers[0]) {
    return NextResponse.json(
      { error: `Twilio 계정에서 ${phoneNumber} 번호를 찾지 못했습니다.` },
      { status: 404 },
    );
  }

  await numbers[0].update({ voiceUrl, voiceMethod: "POST" });

  return NextResponse.json({
    ok: true,
    phoneNumber,
    voiceUrl,
    message: "Twilio 저장 및 Voice 웹훅 등록 완료. 인증된 휴대폰으로 전화해 보세요.",
  });
}
