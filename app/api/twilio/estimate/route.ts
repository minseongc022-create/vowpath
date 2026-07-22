import { NextResponse } from "next/server";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { twilioBlockIfNotEntitled } from "@/lib/tenant-product-access";
import { buildRetellBridgeTwiml } from "@/lib/retell-bridge";
import { isRetellConfigured } from "@/lib/retell-config";
import {
  deleteEstimateState,
  getEstimateState,
  saveEstimateState,
} from "@/lib/estimate-intake/state-store";
import {
  applyEstimateAnswer,
  isEstimateComplete,
} from "@/lib/estimate-intake/flow";
import {
  twimlEstimateLinkFailedGoodbye,
  twimlEstimateLinkGoodbye,
  twimlEstimatePhoneGoodbye,
  twimlForEstimateState,
} from "@/lib/estimate-intake/twiml";
import { summarizeEstimateRequest } from "@/lib/estimate-intake/summarize";
import { notifyOwnerEstimateRequest } from "@/lib/estimate-intake/sms";
import { persistPhoneEstimateLead } from "@/lib/estimate-pipeline";
import { logOperationFailure } from "@/lib/ops-failures";
import { sendVoiceLinkIntakeSms } from "@/lib/call-intake/voice-link-sms";
import {
  createLinkIntakeSession,
  sendLinkIntakeSms,
} from "@/lib/call-intake/link-intake-flow";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import { resolveEstimateChannelChoice } from "@/lib/ivr-channel-choice";
import { buildTwilioCallbackUrl } from "@/lib/twilio-callback-url";
import { twimlGatherEstimateMenu, twimlResponse } from "@/lib/twilio-xml";

function twimlXml(body: string) {
  return new NextResponse(body, { headers: { "Content-Type": "text/xml" } });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateTwilioWebhook(request, rawBody)) {
    console.error("[twilio/estimate] invalid signature:", request.url);
    return twimlXml(twimlEstimateLinkFailedGoodbye());
  }

  const url = new URL(request.url);
  const afterHours = url.searchParams.get("afterHours") === "1";
  const form = new URLSearchParams(rawBody);
  const digit = form.get("Digits");
  const speech = (form.get("SpeechResult") ?? "").trim();
  const callSid = form.get("CallSid")?.trim() ?? url.searchParams.get("callSid") ?? "";
  const from = form.get("From") ?? "unknown";
  const to = form.get("To") ?? "unknown";

  if (!callSid) {
    console.error("[twilio/estimate] missing CallSid; to=", to);
    return twimlXml(twimlEstimateLinkFailedGoodbye());
  }

  const userId = await resolveTenantUserId({ to, callSid });
  if (!userId) {
    console.error("[twilio/estimate] no tenant for To=", to, "callSid=", callSid);
    return twimlXml(twimlEstimateLinkFailedGoodbye());
  }

  const blocked = await twilioBlockIfNotEntitled(userId, "voice");
  if (blocked) return blocked;

  try {
    let state = await getEstimateState(userId, callSid);

    if (!state) {
      const choice = resolveEstimateChannelChoice(digit, speech);

      if (choice === "unclear") {
        const estimateUrl = buildTwilioCallbackUrl("/api/twilio/estimate", {
          callSid,
          ...(afterHours ? { afterHours: "1" } : {}),
        });
        return twimlXml(twimlResponse(twimlGatherEstimateMenu(estimateUrl)));
      }

      if (choice === "phone" && isRetellConfigured()) {
        return twimlXml(
          await buildRetellBridgeTwiml({
            afterHours,
            to,
            from,
            callSid,
            ivrPath: "phone_estimate",
          }),
        );
      }

      // Text link — send SMS immediately; no name/phone questions on the call.
      const sent = await sendVoiceLinkIntakeSms({
        userId,
        callSid,
        from,
        to,
        menuPriority: "P3",
      });
      if (!sent.ok) {
        console.warn("[twilio/estimate] link SMS failed:", sent.error, "to=", from);
        return twimlXml(twimlEstimateLinkFailedGoodbye());
      }
      return twimlXml(twimlEstimateLinkGoodbye());
    }

    const previousPhase = state.phase;
    state = applyEstimateAnswer(state, { speech, digits: digit });

    if (state.phase === previousPhase) {
      // Blank answer — one silent retry on the same question.
      await saveEstimateState(state);
      return twimlXml(twimlForEstimateState(state));
    }

    if (!isEstimateComplete(state)) {
      await saveEstimateState(state);
      return twimlXml(twimlForEstimateState(state));
    }

    await deleteEstimateState(userId, callSid);

    if (state.channel === "link") {
      const callbackPhone = state.answers.callbackPhone || from;
      const shopName = await shopDisplayNameForUser(userId);
      const session = await createLinkIntakeSession({
        userId,
        callSid,
        from: callbackPhone,
        to,
        shopName,
        menuPriority: "P3",
      });
      const sms = await sendLinkIntakeSms({ userId, phone: callbackPhone, token: session.token });
      if (!sms.ok) {
        console.warn("[twilio/estimate] link SMS failed:", sms.error, "to=", callbackPhone);
        return twimlXml(twimlEstimateLinkFailedGoodbye());
      }
      return twimlXml(twimlEstimateLinkGoodbye(state.answers.name));
    }

    // Phone channel — persist estimate lead, then text the shop owner.
    const summary = await summarizeEstimateRequest(state.answers);
    const { jobId } = await persistPhoneEstimateLead({
      userId,
      callSid,
      from,
      to,
      answers: state.answers,
      summary,
    });
    await notifyOwnerEstimateRequest({
      userId,
      callSid,
      answers: state.answers,
      summary,
      jobId,
    });
    return twimlXml(twimlEstimatePhoneGoodbye(state.answers.name));
  } catch (e) {
    console.error("[twilio/estimate]", e);
    await logOperationFailure({
      userId,
      category: "intake",
      operation: "estimate",
      message: e instanceof Error ? e.message : "Estimate flow failed",
      retryable: true,
      callSid,
    });
    return twimlXml(twimlEstimateLinkFailedGoodbye());
  }
}
