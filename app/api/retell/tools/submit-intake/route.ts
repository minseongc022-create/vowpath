import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { useKvStore } from "@/lib/kv-config";
import { kvGetSafe } from "@/lib/kv-safe";
import { validateRetellWebhook } from "@/lib/retell-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { isRetellTenantEntitled } from "@/lib/retell-tenant-access";
import { getShopVertical } from "@/lib/vertical-context";
import { extractIntakeFromSpeechForVertical } from "@/lib/call-intake/extraction";
import { generateAiSummary } from "@/lib/call-intake/ai-summary";
import { finalizeVerifiedIntake } from "@/lib/call-intake/finalize-intake";
import { isTenantAfterHours } from "@/lib/after-hours";
import type { VerifiedCallPayload } from "@/lib/call-intake/types";

function submittedKey(callId: string) {
  return `effiroad:retell-intake-submitted:${callId}`;
}

/** True the first time this call submits intake; false on any repeat call from Retell. */
async function claimFirstSubmission(callId: string): Promise<boolean> {
  if (!callId) return true; // no call id to dedupe on — let it through rather than block
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
};

/**
 * Retell custom-function ("tool") endpoint. The agent calls this once per
 * call, after it has naturally collected the caller's name, address, and
 * issue in conversation. Rather than trusting the LLM's own field parsing as
 * the source of truth, we run the FULL call transcript through the same
 * GPT extraction + priority classification + booking pipeline used by the
 * Twilio Gather-based intake flow, so both call paths behave identically.
 *
 * Request shape follows Retell's documented custom-function webhook contract
 * (call context + name + args). Verify against a live Retell test call and
 * adjust field lookups here if Retell's dashboard test shows a mismatch.
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

  if (!to) {
    return NextResponse.json(
      { result: "Sorry, I wasn't able to look up your account. Please call back." },
      { status: 400 },
    );
  }

  const userId = await resolveTenantUserId({ to, from, callSid: callId });
  if (!userId) {
    return NextResponse.json({
      result: "Hmm, I'm not finding this line in our system — try calling back in a bit.",
    });
  }

  // Payment gate (defense in depth): even if a caller reaches the Retell agent
  // directly, an unpaid/expired tenant must not have requests logged for them.
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

  // Prefer the verbatim transcript (same signal quality as the Twilio flow's
  // speech Gather); fall back to the structured args Retell parsed itself if
  // no transcript was provided in this webhook payload.
  const transcriptSource =
    callTranscript ||
    [args.customerName, args.address, args.issueType, args.notes].filter(Boolean).join(". ");

  if (!transcriptSource.trim()) {
    return NextResponse.json({
      result: "Sorry, I missed that — what's your name, the address, and what's going on?",
    });
  }

  try {
    const vertical = await getShopVertical(userId);
    const { draft, confidence } = await extractIntakeFromSpeechForVertical(
      vertical,
      transcriptSource,
      null,
    );
    const afterHours = await isTenantAfterHours(userId);
    const aiSummary = generateAiSummary(draft, draft.priority);

    const payload: VerifiedCallPayload = {
      transcript: transcriptSource,
      customerName: draft.customerName,
      address: draft.address,
      serviceLocation: draft.serviceLocation,
      issueType: draft.issueType,
      symptom: draft.symptom,
      priority: draft.priority,
      servicePriority: draft.servicePriority,
      priorityReasons: draft.priorityReasons,
      prioritySource: draft.prioritySource,
      arrivalWindow: draft.arrivalWindow,
      dispatchNotes: draft.dispatchNotes,
      jobberPasteBlock: draft.jobberPasteBlock,
      callbackPhone: from || "Unknown",
      aiSummary,
      callSid: callId || `retell-${Date.now()}`,
      to,
      confidence,
      verificationComplete: true,
      lossCategory: draft.lossCategory,
      insuranceCarrier: draft.insuranceCarrier,
      insuranceClaimNumber: draft.insuranceClaimNumber,
      waterSource: draft.waterSource,
      activeLoss: draft.activeLoss,
      severity: draft.severity,
      lastServiceYear: draft.lastServiceYear,
      urgency: draft.urgency,
    };

    const result = await finalizeVerifiedIntake(userId, payload, {
      intakeChannel: "phone",
      afterHours,
    });

    if (result.serviceAreaRejected) {
      return NextResponse.json({
        result: result.rejectMessage || "We're not able to service that area, but thank you for calling.",
      });
    }

    return NextResponse.json({
      result:
        "Perfect — you're all set. I've got everything down and our team's gonna be on this. Hang in there — help is on the way.",
    });
  } catch (e) {
    console.error("[retell/tools/submit-intake]", e);
    return NextResponse.json({
      result: "Something glitched on my end — but don't worry, someone from the team will call you back.",
    });
  }
}
