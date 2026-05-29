import { hashPassword } from "./auth-password";
import { normalizeSmsPhone } from "./phone";
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
};

export async function createAndSendSignupCode(
  input: SignupInput,
): Promise<{ signupRequestId: string } | { error: string }> {
  const email = input.email.trim().toLowerCase();

  if (await findUserByEmail(email)) {
    return { error: "이미 가입된 이메일입니다. 로그인해 주세요." };
  }

  if (input.phone && (await findUserByPhone(input.phone))) {
    return { error: "이미 등록된 휴대폰 번호입니다. 다른 번호를 사용해 주세요." };
  }

  const emailRateKey = `email:${email}`;
  const emailAttempts = await getSignupAttemptCount(emailRateKey);
  if (emailAttempts >= MAX_SIGNUP_SEND_PER_HOUR) {
    return {
      error: `이메일 인증 요청은 1시간에 ${MAX_SIGNUP_SEND_PER_HOUR}번까지 가능합니다. 잠시 후 다시 시도해 주세요.`,
    };
  }

  if (input.phone) {
    const phoneRateKey = `phone:${input.phone}`;
    const phoneAttempts = await getSignupAttemptCount(phoneRateKey);
    if (phoneAttempts >= MAX_SIGNUP_SEND_PER_HOUR) {
      return {
        error: `휴대폰 인증 요청은 1시간에 ${MAX_SIGNUP_SEND_PER_HOUR}번까지 가능합니다. 잠시 후 다시 시도해 주세요.`,
      };
    }
  }

  if (input.channel === "sms" && !input.phone) {
    return { error: "문자 인증을 위해 휴대폰 번호를 입력해 주세요." };
  }

  const passwordHash = await hashPassword(input.password);
  const code = generateResetCode();
  const request: PendingSignup = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    shopName: input.shopName.trim() || "My HVAC Shop",
    phone: input.phone,
    channel: input.channel,
    codeHash: hashResetCode(code),
    attempts: 0,
    expiresAt: Date.now() + CODE_TTL_MS,
    createdAt: new Date().toISOString(),
  };

  await savePendingSignup(request);
  await incrementSignupAttemptCount(emailRateKey);
  if (input.phone) {
    await incrementSignupAttemptCount(`phone:${input.phone}`);
  }

  if (input.channel === "email") {
    const sent = await sendSignupCodeEmail(email, code);
    if (!sent.ok) return { error: sent.error ?? "이메일 전송에 실패했습니다." };
  } else if (input.phone) {
    const sent = await sendSignupCodeSms(input.phone, code);
    if (!sent.ok) return { error: sent.error ?? "문자 전송에 실패했습니다." };
  }

  return { signupRequestId: request.id };
}

export async function verifySignupCode(
  signupRequestId: string,
  code: string,
): Promise<{ pending: PendingSignup } | { error: string }> {
  const request = await getPendingSignup(signupRequestId);
  if (!request) {
    return { error: "인증번호가 만료되었거나 요청을 찾을 수 없습니다." };
  }

  if (request.expiresAt < Date.now()) {
    await deletePendingSignup(signupRequestId);
    return { error: "인증번호가 만료되었습니다. 다시 요청해 주세요." };
  }

  if (request.attempts >= MAX_SIGNUP_CODE_ATTEMPTS) {
    await deletePendingSignup(signupRequestId);
    return {
      error: `인증번호 입력을 ${MAX_SIGNUP_CODE_ATTEMPTS}회 틀렸습니다. 처음부터 다시 가입해 주세요.`,
    };
  }

  const valid = hashResetCode(code.trim()) === request.codeHash;
  if (!valid) {
    request.attempts += 1;
    await updatePendingSignup(request);
    return { error: "인증번호가 올바르지 않습니다." };
  }

  if (await findUserByEmail(request.email)) {
    await deletePendingSignup(signupRequestId);
    return { error: "이미 가입된 이메일입니다. 로그인해 주세요." };
  }

  if (request.phone && (await findUserByPhone(request.phone))) {
    await deletePendingSignup(signupRequestId);
    return { error: "이미 등록된 휴대폰 번호입니다. 다른 번호를 사용해 주세요." };
  }

  return { pending: request };
}

export function normalizeSignupPhone(phoneRaw: string): string | null {
  return normalizeSmsPhone(phoneRaw);
}
