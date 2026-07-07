import { NextResponse } from "next/server";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import {
  createLinkIntakeSession,
  sendLinkIntakeSms,
} from "@/lib/call-intake/link-intake-flow";
import {
  deleteEstimateState,
  getEstimateState,
  saveEstimateState,
} from "@/lib/estimate-intake/state-store";
import {
  applyEstimateAnswer,
  isEstimateComplete,
  newEstimateState,
} from "@/lib/estimate-intake/flow";
import {
  twimlEstimateLinkFailedGoodbye,
  twimlEstimateLinkGoodbye,
  twimlEstimatePhoneGoodbye,
  twimlForEstimateState,
} from "@/lib/estimate-intake/twiml";
import { summarizeEstimateRequest } from "@/lib/estimate-intake/summarize";
import { notifyOwnerEstimateRequest } from "@/lib/estimate-intake/sms";
import { logOperationFailure } from "@/lib/ops-failures";

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

  try {
    let state = await getEstimateState(userId, callSid);

    if (!state) {
      // First hit after the sub-menu prompt: the digit chooses the channel.
      // 1 = give details by phone now, 2 = get an estimate form by text.
      const channel = digit === "1" ? "phone" : "link";
      state = newEstimateState({ callSid, userId, from, to, channel, afterHours });
      await saveEstimateState(state);
      return twimlXml(twimlForEstimateState(state));
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
        menuPriority: null,
      });
      const sms = await sendLinkIntakeSms({ userId, phone: callbackPhone, token: session.token });
      if (!sms.ok) {
        console.warn("[twilio/estimate] link SMS failed:", sms.error, "to=", callbackPhone);
        return twimlXml(twimlEstimateLinkFailedGoodbye());
      }
      return twimlXml(twimlEstimateLinkGoodbye(state.answers.name));
    }

    // Phone channel — clean up the answers with GPT, then text the shop owner.
    const summary = await summarizeEstimateRequest(state.answers);
    await notifyOwnerEstimateRequest({
      userId,
      callSid,
      answers: state.answers,
      summary,
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
