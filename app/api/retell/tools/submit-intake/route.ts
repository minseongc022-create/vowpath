import { NextResponse, after } from "next/server";
import { kv } from "@vercel/kv";
import { useKvStore } from "@/lib/kv-config";
import { kvGetSafe } from "@/lib/kv-safe";
import { validateRetellWebhook } from "@/lib/retell-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { isRetellTenantEntitled } from "@/lib/retell-tenant-access";
import { getShopVertical } from "@/lib/vertical-context";
import { extractIntakeFromSpeechForVertical } from "@/lib/call-intake/extraction";
import { resolveAiModelForShop } from "@/lib/plan-ai-shop";
import { generateAiSummary } from "@/lib/call-intake/ai-summary";
import { enrichRetellIntakeForFinalize } from "@/lib/call-intake/retell-verify";
import { finalizeVerifiedIntake } from "@/lib/call-intake/finalize-intake";
import { isTenantAfterHours } from "@/lib/after-hours";
import { preferSpokenPhoneAddress } from "@/lib/address/pending";
import { resolveAddressConfirmationFromIntake } from "@/lib/address/confirmation";
import { resolveSlotById } from "@/lib/scheduling/validate-slot";
import { getShopBookingSettings } from "@/lib/shop-settings-db";
import { findUserById } from "@/lib/users-db";
import {
  extractZipFromAddress,
  isZipInServiceArea,
  serviceAreaRejectMessage,
} from "@/lib/service-area";

function submittedKey(callId: string) {
  return `effiroad:retell-intake-submitted:${callId}`;
}

/** True the first time this call submits intake; false on any repeat call from Retell. */
async function claimFirstSubmission(callId: string): Promise<boolean> {
  if (!callId) return true;
  const key = submittedKey(callId);
  if (useKvStore()) {
    const set = await kv.set(key, "1", { nx: true, ex: 60 * 60 * 6 });
    return Boolean(set);
  }
  const existing = await kvGetSafe<string>(key).catch(() => null);
  return !existing;
}

type SubmitIntakeArgs = {
  customerName?: string;
  address?: string;
  issueType?: string;
  notes?: string;
  slotId?: string;
};

type RetellDynamicVars = {
  twilio_call_sid?: string;
};

/**
 * Retell custom-function endpoint — runs full GPT extraction + address validation
 * + confidence scoring, matching the Twilio Gather intake pipeline.
 *
 * Closing speech returns as soon as extraction + service-area checks finish;
 * SMS / booking / dispatch finalize in `after()` so the caller is not held on the line.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateRetellWebhook(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ result: "Sorry, something got mixed up on our end." }, { status: 400 });
  }

  const call = (body.call ?? {}) as Record<string, unknown>;
  const callId = String(call.call_id ?? body.call_id ?? "");
  const to = String(call.to_number ?? body.to_number ?? "");
  const from = String(call.from_number ?? body.from_number ?? "");
  const args = (body.args ?? body.arguments ?? body.parameters ?? {}) as SubmitIntakeArgs;
  const callTranscript = String(call.transcript ?? body.transcript ?? "").trim();
  const dynamicVars = (call.retell_llm_dynamic_variables ??
    call.dynamic_variables ??
    {}) as RetellDynamicVars;
  const twilioCallSid = String(dynamicVars.twilio_call_sid ?? "").trim();
  const logCallSid = twilioCallSid || callId || `retell-${Date.now()}`;

  if (!to) {
    return NextResponse.json(
      { result: "Sorry, I wasn't able to look up your account. Please call back." },
      { status: 400 },
    );
  }

  const userId = await resolveTenantUserId({ to, from, callSid: logCallSid });
  if (!userId) {
    return NextResponse.json({
      result: "Hmm, I'm not finding this line in our system — try calling back in a bit.",
    });
  }

  if (!(await isRetellTenantEntitled(userId, { to, from }))) {
    return NextResponse.json({
      result:
        "Thanks for calling — looks like this answering service isn't turned on right now. Best to reach the shop directly.",
    });
  }

  const firstSubmission = await claimFirstSubmission(callId);
  if (!firstSubmission) {
    return NextResponse.json({
      result: "You're all good — we already have your info. The team's on it and someone will reach out soon.",
    });
  }

  const transcriptSource =
    callTranscript ||
    [args.customerName, args.address, args.issueType, args.notes].filter(Boolean).join(". ");

  if (!transcriptSource.trim()) {
    return NextResponse.json({
      result: "Sorry, I missed that — what's your name, and what's going on?",
    });
  }

  try {
    const vertical = await getShopVertical(userId);
    const model = await resolveAiModelForShop(userId);
    const { draft, confidence } = await extractIntakeFromSpeechForVertical(
      vertical,
      transcriptSource,
      null,
      { model },
    );
    // Prefer live tool args from Retell (already spoken/confirmed on the call).
    if (args.customerName?.trim()) {
      draft.customerName = args.customerName.trim();
      if (confidence) confidence.customerName = Math.max(confidence.customerName ?? 0, 94);
    }
    if (args.issueType?.trim()) {
      draft.issueType = args.issueType.trim();
      draft.symptom = draft.symptom || args.issueType.trim();
      if (confidence) confidence.issueType = Math.max(confidence.issueType ?? 0, 92);
    }
    // Prefer spoken address from the tool; fall back to extraction; pending marker only if missing.
    draft.address = preferSpokenPhoneAddress(args.address, draft.address);
    if (args.address?.trim() && confidence) {
      confidence.address = Math.max(confidence.address ?? 0, 90);
      confidence.serviceLocation = Math.max(confidence.serviceLocation ?? 0, 88);
    }
    const afterHours = await isTenantAfterHours(userId);
    const aiSummary = generateAiSummary(draft, draft.priority);

    const { payload } = await enrichRetellIntakeForFinalize({
      draft,
      confidence,
      transcriptSource,
      callSid: logCallSid,
      to,
      from,
      aiSummary,
    });
    payload.address = preferSpokenPhoneAddress(args.address, payload.address);
    payload.addressConfirmation = resolveAddressConfirmationFromIntake({
      address: payload.address,
      confidence: payload.confidence,
      channel: "phone",
    });

    let selectedSlot = null;
    if (args.slotId?.trim()) {
      selectedSlot = await resolveSlotById({
        userId,
        slotId: args.slotId.trim(),
        priority: payload.priority ?? draft.priority,
      });
      if (selectedSlot) {
        payload.arrivalWindow = selectedSlot.label;
      }
    }

    // Reject out-of-area before telling the caller they are all set.
    const settings = await getShopBookingSettings(userId);
    if (settings.serviceAreaZips.length > 0 && payload.address) {
      const zip = extractZipFromAddress(payload.address);
      if (!isZipInServiceArea(zip, settings.serviceAreaZips)) {
        const user = await findUserById(userId);
        return NextResponse.json({
          result: serviceAreaRejectMessage(user?.shopName),
        });
      }
    }

    const closing =
      "Perfect — you're all set. I'll text you a secure link to confirm that address and pick your visit time. Our team's on it.";

    after(async () => {
      try {
        await finalizeVerifiedIntake(userId, payload, {
          intakeChannel: "phone",
          afterHours,
          selectedSlot,
        });
      } catch (e) {
        console.error("[retell/tools/submit-intake] background finalize", e);
      }
    });

    return NextResponse.json({ result: closing });
  } catch (e) {
    console.error("[retell/tools/submit-intake]", e);
    return NextResponse.json({
      result: "Something glitched on my end — but don't worry, someone from the team will call you back.",
    });
  }
}
