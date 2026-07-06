import { resolveOwnerAlertPhone } from "../owner-alert-phone";
import { normalizeSmsPhone } from "../phone";
import { sendSms } from "../send-sms";

/** Tech-facing SMS — also copies to shop owner when numbers differ (solo testing). */
export async function sendTechSms(params: {
  userId: string;
  techPhone: string;
  body: string;
  devLogLabel: string;
  operation: string;
  bookingId?: string;
}): Promise<boolean> {
  const techNorm = normalizeSmsPhone(params.techPhone);
  const primary = await sendSms(params.techPhone, params.body, params.devLogLabel, {
    context: {
      userId: params.userId,
      operation: params.operation,
      bookingId: params.bookingId,
    },
  });

  const ownerPhone = await resolveOwnerAlertPhone(params.userId);
  const ownerNorm = ownerPhone ? normalizeSmsPhone(ownerPhone) : null;

  if (ownerNorm && techNorm && ownerNorm !== techNorm) {
    const ownerCopy = await sendSms(
      ownerNorm,
      `[TECH copy] ${params.body}`,
      `${params.devLogLabel}-owner-copy`,
      {
        context: {
          userId: params.userId,
          operation: `${params.operation}_owner_copy`,
          bookingId: params.bookingId,
        },
      },
    );
    if (!ownerCopy.ok) {
      console.warn(
        `[send-tech-sms] owner copy failed for ${params.operation} (userId=${params.userId}): ${ownerCopy.error ?? "unknown error"}`,
      );
    }
  }

  return primary.ok;
}
