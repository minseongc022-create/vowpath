import { logOperationFailure } from "./ops-failures";
import { notifyOwnerSmsFailureEmail } from "./owner-email-notify";
import { recordSmsDeliveryFailed } from "./record-tenant-events";

export type SmsFailureReport = {
  userId: string;
  operation: string;
  message: string;
  toPhone?: string;
  callSid?: string;
  bookingId?: string;
  retryable?: boolean;
  twilioCode?: number | null;
};

function maskPhone(e164: string | undefined): string | undefined {
  if (!e164) return undefined;
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 4) return e164;
  return `***${digits.slice(-4)}`;
}

/** Immediate shop alerts when outbound SMS does not deliver. */
export async function reportSmsDeliveryFailure(
  report: SmsFailureReport,
): Promise<void> {
  const detail = report.toPhone
    ? `${report.message} (to ${maskPhone(report.toPhone)})`
    : report.message;

  await logOperationFailure({
    userId: report.userId,
    category: "sms",
    operation: report.operation,
    message: detail,
    retryable: report.retryable ?? true,
    callSid: report.callSid,
    payload: {
      bookingId: report.bookingId,
      twilioCode: report.twilioCode ?? undefined,
      to: maskPhone(report.toPhone),
    },
  });

  await recordSmsDeliveryFailed({
    userId: report.userId,
    operation: report.operation,
    message: detail,
    bookingId: report.bookingId,
    href: "/settings?section=contact",
  });

  try {
    await notifyOwnerSmsFailureEmail({
      userId: report.userId,
      operation: report.operation,
      message: detail,
      bookingId: report.bookingId,
    });
  } catch (e) {
    console.warn("[report-sms-failure] owner email", e);
  }
}
