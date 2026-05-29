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
    return { error: "요청이 너무 많습니다. 1시간 후 다시 시도해 주세요." };
  }

  if (channel === "sms") {
    if (!user.phone) {
      return { error: "등록된 휴대폰 번호가 없습니다. 이메일로 받아 주세요." };
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
    if (!sent.ok) return { error: sent.error ?? "이메일 전송에 실패했습니다." };
  } else if (user.phone) {
    const sent = await sendResetCodeSms(user.phone, code);
    if (!sent.ok) return { error: sent.error ?? "문자 전송에 실패했습니다." };
  }

  return { requestId: request.id };
}

export async function verifyResetCode(
  requestId: string,
  code: string,
): Promise<{ userId: string } | { error: string }> {
  const request = await getResetRequest(requestId);
  if (!request) {
    return { error: "인증번호가 만료되었거나 요청을 찾을 수 없습니다." };
  }

  if (request.expiresAt < Date.now()) {
    await deleteResetRequest(requestId);
    return { error: "인증번호가 만료되었습니다. 다시 요청해 주세요." };
  }

  if (request.attempts >= MAX_CODE_ATTEMPTS) {
    await deleteResetRequest(requestId);
    return { error: "시도 횟수를 초과했습니다. 다시 요청해 주세요." };
  }

  const valid = hashResetCode(code.trim()) === request.codeHash;
  if (!valid) {
    request.attempts += 1;
    await updateResetRequest(request);
    return { error: "인증번호가 올바르지 않습니다." };
  }

  await deleteResetRequest(requestId);
  return { userId: request.userId };
}
