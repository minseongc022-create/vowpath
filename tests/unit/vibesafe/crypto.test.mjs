import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

process.env.VIBESAFE_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const { encryptSecret, decryptSecret, isEncryptionConfigured, maskSecret, safeCompare } = await import(
  "@/vibesafe/lib/crypto"
);

test("암호화하고 다시 복호화하면 원래 값이다", () => {
  const secret = "github_pat_11ABCDEFG_thisIsNotARealToken";
  const cipher = encryptSecret(secret);
  assert.notEqual(cipher, secret);
  assert.equal(decryptSecret(cipher), secret);
});

test("같은 값을 두 번 암호화해도 암호문이 다르다", () => {
  // 같으면 "이 두 사용자가 같은 토큰을 쓴다"가 DB만 봐도 드러난다.
  assert.notEqual(encryptSecret("same"), encryptSecret("same"));
});

test("한 글자라도 건드리면 복호화가 실패한다", () => {
  const cipher = encryptSecret("비밀값");
  const parts = cipher.split(".");
  parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("AA") ? "BB" : "AA");
  assert.throws(() => decryptSecret(parts.join(".")));
});

test("형식이 어긋난 암호문은 거절한다", () => {
  assert.throws(() => decryptSecret("plaintext"));
  assert.throws(() => decryptSecret("v9.a.b.c"));
});

test("키가 없으면 암호화 자체가 실패한다 — 평문으로 흘려보내지 않는다", async () => {
  const saved = process.env.VIBESAFE_ENCRYPTION_KEY;
  delete process.env.VIBESAFE_ENCRYPTION_KEY;
  try {
    assert.equal(isEncryptionConfigured(), false);
    assert.throws(() => encryptSecret("x"), /VIBESAFE_ENCRYPTION_KEY/);
  } finally {
    process.env.VIBESAFE_ENCRYPTION_KEY = saved;
  }
});

test("32바이트가 아닌 키는 거절한다", () => {
  const saved = process.env.VIBESAFE_ENCRYPTION_KEY;
  process.env.VIBESAFE_ENCRYPTION_KEY = Buffer.from("short").toString("base64");
  try {
    assert.throws(() => encryptSecret("x"), /32바이트/);
  } finally {
    process.env.VIBESAFE_ENCRYPTION_KEY = saved;
  }
});

test("마스킹은 값을 복원할 수 없게 만든다", () => {
  const masked = maskSecret("github_pat_11ABCDEFGHIJKLMNOP");
  assert.ok(!masked.includes("ABCDEFGHIJKLMN"));
  assert.ok(masked.includes("…"));
  assert.ok(maskSecret("abc").length >= 4);
});

test("safeCompare는 길이가 달라도 안전하게 비교한다", () => {
  assert.equal(safeCompare("abc", "abc"), true);
  assert.equal(safeCompare("abc", "abcd"), false);
  assert.equal(safeCompare("", ""), true);
});
