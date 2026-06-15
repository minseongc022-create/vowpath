import { reportSmsDeliveryFailure } from "./report-sms-failure";
import {
  isKrSmsTestMode,
  normalizeOwnerAlertPhone,
} from "./sms-region-config";
import { findUserById } from "./users-db";

export async function resolveOwnerAlertPhone(userId: string): Promise<string | null> {
  const user = await findUserById(userId);
  const fromProfile = user?.phone?.trim();
  if (fromProfile) {
    const normalized = normalizeOwnerAlertPhone(fromProfile, user?.email);
    if (normalized) return normalized;
  }

  const fallback = process.env.TWILIO_OWNER_ALERT_PHONE?.trim();
  if (fallback) {
    const normalized = normalizeOwnerAlertPhone(fallback);
    if (normalized) return normalized;
  }

  return null;
}

export async function reportOwnerPhoneMisconfigured(params: {
  userId: string;
  operation: string;
  bookingId?: string;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const raw = user?.phone?.trim();
  if (!raw || normalizeOwnerAlertPhone(raw, user?.email)) return;

  const message = isKrSmsTestMode()
    ? "업체 휴대폰 형식을 확인하세요. 한국 테스트: 010-XXXX-XXXX, 미국: (512) 555-0100"
    : "업체 휴대폰이 미국 (+1) 형식이 아닙니다. 설정 → 연락처에서 (512) 555-0100 형식으로 저장하세요.";

  await reportSmsDeliveryFailure({
    userId: params.userId,
    operation: params.operation,
    message,
    bookingId: params.bookingId,
    retryable: false,
  });
}
