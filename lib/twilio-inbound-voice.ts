import { isTenantAfterHours } from "./after-hours";
import { getCompanyAiMemory } from "./company-ai-memory";
import { DEFAULT_SHOP_DISPLAY_NAME, shopDisplayNameForUser } from "./link-intake-brand";
import { recordInboundEvent } from "./inbound-events";
import { shouldAnswerNow } from "./answer-schedule";
import { findUserById } from "./users-db";
import { normalizeSmsPhone } from "./phone";
import { getShopBookingSettings } from "./shop-settings-db";
import { getShopProfile } from "./shop-profile-db";
import { resolveShopTimezone } from "./shop-timezone";
import { dateKeyInTimezone } from "./us-timezone";
import { buildTwilioCallbackUrl } from "./twilio-callback-url";
import { getTwilioWebhookBaseUrl } from "./twilio-config";
import { buildRetellBridgeTwiml } from "./retell-bridge";
import { shouldRetellAnswerAllCalls } from "./retell-config";
import {
  twimlDialToShop,
  twimlGatherMainMenu,
  twimlResponse,
  twimlSay,
  twimlStartCallRecording,
} from "./twilio-xml";

export type InboundVoiceContext = {
  callSid: string;
  from: string;
  to: string;
  userId: string | null;
  shopName: string;
  afterHours: boolean;
  stormMode: boolean;
  customGreeting: string;
};

export async function resolveInboundVoiceContext(params: {
  callSid: string;
  from: string;
  to: string;
  userId: string | null;
  forwardedFrom?: string;
}): Promise<InboundVoiceContext> {
  let shopName = DEFAULT_SHOP_DISPLAY_NAME;
  let afterHours = false;
  let stormMode = false;
  let customGreeting = "";

  if (params.userId) {
    try {
      shopName = await shopDisplayNameForUser(params.userId);
      const profile = await getShopProfile(params.userId);
      const todayLocal = dateKeyInTimezone(resolveShopTimezone(profile));
      const memory = await getCompanyAiMemory(params.userId);
      customGreeting = memory?.customGreeting ?? "";

      // Log every inbound call (including closure days) for forwarding tests and metrics.
      await recordInboundEvent(params.userId, {
        callSid: params.callSid,
        from: params.from,
        to: params.to,
        status: "voice_started",
        direction: "inbound",
        forwardedFrom: params.forwardedFrom,
      });

      if (memory?.temporaryClosureDate === todayLocal) {
        return {
          ...params,
          shopName,
          afterHours,
          stormMode,
          customGreeting,
        };
      }
      afterHours = await isTenantAfterHours(params.userId);
      const settings = await getShopBookingSettings(params.userId);
      stormMode = settings.stormModeEnabled;
    } catch (e) {
      console.error("[twilio/inbound-voice] tenant lookup failed:", e);
    }
  }

  return {
    ...params,
    shopName,
    afterHours,
    stormMode,
    customGreeting,
  };
}

export async function buildInboundVoiceTwiml(
  ctx: InboundVoiceContext,
): Promise<string> {
  const base = getTwilioWebhookBaseUrl();
  if (!base) {
    console.error(
      "[twilio/inbound-voice] empty webhook base URL — set TWILIO_WEBHOOK_BASE_URL or NEXT_PUBLIC_APP_URL",
    );
  }

  if (ctx.userId) {
    const profile = await getShopProfile(ctx.userId);
    const todayLocal = dateKeyInTimezone(resolveShopTimezone(profile));
    const memory = await getCompanyAiMemory(ctx.userId);
    if (memory?.temporaryClosureDate === todayLocal) {
      const closedMsg =
        memory?.temporaryClosureMessage ||
        `Thank you for calling ${ctx.shopName}. We are closed today. Please call back tomorrow or leave a text message and we'll get back to you.`;
      return twimlResponse(twimlSay(closedMsg));
    }

    if (profile.forwardingProvider === "effiroad_main") {
      const scheduleConfigured = profile.answerScheduleActive;
      const aiAnswersNow = scheduleConfigured ? shouldAnswerNow(profile) : true;
      if (!aiAnswersNow) {
        const owner = await findUserById(ctx.userId);
        const shopPhone = normalizeSmsPhone(owner?.phone ?? "");
        if (shopPhone) {
          const fallbackUrl = buildTwilioCallbackUrl("/api/twilio/passthrough-fallback", {
            callSid: ctx.callSid,
          });
          const statusCallbackUrl = buildTwilioCallbackUrl("/api/twilio/call-status");
          return twimlResponse(
            twimlStartCallRecording(buildTwilioCallbackUrl("/api/twilio/recording")) +
              twimlDialToShop(shopPhone, fallbackUrl),
            statusCallbackUrl,
          );
        }
      }
    }
  }

  if (shouldRetellAnswerAllCalls()) {
    return buildRetellBridgeTwiml({
      afterHours: ctx.afterHours,
      to: ctx.to,
      from: ctx.from,
      callSid: ctx.callSid,
      includeInboundRecording: true,
    });
  }

  const afterQ = ctx.afterHours ? { afterHours: "1" } : undefined;
  const mainMenuUrl = buildTwilioCallbackUrl("/api/twilio/main-menu", {
    callSid: ctx.callSid,
    ...afterQ,
  });
  const statusCallbackUrl = buildTwilioCallbackUrl("/api/twilio/call-status");
  const recordingUrl = buildTwilioCallbackUrl("/api/twilio/recording");

  return twimlResponse(
    twimlStartCallRecording(recordingUrl) +
      twimlGatherMainMenu(
        mainMenuUrl,
        ctx.shopName,
        ctx.stormMode,
        ctx.customGreeting,
      ),
    statusCallbackUrl,
  );
}
