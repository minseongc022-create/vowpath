import { isTenantAfterHours } from "./after-hours";
import { getCompanyAiMemory } from "./company-ai-memory";
import { DEFAULT_SHOP_DISPLAY_NAME, shopDisplayNameForUser } from "./link-intake-brand";
import { getShopVertical } from "./vertical-context";
import {
  isRetellConfigured,
  registerRetellInboundCall,
  resolveRetellForwardNumber,
} from "./retell-config";
import { resolveTenantUserId } from "./tenant-routing";
import { buildTwilioCallbackUrl } from "./twilio-callback-url";
import {
  twimlDialForward,
  twimlDialRetellSip,
  twimlGatherSpeechDetailed,
  twimlResponse,
  twimlStartCallRecording,
} from "./twilio-xml";
import { voicePhoneIntakeIntro, voicePhoneIntakePrompt } from "./voice-copy";
import { intakeUrlForMenu } from "./call-intake/intake-twiml";
import { findRecentCallLogByPhone } from "./call-logs";
import {
  buildRetellIntakeGuide,
  buildReturningCustomerHint,
} from "./retell-intake-guide";
import { buildRetellOpeningLine, type RetellIvrPath } from "./retell-opening-line";
import { getShopProfile } from "./shop-profile-db";
import { resolveShopTimezone } from "./shop-timezone";
import { dateKeyInTimezone } from "./us-timezone";

export type RetellBridgeParams = {
  afterHours: boolean;
  to: string;
  from: string;
  callSid?: string;
  intro?: string;
  /** Set when caller chose a path on the Twilio DTMF menu before Retell. */
  ivrPath?: "phone_booking" | "phone_estimate" | "booking_choice" | "estimate_choice" | "";
  /** Add call recording + status callbacks (first inbound webhook). */
  includeInboundRecording?: boolean;
};

function wrapInboundTwiml(params: RetellBridgeParams, inner: string): string {
  if (!params.includeInboundRecording) {
    return twimlResponse(inner);
  }
  const recordingUrl = buildTwilioCallbackUrl("/api/twilio/recording");
  const statusCallbackUrl = buildTwilioCallbackUrl("/api/twilio/call-status");
  return twimlResponse(
    twimlStartCallRecording(recordingUrl) + inner,
    statusCallbackUrl,
  );
}

/** Connect caller to Retell conversational AI (SIP first, PSTN fallback). */
export async function buildRetellBridgeTwiml(
  params: RetellBridgeParams,
): Promise<string> {
  const fallbackUrl = buildTwilioCallbackUrl("/api/twilio/dial-fallback", {
    ...(params.afterHours ? { afterHours: "1" } : {}),
  });
  const callerId = params.to !== "unknown" ? params.to : undefined;

  if (isRetellConfigured()) {
    const userId = await resolveTenantUserId({
      to: params.to,
      from: params.from,
      callSid: params.callSid,
    });

    if (
      params.callSid &&
      (params.ivrPath === "estimate_choice" || params.ivrPath === "phone_estimate")
    ) {
      try {
        const { markCallPathEstimate } = await import("./call-path-meter");
        await markCallPathEstimate(params.callSid);
      } catch (e) {
        console.warn("[retell-bridge] mark estimate path", e);
      }
    }

    let dynamicVariables: Record<string, string> = {};
    if (userId) {
      try {
        const profile = await getShopProfile(userId);
        const todayLocal = dateKeyInTimezone(resolveShopTimezone(profile));
        const [shopName, vertical, memory, afterHours, pastMatch] = await Promise.all([
          shopDisplayNameForUser(userId),
          getShopVertical(userId),
          getCompanyAiMemory(userId),
          isTenantAfterHours(userId),
          findRecentCallLogByPhone(userId, params.from),
        ]);
        const isClosedToday = memory?.temporaryClosureDate === todayLocal;
        dynamicVariables = {
          shop_name: shopName,
          vertical: String(vertical ?? ""),
          after_hours: afterHours ? "true" : "false",
          closed_message: isClosedToday
            ? memory?.temporaryClosureMessage ||
              `Thank you for calling ${shopName}. We are closed today.`
            : "",
          custom_greeting: memory?.customGreeting ?? "",
          ivr_path: params.ivrPath ?? "",
          opening_line: buildRetellOpeningLine((params.ivrPath ?? "") as RetellIvrPath),
          intake_guide: buildRetellIntakeGuide(vertical),
          returning_customer: buildReturningCustomerHint(
            pastMatch
              ? {
                  customerName: pastMatch.customerName ?? "",
                  address: pastMatch.address ?? "",
                }
              : null,
          ),
          twilio_call_sid: params.callSid ?? "",
        };
      } catch (e) {
        console.warn("[retell-bridge] tenant context failed:", e);
        dynamicVariables = { shop_name: DEFAULT_SHOP_DISPLAY_NAME };
      }
    }

    const registered = await registerRetellInboundCall({
      from: params.from,
      to: params.to,
      dynamicVariables,
      ivrPath: params.ivrPath,
    });
    if (registered.ok) {
      console.log("[retell-bridge] SIP connect call_id=", registered.callId);
      return wrapInboundTwiml(params, twimlDialRetellSip(registered.callId, fallbackUrl));
    }
    console.warn("[retell-bridge] SIP register failed:", registered.error);
  }

  const pstn = await resolveRetellForwardNumber();
  if (pstn) {
    console.warn("[retell-bridge] falling back to PSTN dial:", pstn);
    return wrapInboundTwiml(params, twimlDialForward(pstn, callerId, fallbackUrl));
  }

  const gatherUrl = intakeUrlForMenu("P2", params.afterHours);
  return wrapInboundTwiml(
    params,
    twimlGatherSpeechDetailed(
      gatherUrl,
      params.intro ?? voicePhoneIntakeIntro,
      voicePhoneIntakePrompt,
    ),
  );
}
