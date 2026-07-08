import { hashPassword } from "./auth-password";
import { apiErrorsEn as e } from "./api-errors-en";
import {
  isKrOwnerPhoneEmail,
  normalizeOwnerSignupPhone,
} from "./owner-phone-policy";
import {
  deletePendingSignup,
  getPendingSignup,
  getSignupAttemptCount,
  incrementSignupAttemptCount,
  savePendingSignup,
  updatePendingSignup,
  type PendingSignup,
  type SignupChannel,
} from "./signup-verify-store";
import { sendSignupCodeEmail, sendSignupCodeSms } from "./send-verification-code";
import { findUserByEmail, findUserByPhone } from "./users-db";
import { generateResetCode, hashResetCode } from "./password-reset";
import type { StoredLegalConsent } from "./legal-consent";

const CODE_TTL_MS = 10 * 60 * 1000;
/** Wrong code guesses per signup request */
export const MAX_SIGNUP_CODE_ATTEMPTS = 5;
/** Verification codes sent per email or phone per hour */
export const MAX_SIGNUP_SEND_PER_HOUR = 3;

export type SignupInput = {
  email: string;
  password: string;
  shopName: string;
  phone?: string;
  channel: SignupChannel;
  legalConsent: StoredLegalConsent;
};

export async function createAndSendSignupCode(
  input: SignupInput,
): Promise<{ signupRequestId: string } | { error: string }> {
  const email = input.email.trim().toLowerCase();

  if (await findUserByEmail(email)) {
    return { error: e.emailAlreadyRegistered };
  }

  if (input.phone && (await findUserByPhone(input.phone))) {
    return { error: e.phoneAlreadyRegistered };
  }

  const emailRateKey = `email:${email}`;
  const emailAttempts = await getSignupAttemptCount(emailRateKey);
  if (emailAttempts >= MAX_SIGNUP_SEND_PER_HOUR) {
    return {
      error: `You can request ${MAX_SIGNUP_SEND_PER_HOUR} email codes per hour. Try again shortly.`,
    };
  }

  if (input.phone) {
    const phoneRateKey = `phone:${input.phone}`;
    const phoneAttempts = await getSignupAttemptCount(phoneRateKey);
    if (phoneAttempts >= MAX_SIGNUP_SEND_PER_HOUR) {
      return {
        error: `You can request ${MAX_SIGNUP_SEND_PER_HOUR} SMS codes per hour. Try again shortly.`,
      };
    }
  }

  if (!input.phone) {
    return { error: e.phoneRequiredSignup };
  }

  const passwordHash = await hashPassword(input.password);
  const code = generateResetCode();
  const request: PendingSignup = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    shopName: input.shopName.trim() || "My Restoration Company",
    phone: input.phone,
    channel: input.channel,
    codeHash: hashResetCode(code),
    attempts: 0,
    verified: false,
    expiresAt: Date.now() + CODE_TTL_MS,
    createdAt: new Date().toISOString(),
    legalConsent: input.legalConsent,
  };

  await savePendingSignup(request);
  await incrementSignupAttemptCount(emailRateKey);
  if (input.phone) {
    await incrementSignupAttemptCount(`phone:${input.phone}`);
  }

  if (input.channel === "email") {
    const sent = await sendSignupCodeEmail(email, code);
    if (!sent.ok) return { error: sent.error ?? "Could not send email." };
  } else if (input.phone) {
    const sent = await sendSignupCodeSms(input.phone, code, {
      allowKrRecipient: isKrOwnerPhoneEmail(email),
    });
    if (!sent.ok) return { error: sent.error ?? "Could not send SMS." };
  }

  return { signupRequestId: request.id };
}

export async function checkSignupCode(
  signupRequestId: string,
  code: string,
): Promise<{ ok: true } | { error: string }> {
  const request = await getPendingSignup(signupRequestId);
  if (!request) {
    return { error: e.codeExpired };
  }

  if (request.expiresAt < Date.now()) {
    await deletePendingSignup(signupRequestId);
    return { error: e.codeExpiredResend };
  }

  if (request.attempts >= MAX_SIGNUP_CODE_ATTEMPTS) {
    await deletePendingSignup(signupRequestId);
    return {
      error: `Too many incorrect attempts (${MAX_SIGNUP_CODE_ATTEMPTS}). Start signup again.`,
    };
  }

  const valid = hashResetCode(code.trim()) === request.codeHash;
  if (!valid) {
    request.attempts += 1;
    await updatePendingSignup(request);
    return { error: e.codeInvalid };
  }

  request.verified = true;
  await updatePendingSignup(request);
  return { ok: true };
}

export async function completeVerifiedSignup(
  signupRequestId: string,
  phone?: string,
): Promise<{ pending: PendingSignup } | { error: string }> {
  const request = await getPendingSignup(signupRequestId);
  if (!request) {
    return { error: e.verificationExpired };
  }

  if (!request.verified) {
    return { error: e.verifyFirst };
  }

  if (request.expiresAt < Date.now()) {
    await deletePendingSignup(signupRequestId);
    return { error: e.verificationExpired };
  }

  if (phone) {
    request.phone = phone;
    await updatePendingSignup(request);
  }

  if (await findUserByEmail(request.email)) {
    await deletePendingSignup(signupRequestId);
    return { error: e.emailAlreadyRegistered };
  }

  if (!request.phone) {
    return { error: e.phoneRequired };
  }

  if (await findUserByPhone(request.phone)) {
    return { error: e.phoneAlreadyRegistered };
  }

  return { pending: request };
}

/** Legacy: validates code and returns pending signup without creating account */
export async function verifySignupCode(
  signupRequestId: string,
  code: string,
): Promise<{ pending: PendingSignup } | { error: string }> {
  const checked = await checkSignupCode(signupRequestId, code);
  if ("error" in checked) return checked;
  const request = await getPendingSignup(signupRequestId);
  if (!request) return { error: e.verificationExpired };
  return { pending: request };
}

export function normalizeSignupPhone(input: string, email: string): string | null {
  return normalizeOwnerSignupPhone(email, input);
}

export { normalizeOwnerSignupPhone };
