import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { useKvStore } from "@/lib/kv-config";
import { kvGetSafe } from "@/lib/kv-safe";
import { validateRetellWebhook } from "@/lib/retell-signature";
import { resolveTenantUserId } from "@/lib/tenant-routing";
import { isRetellTenantEntitled } from "@/lib/retell-tenant-access";
import { summarizeEstimateRequest } from "@/lib/estimate-intake/summarize";
import { notifyOwnerEstimateRequest } from "@/lib/estimate-intake/sms";
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
 * submit-intake (which books/dispatches a job). This never creates a booking
 * or dispatches anyone: it only collects the caller's project details and
 * forwards a clean summary to the shop owner by text, exactly like the
 * scripted phone-estimate flow in app/api/twilio/estimate/route.ts. The AI
 * does not calculate or quote a price — pricing stays with the shop.
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
    return NextResponse.json({ result: "Sorry, something went wrong on our end." }, { status: 400 });
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
      result: "This line isn't fully set up yet — please call back later or reach out during business hours.",
    });
  }

  if (!(await isRetellTenantEntitled(userId, { to, from }))) {
    return NextResponse.json({
      result: "Thanks for calling. This answering service isn't active right now — please contact the business directly.",
    });
  }

  const firstSubmission = await claimFirstSubmission(callId);
  if (!firstSubmission) {
    return NextResponse.json({
      result: "I've already got your estimate request logged — the team will follow up shortly.",
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
      result: "I didn't quite catch the project details — could you describe what you need an estimate for, and the address?",
    });
  }

  try {
    const summary = await summarizeEstimateRequest(answers);
    await notifyOwnerEstimateRequest({
      userId,
      callSid: callId || `retell-${Date.now()}`,
      answers,
      summary,
    });

    return NextResponse.json({
      result: "Perfect — I've sent your estimate request to the team. They'll follow up with you soon.",
    });
  } catch (e) {
    console.error("[retell/tools/submit-estimate]", e);
    return NextResponse.json({
      result: "I'm having trouble logging that right now, but a team member will follow up with you directly.",
    });
  }
}
