import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { useKvStore } from "@/lib/kv-config";
import { kvGetSafe } from "@/lib/kv-safe";
import { validateRetellWebhook } from "@/lib/retell-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { isRetellTenantEntitled } from "@/lib/retell-tenant-access";
import { summarizeEstimateRequest } from "@/lib/estimate-intake/summarize";
import { notifyOwnerEstimateRequest } from "@/lib/estimate-intake/sms";
import { persistPhoneEstimateLead } from "@/lib/estimate-pipeline";
import type { EstimateAnswers } from "@/lib/estimate-intake/types";

function submittedKey(callId: string) {
  return `effiroad:retell-estimate-submitted:${callId}`;
}

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

/**
 * Retell custom-function endpoint for FREE ESTIMATE requests — distinct from
 * submit-intake (which books/dispatches a job). Collects project details, saves
 * an estimate lead on the dashboard, and texts the shop owner. Never auto-
 * dispatches and never bills. Pricing stays with the shop.
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
  const args = (body.args ?? body.arguments ?? body.parameters ?? {}) as {
    name?: string;
    address?: string;
    damageType?: string;
    noticedWhen?: string;
    preferredTime?: string;
    callbackPhone?: string;
  };

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

  if (!(await isRetellTenantEntitled(userId, { to, from }))) {
    return NextResponse.json({
      result: "Thanks for calling — looks like this answering service isn't turned on right now. Best to reach the shop directly.",
    });
  }

  const firstSubmission = await claimFirstSubmission(callId);
  if (!firstSubmission) {
    return NextResponse.json({
      result: "You're all set — we already have your estimate request. Someone will reach out soon.",
    });
  }

  const answers: EstimateAnswers = {
    name: args.name?.trim() || undefined,
    callbackPhone: args.callbackPhone?.trim() || (from !== "unknown" ? from : undefined),
    address: args.address?.trim() || undefined,
    damageType: args.damageType?.trim() || undefined,
    noticedWhen: args.noticedWhen?.trim() || undefined,
    preferredTime: args.preferredTime?.trim() || undefined,
  };

  if (!answers.address && !answers.damageType) {
    return NextResponse.json({
      result: "Sorry, I missed that — what do you need an estimate for, and what's the address?",
    });
  }

  try {
    const summary = await summarizeEstimateRequest(answers);
    const { jobId } = await persistPhoneEstimateLead({
      userId,
      callSid: callId || `retell-${Date.now()}`,
      from,
      to,
      answers,
      summary,
    });
    await notifyOwnerEstimateRequest({
      userId,
      callSid: callId || `retell-${Date.now()}`,
      answers,
      summary,
      jobId,
    });

    return NextResponse.json({
      result: "Perfect — you're all set! I've got everything and the team will reach out to schedule your free estimate. Thanks for calling!",
    });
  } catch (e) {
    console.error("[retell/tools/submit-estimate]", e);
    return NextResponse.json({
      result: "Something glitched on my end — but don't worry, someone from the team will call you back.",
    });
  }
}
