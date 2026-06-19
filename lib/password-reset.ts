import { createHash, randomInt } from "crypto";
import {
  deleteResetRequest,
  getForgotAttemptCount,
  getResetRequest,
  incrementForgotAttemptCount,
  saveResetRequest,
  updateResetRequest,
  type ResetChannel,
  type ResetRequest,
} from "./password-reset-store";
import { sendResetCodeEmail, sendResetCodeSms } from "./send-reset-code";
import { normalizeSmsPhone } from "./phone";
import type { UserRecord } from "./users-db";
import { apiErrorsEn } from "./api-errors-en";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const MAX_FORGOT_PER_HOUR = 5;

function pepper(): string {
  return process.env.AUTH_SECRET ?? "dev-only-change-auth-secret-32chars";
}

export function hashResetCode(code: string): string {
  return createHash("sha256").update(`${code}:${pepper()}`).digest("hex");
}

export function generateResetCode(): string {
  return String(randomInt(100000, 1000000));
}

export function normalizePhone(input: string): string | null {
  return normalizeSmsPhone(input);
}

export async function createAndSendResetCode(
  user: UserRecord,
  channel: ResetChannel,
): Promise<{ requestId: string } | { error: string }> {
  const rateKey = `${user.email}:${channel}`;
  const attempts = await getForgotAttemptCount(rateKey);
  if (attempts >= MAX_FORGOT_PER_HOUR) {
    return { error: apiErrorsEn.resetTooManyRequests };
  }

  if (channel === "sms") {
    if (!user.phone) {
      return { error: apiErrorsEn.resetNoPhoneOnFile };
    }
  }

  const code = generateResetCode();
  const request: ResetRequest = {
    id: crypto.randomUUID(),
    userId: user.id,
    email: user.email,
    phone: user.phone,
    channel,
    codeHash: hashResetCode(code),
    attempts: 0,
    expiresAt: Date.now() + CODE_TTL_MS,
    createdAt: new Date().toISOString(),
  };

  await saveResetRequest(request);
  await incrementForgotAttemptCount(rateKey);

  if (channel === "email") {
    const sent = await sendResetCodeEmail(user.email, code);
    if (!sent.ok) return { error: sent.error ?? apiErrorsEn.emailSendFailed };
  } else if (user.phone) {
    const sent = await sendResetCodeSms(user.phone, code);
    if (!sent.ok) return { error: sent.error ?? apiErrorsEn.smsSendFailed };
  }

  return { requestId: request.id };
}

export async function verifyResetCode(
  requestId: string,
  code: string,
): Promise<{ userId: string } | { error: string }> {
  const request = await getResetRequest(requestId);
  if (!request) {
    return { error: apiErrorsEn.resetCodeNotFound };
  }

  if (request.expiresAt < Date.now()) {
    await deleteResetRequest(requestId);
    return { error: apiErrorsEn.resetCodeExpired };
  }

  if (request.attempts >= MAX_CODE_ATTEMPTS) {
    await deleteResetRequest(requestId);
    return { error: apiErrorsEn.resetTooManyCodeAttempts };
  }

  const valid = hashResetCode(code.trim()) === request.codeHash;
  if (!valid) {
    request.attempts += 1;
    await updateResetRequest(request);
    return { error: apiErrorsEn.resetCodeInvalid };
  }

  await deleteResetRequest(requestId);
  return { userId: request.userId };
}
