import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * 남의 GitHub 토큰과 테스트 계정 비밀번호를 보관하는 자리.
 *
 * ★ 왜 DB 컬럼 암호화까지 하는가
 *
 * Supabase/Postgres는 디스크 암호화를 해주지만, 그건 디스크를 통째로 훔쳐갔을
 * 때 얘기다. 실제로 새는 경로는 그게 아니라 (1) 잘못 짠 쿼리가 토큰을 API
 * 응답에 실어 보내거나 (2) 백업 덤프가 어딘가에 떨어지거나 (3) 로그에 행이
 * 통째로 찍히는 쪽이다. 컬럼을 암호화해두면 세 경우 모두 새어 나가는 게
 * 쓸모없는 바이트가 된다.
 *
 * ★ 키가 없으면 어떻게 되는가
 *
 * 조용히 평문으로 저장하는 대체 동작은 **두지 않는다**. 키가 없으면 GitHub
 * 연결 기능 자체가 켜지지 않는다 — "일단 동작은 하네"가 제일 위험한 상태다.
 */

const KEY_ENV = "VIBESAFE_ENCRYPTION_KEY";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const VERSION = "v1";

export class MissingEncryptionKeyError extends Error {
  constructor() {
    super(
      `${KEY_ENV} 환경변수가 없습니다. ` +
        `\`openssl rand -base64 32\` 로 만든 32바이트 키를 설정하세요.`,
    );
    this.name = "MissingEncryptionKeyError";
  }
}

function readKey(): Buffer {
  const raw = process.env[KEY_ENV]?.trim();
  if (!raw) throw new MissingEncryptionKeyError();

  // base64(권장) 또는 hex 둘 다 받는다 — 운영자가 어느 쪽으로 만들어도 통하게.
  let key: Buffer;
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== 32) {
    throw new Error(`${KEY_ENV}는 32바이트여야 합니다 (현재 ${key.length}바이트).`);
  }
  return key;
}

/** 키가 설정돼 있는지 — 기능 게이팅용. 키 값 자체는 절대 밖으로 내보내지 않는다. */
export function isEncryptionConfigured(): boolean {
  try {
    readKey();
    return true;
  } catch {
    return false;
  }
}

/** `v1.<iv>.<tag>.<ciphertext>` (모두 base64url). */
export function encryptSecret(plaintext: string): string {
  const key = readKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(payload: string): string {
  const key = readKey();
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("암호문 형식이 올바르지 않습니다.");
  }
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const ciphertext = Buffer.from(parts[3], "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("암호문 형식이 올바르지 않습니다.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** 비밀 값을 화면·로그에 보여줘야 할 때 쓰는 유일한 형태. */
export function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "•".repeat(Math.max(trimmed.length, 4));
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

/** 길이가 달라도 시간 차이로 값을 알아낼 수 없게 비교한다. */
export function safeCompare(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
