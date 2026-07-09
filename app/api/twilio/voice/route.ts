import { NextResponse } from "next/server";
import { isTenantAfterHours } from "@/lib/after-hours";
import {
  DEFAULT_SHOP_DISPLAY_NAME,
  shopDisplayNameForUser,
} from "@/lib/link-intake-brand";
import { recordInboundEvent } from "@/lib/inbound-events";
import { getTwilioWebhookBaseUrl } from "@/lib/twilio-config";
import { getShopBookingSettings } from "@/lib/shop-settings-db";
import { getCompanyAiMemory } from "@/lib/company-ai-memory";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { twilioBlockIfNotEntitled } from "@/lib/tenant-product-access";
import { getShopProfile } from "@/lib/shop-profile-db";
import { shouldAnswerNow } from "@/lib/answer-schedule";
import { findUserById } from "@/lib/users-db";
import { normalizeSmsPhone } from "@/lib/phone";
import {
  twimlDialToShop,
  twimlGatherMainMenu,
  twimlResponse,
  twimlSay,
  twimlStartCallRecording,
} from "@/lib/twilio-xml";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const form = new URLSearchParams(rawBody);
  const to = form.get("To") ?? "";
  const callSid = form.get("CallSid")?.trim() ?? "";

  if (!validateTwilioWebhook(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let shopName = DEFAULT_SHOP_DISPLAY_NAME;
  let afterHours = false;
  let stormMode = false;
  let customGreeting = "";
  const userId = await resolveTenantUserId({ to, callSid });
  const blocked = await twilioBlockIfNotEntitled(userId, "voice");
  if (blocked) return blocked;

  if (userId) {
    try {
      shopName = await shopDisplayNameForUser(userId);

      // Check temporary closure before doing anything else
      const todayUtc = new Date().toISOString().split("T")[0];
      const memory = await getCompanyAiMemory(userId);
      customGreeting = memory?.customGreeting ?? "";
      if (memory?.temporaryClosureDate === todayUtc) {
        const closedMsg =
          memory?.temporaryClosureMessage ||
          `Thank you for calling ${shopName}. We are closed today. Please call back tomorrow or leave a text message and we'll get back to you.`;
        const twiml = twimlResponse(twimlSay(closedMsg));
        return new NextResponse(twiml, {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      }

      afterHours = await isTenantAfterHours(userId);
      const settings = await getShopBookingSettings(userId);
      stormMode = settings.stormModeEnabled;
      await recordInboundEvent(userId, {
        callSid,
        from: form.get("From") ?? "",
        to,
        status: "voice_started",
        direction: "inbound",
      });

      // "Effiroad number as main line" mode: the shop publishes our number, so
      // there is no carrier forward. During AI answer hours the AI handles the
      // call (menu flow below); outside those hours we ring the shop's own
      // phone live, and only if they don't pick up does the AI catch it
      // (handled by the passthrough-fallback route). No extra setup needed —
      // if they haven't configured any answer schedule, AI stays on 24/7.
      const profile = await getShopProfile(userId);
      if (profile.forwardingProvider === "effiroad_main") {
        const scheduleConfigured = profile.answerScheduleActive;
        const aiAnswersNow = scheduleConfigured ? shouldAnswerNow(profile) : true;
        if (!aiAnswersNow) {
          const owner = await findUserById(userId);
          const shopPhone = normalizeSmsPhone(owner?.phone ?? "");
          if (shopPhone) {
            const base = getTwilioWebhookBaseUrl();
            const fallbackUrl = `${base}/api/twilio/passthrough-fallback?callSid=${encodeURIComponent(callSid)}`;
            const twiml = twimlResponse(
              twimlStartCallRecording(`${base}/api/twilio/recording`) +
                twimlDialToShop(shopPhone, fallbackUrl),
              `${base}/api/twilio/call-status`,
            );
            return new NextResponse(twiml, {
              status: 200,
              headers: { "Content-Type": "text/xml" },
            });
          }
        }
      }
    } catch (e) {
      console.error("[twilio/voice] tenant lookup failed:", e);
    }
  }

  const base = getTwilioWebhookBaseUrl();
  if (!base) {
    console.error(
      "[twilio/voice] empty webhook base URL — set TWILIO_WEBHOOK_BASE_URL or NEXT_PUBLIC_APP_URL; generated TwiML callback URLs will be invalid",
    );
  }
  const statusCallbackUrl = `${base}/api/twilio/call-status`;
  const afterQ = afterHours ? "&afterHours=1" : "";
  const mainMenuUrl = `${base}/api/twilio/main-menu?callSid=${encodeURIComponent(callSid)}${afterQ}`;
  const recordingUrl = `${base}/api/twilio/recording`;

  // Always play the top menu (book/emergency = 1, estimate = 2). The Retell AI
  // agent is dialed later, only on the booking → "talk now" branch, so callers
  // who want a text link or a free estimate aren't forced into the AI call.
  const twiml = twimlResponse(
    twimlStartCallRecording(recordingUrl) +
      twimlGatherMainMenu(mainMenuUrl, shopName, stormMode, customGreeting),
    statusCallbackUrl,
  );

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET() {
  const base = getTwilioWebhookBaseUrl();
  const mainMenuUrl = `${base}/api/twilio/main-menu`;
  const recordingUrl = `${base}/api/twilio/recording`;
  const twiml = twimlResponse(
    twimlStartCallRecording(recordingUrl) +
      twimlGatherMainMenu(mainMenuUrl, DEFAULT_SHOP_DISPLAY_NAME),
  );
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
