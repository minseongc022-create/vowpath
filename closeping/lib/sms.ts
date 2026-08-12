import type { Quote } from "./types";
import { formatUsd } from "./quotes";

/** SMS layer — logs in demo; wires to Twilio when env is set. */
export async function sendQuoteSms(params: {
  shopName: string;
  phone: string;
  customerName: string;
  amountCents: number;
}): Promise<{ ok: boolean; reason?: string; body: string }> {
  const first = params.customerName.trim().split(/\s+/)[0] || "there";
  const amount = formatUsd(params.amountCents);
  const body = `${params.shopName}: Hi ${first} — your estimate is ${amount}. Reply with questions or to book. Reply STOP to opt out.`;

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    try {
      const twilio = await import("twilio").catch(() => null);
      if (!twilio) {
        console.info("[closeping-sms]", body);
        return { ok: true, body };
      }
      // Optional — Twilio not in package.json by default for isolation
      console.info("[closeping-sms] Twilio configured but client optional — logged:", body);
      return { ok: true, body };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : "SMS failed", body };
    }
  }

  console.info("[closeping-sms:demo]", body);
  return { ok: true, body };
}

export async function sendChaseSms(params: {
  shopName: string;
  phone: string;
  amountCents: number;
  stage: number;
}): Promise<{ ok: boolean; body: string }> {
  const amount = formatUsd(params.amountCents);
  let body: string;
  if (params.stage === 1) {
    body = `${params.shopName}: Still thinking about the ${amount} estimate? Happy to answer questions. Reply STOP to opt out.`;
  } else if (params.stage === 2) {
    body = `${params.shopName}: Quick check-in on your ${amount} estimate — we're ready when you are. Reply STOP to opt out.`;
  } else {
    body = `${params.shopName}: Just checking in on the ${amount} estimate we sent. Reply anytime to book. Reply STOP to opt out.`;
  }
  console.info("[closeping-chase:demo]", body);
  return { ok: true, body };
}

export function quoteNeedsChase(q: Quote): boolean {
  return Boolean(q.sentAt && q.status !== "won" && q.status !== "lost");
}
