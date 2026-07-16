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

export type RetellBridgeParams = {
  afterHours: boolean;
  to: string;
  from: string;
  callSid?: string;
  intro?: string;
  /** Set when caller chose a path on the Twilio DTMF menu before Retell. */
  ivrPath?: "phone_booking" | "phone_estimate" | "";
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

    let dynamicVariables: Record<string, string> = {};
    if (userId) {
      try {
        const todayUtc = new Date().toISOString().split("T")[0];
        const [shopName, vertical, memory, afterHours, pastMatch] = await Promise.all([
          shopDisplayNameForUser(userId),
          getShopVertical(userId),
          getCompanyAiMemory(userId),
          isTenantAfterHours(userId),
          findRecentCallLogByPhone(userId, params.from),
        ]);
        const isClosedToday = memory?.temporaryClosureDate === todayUtc;
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
