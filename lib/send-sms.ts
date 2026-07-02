import { normalizeSmsPhone } from "./phone";
import { alertCritical } from "./owner-alerts";
import { reportSmsDeliveryFailure } from "./report-sms-failure";
import { withRetry } from "./resilience";
import { getSmsTwilioHealthForUser } from "./sms-twilio-health";
import {
  isKrSmsTestMode,
  smsRestrictToUsRecipients,
} from "./sms-region-config";
import { isKrOwnerPhoneEmail } from "./owner-phone-policy";
import { findUserById } from "./users-db";
import { isTwilioConfigured } from "./twilio-config";

/** Auth codes — failure returns to the user form. */
export type SmsSendOptions = {
  strict?: boolean;
  /** Shop alerts + ops log on failure (all operational SMS). */
  context?: SmsSendContext;
  /** Reject non-US (+1) numbers before Twilio (US Twilio numbers). */
  usRecipientsOnly?: boolean;
};

export type SmsSendContext = {
  userId: string;
  operation: string;
  callSid?: string;
  bookingId?: string;
};

export type SmsSendResult = { ok: true } | { ok: false; error: string };

export function isSmsConfigured(): boolean {
  return isTwilioConfigured();
}

export function smsDevPreviewEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const v = process.env.SMS_DEV_PREVIEW?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function logSmsPreview(label: string, phone: string, body: string): void {
  console.info(`[sms] ${label} → ${phone}: ${body}`);
}

function parseTwilioError(e: unknown): { message: string; code: number | null } {
  const msg = e instanceof Error ? e.message : String(e);
  const code =
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "number"
      ? (e as { code: number }).code
      : null;

  if (code === 21608 || code === 21610 || msg.includes("unverified")) {
    return {
      code,
      message:
        "Twilio Trial: 수신 번호를 Verified Caller IDs에 등록·인증해야 문자가 전송됩니다.",
    };
  }
  if (
    code === 21408 ||
    msg.includes("Permission to send an SMS has not been enabled")
  ) {
    return {
      code,
      message:
        "Twilio Geo permissions: United States(US) SMS를 허용하세요. (Console → Messaging → Geo permissions → United States → Enable)",
    };
  }
  if (code === 21606 || msg.includes("From") || msg.includes("21212")) {
    return {
      code,
      message:
        "발신 번호(TWILIO_PHONE_NUMBER)가 Twilio 계정의 활성 미국 번호와 일치하는지 확인하세요.",
    };
  }
  if (msg.includes("21211") || msg.toLowerCase().includes("invalid")) {
    return { code, message: "수신 번호가 올바르지 않습니다." };
  }
  return {
    code,
    message: "문자 전송에 실패했습니다. Twilio 설정과 수신 번호를 확인해 주세요.",
  };
}

async function reportFailure(
  error: string,
  opts: {
    context?: SmsSendContext;
    toPhone?: string;
    twilioCode?: number | null;
    devLogLabel: string;
  },
): Promise<SmsSendResult> {
  if (opts.context) {
    await reportSmsDeliveryFailure({
      userId: opts.context.userId,
      operation: opts.context.operation,
      message: error,
      toPhone: opts.toPhone,
      callSid: opts.context.callSid,
      bookingId: opts.context.bookingId,
      retryable: true,
      twilioCode: opts.twilioCode ?? null,
    });
  } else {
    console.error(`[send-sms] ${opts.devLogLabel}`, error);
  }
  return { ok: false, error };
}

async function smsAllowsRecipientPhone(
  phone: string,
  userId?: string,
): Promise<boolean> {
  if (!smsRestrictToUsRecipients()) return true;
  if (phone.startsWith("+1")) return true;
  if (!phone.startsWith("+82") || !userId) return false;
  const user = await findUserById(userId);
  return Boolean(user && isKrOwnerPhoneEmail(user.email));
}

export async function sendSms(
  phoneRaw: string,
  body: string,
  devLogLabel: string,
  options?: SmsSendOptions,
): Promise<SmsSendResult> {
  const strict = options?.strict === true;
  const context = options?.context;
  const phone = normalizeSmsPhone(phoneRaw);

  if (!phone) {
    const error = isKrSmsTestMode()
      ? "Check the phone format. US: (512) 555-0100"
      : "Enter a valid US mobile number (e.g. (512) 555-0100).";
    if (strict) return { ok: false, error };
    return reportFailure(error, { context, devLogLabel });
  }

  const usOnly = options?.usRecipientsOnly ?? smsRestrictToUsRecipients();
  if (usOnly && !(await smsAllowsRecipientPhone(phone, context?.userId))) {
    const error =
      "SMS can only be sent to US (+1) numbers. Check owner and customer phone formats.";
    if (strict) return { ok: false, error };
    return reportFailure(error, { context, toPhone: phone, devLogLabel });
  }

  if (!strict && smsDevPreviewEnabled()) {
    logSmsPreview(`${devLogLabel} (SMS_DEV_PREVIEW)`, phone, body);
    return { ok: true };
  }

  const health = await getSmsTwilioHealthForUser(context?.userId);
  if (!health.ready) {
    const error =
      health.issues[0] ??
      "문자 발송 설정이 완료되지 않았습니다. TWILIO 환경 변수를 확인하세요.";
    console.warn(`[send-sms] ${devLogLabel} not ready: ${error}`);
    if (strict) return { ok: false, error };
    return reportFailure(error, { context, toPhone: phone, devLogLabel });
  }

  try {
    await withRetry(
      async () => {
        const twilio = (await import("twilio")).default;
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID!,
          process.env.TWILIO_AUTH_TOKEN!,
        );

        await client.messages.create({
          body,
          from: health.fromNumber!,
          to: phone,
        });
      },
      { maxAttempts: 3, delayMs: 1000, backoff: 2 },
    );

    return { ok: true };
  } catch (e) {
    const { message, code } = parseTwilioError(e);
    console.warn(`[send-sms] ${devLogLabel}`, message, e);
    await notifyOwnerOfFinalSmsFailure({ context, devLogLabel, message });
    if (strict) return { ok: false, error: message };
    return reportFailure(message, {
      context,
      toPhone: phone,
      twilioCode: code,
      devLogLabel,
    });
  }
}

/** Fires once all 3 Twilio delivery attempts have failed — pages the site owner
 * (distinct from the per-tenant shop-owner email already sent via reportFailure). */
async function notifyOwnerOfFinalSmsFailure(params: {
  context?: SmsSendContext;
  devLogLabel: string;
  message: string;
}): Promise<void> {
  // Avoid recursing back into sendSms() if the owner-alert SMS itself is the one failing.
  if (params.devLogLabel === "owner-alert") return;
  try {
    let label = params.devLogLabel;
    if (params.context?.userId) {
      const user = await findUserById(params.context.userId);
      if (user?.shopName) label = user.shopName;
    }
    await alertCritical(
      "sms_failed",
      `⚠️ SMS failed after 3 retries for ${label}. Customer may not have received dispatch.`,
    );
  } catch (e) {
    console.warn("[send-sms] owner alert failed", e);
  }
}

/** @deprecated Use result.ok — kept for gradual migration */
export function smsWasDelivered(result: SmsSendResult): boolean {
  return result.ok;
}
