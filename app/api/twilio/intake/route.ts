import { NextResponse } from "next/server";
import { CUSTOMER_REQUEST_RECEIVED_MESSAGE } from "@/lib/booking-policy";
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
  };
}

function newIntakeState(params: {
  callSid: string;
  userId: string;
  from: string;
  to: string;
  menuPriority: JobPriority | null;
}): CallIntakeState {
  const priority = params.menuPriority ?? "P2";
  return {
    callSid: params.callSid,
    userId: params.userId,
    from: params.from,
    to: params.to,
    menuPriority: params.menuPriority,
    phase: "collect",
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function isMandatoryField(value: string | null): value is MandatoryVerifyField {
  return MANDATORY_VERIFY_FIELDS.includes(value as MandatoryVerifyField);
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
  });
  await deleteIntakeState(userId, state.callSid);
  return new NextResponse(
    twimlGoodbyeAfterCommit(Boolean(state.selectedSlot)),
    { headers: { "Content-Type": "text/xml" } },
  );
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

  const menuPriority = parsePriorityParam(url.searchParams.get("priority"));

  const userId = await resolveTenantUserId({ to, callSid });
  if (!userId) {
    return new NextResponse(
      twimlErrorGoodbye(
        "This line is not fully set up yet. Please call back later or contact your office during business hours.",
      ),
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  let state =
    (callSid ? await getIntakeState(userId, callSid) : null) ??
    newIntakeState({ callSid, userId, from, to, menuPriority });

  if (state.userId !== userId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    if (phase === "collect") {
      if (!speech || speech.length < 8) {
        if (attempt < 2) {
          const retryUrl = new URL(request.url);
          retryUrl.searchParams.set("attempt", String(attempt + 1));
          const twiml = twimlResponse(
            twimlGatherSpeechDetailed(
              retryUrl.toString(),
              "Sorry, I did not catch that. Please try again, slowly.",
            ),
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
        return new NextResponse(
          twimlErrorGoodbye("We could not record your message. Please call back. Goodbye."),
          { headers: { "Content-Type": "text/xml" } },
        );
      }

      state.rawTranscript = speech;
      state = await runExtractionAfterCollect(state);

      if (canFastTrackPhoneIntake(state)) {
        state = autoVerifyConfidentFields(state);
        state = { ...state, phase: "slot_pick" };
        state = await prepareSlotPickPhase(state);
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
        const twiml = twimlForIntakeState(
          field && isMandatoryField(field)
            ? startRepeatForField(state, field)
            : state,
        );
        return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
      }

      state = applyFieldValue(state, field, speech);

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
          ...newIntakeState({ callSid, userId, from, to, menuPriority: state.menuPriority }),
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
    return new NextResponse(twimlResponse(twimlSay(CUSTOMER_REQUEST_RECEIVED_MESSAGE)), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  return new NextResponse(twimlForIntakeState(state), {
    headers: { "Content-Type": "text/xml" },
  });
}
