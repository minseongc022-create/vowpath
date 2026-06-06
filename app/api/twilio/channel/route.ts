import { NextResponse } from "next/server";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import {
  createLinkIntakeSession,
  sendLinkIntakeSms,
} from "@/lib/call-intake/link-intake-flow";
import { getTwilioWebhookBaseUrl } from "@/lib/twilio-config";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import {
  twimlGatherDtmfMenu,
  twimlResponse,
  twimlSay,
} from "@/lib/twilio-xml";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateTwilioWebhook(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const form = new URLSearchParams(rawBody);
  const digit = form.get("Digits");
  const speech = (form.get("SpeechResult") ?? "").trim();
  const callSid = form.get("CallSid")?.trim() ?? "";
  const from = form.get("From") ?? "unknown";
  const to = form.get("To") ?? "unknown";

  const base = getTwilioWebhookBaseUrl();
  const menuUrl = `${base}/api/twilio/menu`;

  const continueByPhone =
    digit !== "1" && (Boolean(speech) || digit === "2" || digit === "3" || !digit);

  if (continueByPhone) {
    return new NextResponse(twimlResponse(twimlGatherDtmfMenu(menuUrl)), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const userId = await resolveTenantUserId({ to, callSid });
  if (!userId) {
    return new NextResponse(
      twimlResponse(
        twimlSay(
          "회선 설정이 완료되지 않았습니다. 잠시 후 다시 전화해 주세요.",
          "ko-KR",
        ),
      ),
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  const callbackPhone = from.replace(/^whatsapp:/, "").trim();
  if (!callbackPhone || callbackPhone === "unknown") {
    return new NextResponse(
      twimlResponse(
        twimlSay(
          "문자를 보낼 수 없습니다. 전화 접수로 안내해 드리겠습니다.",
          "ko-KR",
        ) + twimlGatherDtmfMenu(menuUrl),
      ),
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  try {
    const shopName = await shopDisplayNameForUser(userId);
    const session = await createLinkIntakeSession({
      userId,
      callSid,
      from: callbackPhone,
      to,
      shopName,
      menuPriority: null,
    });

    const sms = await sendLinkIntakeSms({
      userId,
      phone: callbackPhone,
      token: session.token,
    });

    if (!sms.ok) {
      console.warn("[twilio/channel] link intake SMS skipped:", sms.error);
      return new NextResponse(
        twimlResponse(
          twimlSay(
            "문자를 보낼 수 없습니다. 전화 접수로 안내해 드리겠습니다.",
            "ko-KR",
          ) + twimlGatherDtmfMenu(menuUrl),
        ),
        { headers: { "Content-Type": "text/xml" } },
      );
    }

    const twiml = twimlResponse(
      twimlSay(
        "접수 링크를 문자로 보내드렸습니다. 휴대폰에서 링크를 열어 요청을 완료해 주세요. 감사합니다.",
        "ko-KR",
      ),
    );
    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (e) {
    console.error("[twilio/channel]", e);
    return new NextResponse(twimlResponse(twimlGatherDtmfMenu(menuUrl)), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
