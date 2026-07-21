import { shopDisplayNameForUser } from "@/lib/link-intake-brand";
import {
  createLinkIntakeSession,
  sendLinkIntakeSms,
} from "@/lib/call-intake/link-intake-flow";

export type SendVoiceLinkSmsParams = {
  userId: string;
  callSid: string;
  from: string;
  to: string;
  /** P3 for estimate link intake; null for booking. */
  menuPriority?: "P3" | null;
};

export async function sendVoiceLinkIntakeSms(
  params: SendVoiceLinkSmsParams,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const callbackPhone = params.from.replace(/^whatsapp:/, "").trim();
  if (!callbackPhone || callbackPhone === "unknown") {
    return { ok: false, error: "missing callback phone" };
  }

  try {
    const shopName = await shopDisplayNameForUser(params.userId);
    const session = await createLinkIntakeSession({
      userId: params.userId,
      callSid: params.callSid,
      from: callbackPhone,
      to: params.to,
      shopName,
      menuPriority: params.menuPriority ?? null,
    });

    const sms = await sendLinkIntakeSms({
      userId: params.userId,
      phone: callbackPhone,
      token: session.token,
      callSid: params.callSid,
    });

    if (!sms.ok) {
      return { ok: false, error: sms.error ?? "sms failed" };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
