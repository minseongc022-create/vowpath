import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  configureTwilioWebhooksForNumber,
  ensureTenantTwilioPhone,
  getTenantTwilioPhone,
} from "@/lib/twilio-provision";
import { getTwilioWebhookBaseUrl, isTwilioConfigured } from "@/lib/twilio-config";
import { bindTwilioPhoneToUser } from "@/lib/tenant-routing";
import { findUserById } from "@/lib/users-db";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isTwilioConfigured()) {
    return NextResponse.json(
      {
        error:
          "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN를 설정한 뒤 서버를 재시작하세요.",
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

  let phone = await getTenantTwilioPhone(session.sub);
  if (!phone) {
    const user = await findUserById(session.sub);
    const provisioned = await ensureTenantTwilioPhone(session.sub, {
      shopPhone: user?.phone,
    });
    if (!provisioned.ok) {
      return NextResponse.json({ error: provisioned.error }, { status: 502 });
    }
    phone = provisioned.phoneNumber;
  }

  try {
    const { voiceUrl, smsUrl } = await configureTwilioWebhooksForNumber(phone);
    await bindTwilioPhoneToUser(phone, session.sub);
    return NextResponse.json({
      ok: true,
      voiceUrl,
      smsUrl,
      phoneNumber: phone,
    });
  } catch (e) {
    console.error("[twilio/configure-webhook]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "웹훅 등록에 실패했습니다." },
      { status: 500 },
    );
  }
}
