import { NextResponse } from "next/server";
import { AI_BRIEF_ISSUE_MESSAGE, CUSTOMER_REQUEST_RECEIVED_MESSAGE } from "@/lib/booking-policy";
import { CircuitOpenError } from "@/lib/resilience";
import { resolveCallbackFromCallerId } from "@/lib/call-intake/caller-id";
import { finalizeVerifiedIntake } from "@/lib/call-intake/finalize-intake";
import {
  applySlotSelection,
  parseSlotDigit,
  prepareSlotPickPhase,
} from "@/lib/call-intake/slot-pick-flow";
import { twimlForIntakeState, twimlGoodbyeAfterCommit, twimlErrorGoodbye, parseDtmfYesNo } from "@/lib/call-intake/intake-twiml";
import {
  deleteIntakeState,
  getIntakeState,
  saveIntakeState,
} from "@/lib/call-intake/state-store";
import type { CallIntakeState, MandatoryVerifyField } from "@/lib/call-intake/types";
import { MANDATORY_VERIFY_FIELDS } from "@/lib/call-intake/types";
import {
  applyFieldValue,
  applyOptionalFieldAnswer,
  advanceToOptionalCollectOrSlotPick,
  buildVerifiedPayload,
  canFastTrackPhoneIntake,
  markFieldVerified,
  runExtractionAfterCollect,
  startRepeatForField,
  autoVerifyConfidentFields,
} from "@/lib/call-intake/verification-flow";
import { validateServiceAddress } from "@/lib/call-intake/address-validation";
import { logOperationFailure } from "@/lib/ops-failures";
import { recordCallIntakeFailed } from "@/lib/record-tenant-events";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { validateTwilioWebhook } from "@/lib/twilio-signature";
import { parsePriorityParam } from "@/lib/twilio-voice-flow";
import { twimlGatherSpeechDetailed, twimlResponse, twimlSay } from "@/lib/twilio-xml";
import type { JobPriority } from "@/lib/types";
import { legacyToServicePriority } from "@/lib/service-priority";
import {
  buildLinkIntakeFallbackTwiml,
  bumpPhoneIntakeStrike,
  shouldOfferLinkIntakeFallback,
} from "@/lib/call-intake/phone-link-fallback";
import { voiceCollectRetry } from "@/lib/voice-copy";
import { findRecentCallLogByPhone } from "@/lib/call-logs";
import { getShopVertical } from "@/lib/vertical-context";
import type { ShopVertical } from "@/lib/shop-vertical.js";
import { withDistributedLock } from "@/lib/distributed-lock";

function emptyDraft(priority: JobPriority) {
  return {
    customerName: "Unknown",
    address: "Unknown",
    serviceLocation: "Unknown",
    issueType: "Service request",
    symptom: "Service call",
    priority,
    servicePriority: legacyToServicePriority(priority),
    priorityReasons: [] as string[],
    prioritySource: "ai" as const,
    arrivalWindow: "Pending shop review",
    dispatchNotes: "",
    jobberPasteBlock: "",
    lossCategory: "other" as const,
  };
}

function newIntakeState(params: {
  callSid: string;
  userId: string;
  from: string;
  to: string;
  menuPriority: JobPriority | null;
  vertical: ShopVertical;
  afterHours?: boolean;
  returningCustomerMatch?: {
    customerName: string;
    address: string;
    serviceLocation: string;
  } | null;
}): CallIntakeState {
  const priority = params.menuPriority ?? "P2";
  return {
    callSid: params.callSid,
    userId: params.userId,
    from: params.from,
    to: params.to,
    menuPriority: params.menuPriority,
    vertical: params.vertical,
    phase: params.returningCustomerMatch ? "returning_customer" : "collect",
    returningCustomerMatch: params.returningCustomerMatch ?? null,
    rawTranscript: "",
    draft: emptyDraft(priority),
    confidence: {
      customerName: 0,
      address: 0,
      serviceLocation: 0,
      issueType: 0,
    },
    verified: {},
    callbackPhone: resolveCallbackFromCallerId(params.from),
    attempt: 1,
    afterHours: params.afterHours,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function isMandatoryField(value: string | null): value is MandatoryVerifyField {
  return MANDATORY_VERIFY_FIELDS.includes(value as MandatoryVerifyField);
}

// Serializes concurrent webhook requests for the same callSid (Twilio retries,
// double-taps landing on different serverless instances) so they don't
// read-modify-write the intake state out of order. Backed by KV in prod.
function withIntakeLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  return withDistributedLock(`intake:${key}`, fn);
}

async function afterVerificationStep(state: CallIntakeState): Promise<CallIntakeState> {
  if (state.phase !== "slot_pick") return state;
  return prepareSlotPickPhase(state);
}

async function commitIntake(
  userId: string,
  state: CallIntakeState,
): Promise<Response> {
  const payload = buildVerifiedPayload(state);
  await finalizeVerifiedIntake(userId, payload, {
    intakeChannel: "phone",
    selectedSlot: state.selectedSlot ?? null,
    afterHours: state.afterHours,
  });
  await deleteIntakeState(userId, state.callSid);
  return new NextResponse(
    twimlGoodbyeAfterCommit(Boolean(state.selectedSlot), state.afterHours),
    { headers: { "Content-Type": "text/xml" } },
  );
}

async function offerLinkFallbackAndClose(
  userId: string,
  state: CallIntakeState,
): Promise<Response> {
  await deleteIntakeState(userId, state.callSid);
  const twiml = await buildLinkIntakeFallbackTwiml({
    userId,
    callSid: state.callSid,
    callbackPhone: state.callbackPhone || state.from,
    to: state.to,
  });
  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateTwilioWebhook(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const url = new URL(request.url);
  const phase = url.searchParams.get("phase") ?? "collect";
  const callSidParam = url.searchParams.get("callSid") ?? "";
  const attempt = Number(url.searchParams.get("attempt") ?? "1");

  const form = new URLSearchParams(rawBody);
  const callSid = (form.get("CallSid") ?? callSidParam).trim();
  const from = form.get("From") ?? "unknown";
  const to = form.get("To") ?? "unknown";
  const speech = (form.get("SpeechResult") ?? "").trim();
  const digit = form.get("Digits");
  const confidenceRaw = form.get("Confidence");
  const speechConfidence =
    confidenceRaw !== null && Number.isFinite(Number(confidenceRaw))
      ? Number(confidenceRaw)
      : null;

  const menuPriority = parsePriorityParam(url.searchParams.get("priority"));
  const afterHours = url.searchParams.get("afterHours") === "1";

  const userId = await resolveTenantUserId({ to, callSid });
  if (!userId) {
    return new NextResponse(
      twimlErrorGoodbye(
        "This line is not fully set up yet. Please call back later or contact your office during business hours.",
      ),
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  const lockKey = callSid || userId;
  return withIntakeLock(lockKey, async () => {
  let state = callSid ? await getIntakeState(userId, callSid) : null;
  if (!state) {
    const vertical = await getShopVertical(userId);
    const callbackPhone = resolveCallbackFromCallerId(from);
    const pastMatch = await findRecentCallLogByPhone(userId, callbackPhone);
    state = newIntakeState({
      callSid,
      userId,
      from,
      to,
      menuPriority,
      afterHours,
      vertical,
      returningCustomerMatch: pastMatch
        ? {
            customerName: pastMatch.customerName ?? "",
            address: pastMatch.address ?? "",
            serviceLocation: pastMatch.serviceLocation || pastMatch.address || "",
          }
        : null,
    });
  }

  if (state.userId !== userId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    if (phase === "returning_customer") {
      const answer = parseDtmfYesNo(digit);
      const match = state.returningCustomerMatch;
      if (answer === "yes" && match) {
        state.draft.customerName = match.customerName;
        state.draft.address = match.address;
        state.draft.serviceLocation = match.serviceLocation;
        state.confidence.customerName = 100;
        state.confidence.address = 100;
        state.confidence.serviceLocation = 100;
        state.verified.customerName = true;
        state.verified.address = true;
        state.verified.serviceLocation = true;
      }
      state.returningCustomerMatch = null;
      state.phase = "collect";
      await saveIntakeState(state);
      return new NextResponse(twimlForIntakeState(state), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    if (phase === "collect") {
      if (!speech || speech.length < 8) {
        state = bumpPhoneIntakeStrike(state);
        await saveIntakeState(state);

        if (shouldOfferLinkIntakeFallback(state)) {
          await logOperationFailure({
            userId,
            category: "intake",
            operation: "collect",
            message: "Speech unclear — SMS link fallback",
            retryable: false,
            callSid,
          });
          return offerLinkFallbackAndClose(userId, state);
        }

        if (attempt < 2) {
          const retryUrl = new URL(request.url);
          retryUrl.searchParams.set("attempt", String(attempt + 1));
          const twiml = twimlResponse(
            twimlGatherSpeechDetailed(retryUrl.toString(), voiceCollectRetry),
          );
          return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
        }

        await logOperationFailure({
          userId,
          category: "intake",
          operation: "collect",
          message: "Speech too short after retries",
          retryable: false,
          callSid,
        });
        return offerLinkFallbackAndClose(userId, state);
      }

      // Low-confidence speech recognition — ask the caller to repeat, up to 2 times.
      if (speechConfidence !== null && speechConfidence < 0.6 && attempt < 3) {
        const retryUrl = new URL(request.url);
        retryUrl.searchParams.set("attempt", String(attempt + 1));
        const twiml = twimlResponse(
          twimlGatherSpeechDetailed(
            retryUrl.toString(),
            "I'm sorry, I didn't catch that clearly. Could you say that again?",
          ),
        );
        return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
      }

      // Anything below 0.75 (including the "still low after 2 retries" case) gets tagged
      // so the extraction prompt knows to lean on contextual inference.
      const lowConfidenceTranscript = speechConfidence !== null && speechConfidence < 0.75;

      state.rawTranscript = speech;
      state = await runExtractionAfterCollect(state, { lowConfidence: lowConfidenceTranscript });

      if (canFastTrackPhoneIntake(state)) {
        state = autoVerifyConfidentFields(state);
        state = advanceToOptionalCollectOrSlotPick(state);
        if (state.phase === "slot_pick") {
          state = await prepareSlotPickPhase(state);
        }
        if (state.phase === "final") {
          return commitIntake(userId, state);
        }
        await saveIntakeState(state);
        return new NextResponse(twimlForIntakeState(state), {
          headers: { "Content-Type": "text/xml" },
        });
      }

      await saveIntakeState(state);
      return new NextResponse(twimlForIntakeState(state), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    if (phase === "repeat") {
      const field = url.searchParams.get("field");
      if (!isMandatoryField(field) || !speech || speech.length < 3) {
        state = bumpPhoneIntakeStrike(state);
        await saveIntakeState(state);
        if (shouldOfferLinkIntakeFallback(state)) {
          return offerLinkFallbackAndClose(userId, state);
        }
        const twiml = twimlForIntakeState(
          field && isMandatoryField(field)
            ? startRepeatForField(state, field)
            : state,
        );
        return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
      }

      state = await applyFieldValue(state, field, speech);

      if (field === "address") {
        const check = await validateServiceAddress(state.draft.address);
        state.addressValidation = {
          valid: check.valid,
          formattedAddress: check.formattedAddress,
          provider: check.provider,
        };
        if (!check.valid) {
          state.phase = "address_retry";
          state.activeField = "address";
          await saveIntakeState(state);
          return new NextResponse(twimlForIntakeState(state), {
            headers: { "Content-Type": "text/xml" },
          });
        }
        if (check.formattedAddress) {
          state.draft.address = check.formattedAddress;
        }
      }

      state.phase = "verify";
      state.activeField = field;
      await saveIntakeState(state);
      return new NextResponse(twimlForIntakeState(state), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    if (phase === "verify") {
      const field = url.searchParams.get("field");
      const answer = parseDtmfYesNo(digit);
      if (!isMandatoryField(field) || !answer) {
        return new NextResponse(twimlForIntakeState(state), {
          headers: { "Content-Type": "text/xml" },
        });
      }

      if (answer === "no") {
        state = bumpPhoneIntakeStrike(state);
        if (shouldOfferLinkIntakeFallback(state)) {
          return offerLinkFallbackAndClose(userId, state);
        }
        state = startRepeatForField(state, field);
        await saveIntakeState(state);
        return new NextResponse(twimlForIntakeState(state), {
          headers: { "Content-Type": "text/xml" },
        });
      }

      state = markFieldVerified(state, field);
      state = await afterVerificationStep(state);
      await saveIntakeState(state);
      return new NextResponse(twimlForIntakeState(state), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    if (phase === "optional_collect") {
      const fieldKey = url.searchParams.get("field") ?? state.activeOptionalField ?? null;
      state = fieldKey
        ? applyOptionalFieldAnswer(state, fieldKey, { digit, speech })
        : advanceToOptionalCollectOrSlotPick(state);

      if (state.phase === "slot_pick") {
        state = await prepareSlotPickPhase(state);
      }
      if (state.phase === "final") {
        return commitIntake(userId, state);
      }
      await saveIntakeState(state);
      return new NextResponse(twimlForIntakeState(state), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    if (phase === "slot_pick") {
      const count = state.offeredSlots?.length ?? 0;
      if (count === 0) {
        state = await prepareSlotPickPhase(state);
        await saveIntakeState(state);
        return new NextResponse(twimlForIntakeState(state), {
          headers: { "Content-Type": "text/xml" },
        });
      }
      const index = parseSlotDigit(digit, count);
      if (index === null) {
        return new NextResponse(twimlForIntakeState(state), {
          headers: { "Content-Type": "text/xml" },
        });
      }
      state = applySlotSelection(state, index);
      await saveIntakeState(state);
      return new NextResponse(twimlForIntakeState(state), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    if (phase === "final") {
      const answer = parseDtmfYesNo(digit);
      if (answer !== "yes") {
        state = {
          ...newIntakeState({
            callSid,
            userId,
            from,
            to,
            menuPriority: state.menuPriority,
            vertical: state.vertical,
          }),
          recordingUrl: state.recordingUrl,
          recordingSid: state.recordingSid,
        };
        await saveIntakeState(state);
        return new NextResponse(twimlForIntakeState(state), {
          headers: { "Content-Type": "text/xml" },
        });
      }

      for (const field of MANDATORY_VERIFY_FIELDS) {
        if (!state.verified[field]) {
          state.phase = "verify";
          state.activeField = field;
          await saveIntakeState(state);
          return new NextResponse(twimlForIntakeState(state), {
            headers: { "Content-Type": "text/xml" },
          });
        }
      }

      return commitIntake(userId, state);
    }
  } catch (e) {
    console.error("[twilio/intake]", phase, e);
    const message = e instanceof Error ? e.message : "Intake failed";
    const isAiOutage = e instanceof CircuitOpenError || /^OPENAI_/.test(message);
    await logOperationFailure({
      userId,
      category: phase === "collect" ? "ai" : "intake",
      operation: phase,
      message,
      retryable: true,
      callSid,
    });
    try {
      await recordCallIntakeFailed({ userId, callSid, message });
    } catch {
      /* ignore */
    }
    return new NextResponse(
      twimlResponse(
        twimlSay(isAiOutage ? AI_BRIEF_ISSUE_MESSAGE : CUSTOMER_REQUEST_RECEIVED_MESSAGE),
      ),
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  return new NextResponse(twimlForIntakeState(state), {
    headers: { "Content-Type": "text/xml" },
  });
  });
}
