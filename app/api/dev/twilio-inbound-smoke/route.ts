import { NextResponse } from "next/server";
import { POST as voicePost } from "@/app/api/twilio/voice/route";
import { POST as channelPost } from "@/app/api/twilio/channel/route";
import { POST as intakePost } from "@/app/api/twilio/intake/route";
import { getSession } from "@/lib/session";
import { getTenantTwilioPhone } from "@/lib/twilio-provision";

type Step = "voice" | "channel_sms" | "channel_phone" | "intake_speech";

function twilioForm(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

async function runStep(
  step: Step,
  ctx: { to: string; from: string; callSid: string },
): Promise<{ ok: boolean; detail?: string; error?: string }> {
  try {
    switch (step) {
      case "voice": {
        const body = twilioForm({
          To: ctx.to,
          From: ctx.from,
          CallSid: ctx.callSid,
        });
        const req = new Request("http://localhost/api/twilio/voice", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
        const res = await voicePost(req);
        const xml = await res.text();
        if (!res.ok || !xml.includes("<Response")) {
          return { ok: false, error: `voice HTTP ${res.status}` };
        }
        return { ok: true, detail: "TwiML voice greeting" };
      }
      case "channel_sms": {
        const body = twilioForm({
          To: ctx.to,
          From: ctx.from,
          CallSid: ctx.callSid,
          Digits: "2",
        });
        const req = new Request(
          `http://localhost/api/twilio/channel?callSid=${encodeURIComponent(ctx.callSid)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
          },
        );
        const res = await channelPost(req);
        const xml = await res.text();
        if (!res.ok) return { ok: false, error: `channel_sms HTTP ${res.status}` };
        return {
          ok: true,
          detail: xml.includes("text message") || xml.includes("SMS") ? "SMS link path" : "TwiML ok",
        };
      }
      case "channel_phone": {
        const body = twilioForm({
          To: ctx.to,
          From: ctx.from,
          CallSid: ctx.callSid,
          Digits: "1",
        });
        const req = new Request(
          `http://localhost/api/twilio/channel?callSid=${encodeURIComponent(ctx.callSid)}&afterHours=1`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
          },
        );
        const res = await channelPost(req);
        const xml = await res.text();
        if (!res.ok) return { ok: false, error: `channel_phone HTTP ${res.status}` };
        return {
          ok: true,
          detail: xml.includes("<Gather") ? "Phone speech gather" : "TwiML ok",
        };
      }
      case "intake_speech": {
        const speech =
          "Sarah Johnson, one two three Main Street Austin Texas, no cool, indoor eighty-five degrees.";
        const body = twilioForm({
          To: ctx.to,
          From: ctx.from,
          CallSid: ctx.callSid,
          SpeechResult: speech,
        });
        const req = new Request(
          "http://localhost/api/twilio/intake?menuPriority=P2&afterHours=1",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
          },
        );
        const res = await intakePost(req);
        const xml = await res.text();
        if (!res.ok) return { ok: false, error: `intake HTTP ${res.status}` };
        return {
          ok: true,
          detail: xml.length > 20 ? "Speech intake processed" : "empty TwiML",
        };
      }
      default:
        return { ok: false, error: "unknown step" };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Dev-only: exercise Twilio voice/SMS/intake handlers without signature (no token in dev). */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let steps: Step[] = ["voice", "channel_sms", "channel_phone"];
  let to = "";
  let from = "";
  try {
    const body = await request.json();
    if (Array.isArray(body?.steps)) steps = body.steps;
    to = String(body?.to ?? "").trim();
    from = String(body?.from ?? "").trim();
  } catch {
    /* defaults */
  }

  if (!to) {
    to =
      (await getTenantTwilioPhone(session.sub)) ??
      process.env.TWILIO_PHONE_NUMBER?.trim() ??
      "";
  }
  if (!from) from = "+15125550100";
  if (!to) {
    return NextResponse.json({ error: "Twilio To number not configured" }, { status: 400 });
  }

  const callSid = `dev-smoke-${Date.now()}`;
  const ctx = { to, from, callSid };
  const results = [];

  for (const step of steps) {
    const out = await runStep(step, ctx);
    results.push({ step, ...out });
  }

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({ ok: failed.length === 0, to, from, callSid, results });
}
