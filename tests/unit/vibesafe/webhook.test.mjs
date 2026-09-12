import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { parsePushEvent, verifyGithubSignature } from "@/vibesafe/lib/github/webhook";

const SECRET = "test-webhook-secret";
const sign = (body) => `sha256=${createHmac("sha256", SECRET).update(body, "utf8").digest("hex")}`;

test("올바른 서명은 통과한다", () => {
  const body = '{"ref":"refs/heads/main"}';
  assert.equal(verifyGithubSignature({ rawBody: body, signatureHeader: sign(body), secret: SECRET }), true);
});

test("서명이 없으면 거절한다", () => {
  assert.equal(verifyGithubSignature({ rawBody: "{}", signatureHeader: null, secret: SECRET }), false);
});

test("본문이 한 글자라도 다르면 거절한다", () => {
  const signature = sign('{"ref":"refs/heads/main"}');
  assert.equal(
    verifyGithubSignature({ rawBody: '{"ref":"refs/heads/maim"}', signatureHeader: signature, secret: SECRET }),
    false,
  );
});

test("다른 비밀로 서명한 것은 거절한다", () => {
  const body = "{}";
  const otherSig = `sha256=${createHmac("sha256", "other").update(body).digest("hex")}`;
  assert.equal(verifyGithubSignature({ rawBody: body, signatureHeader: otherSig, secret: SECRET }), false);
});

test("sha1 형식(구형)은 받지 않는다", () => {
  assert.equal(
    verifyGithubSignature({ rawBody: "{}", signatureHeader: "sha1=abcdef", secret: SECRET }),
    false,
  );
});

test("push 이벤트에서 필요한 값만 뽑는다", () => {
  const parsed = parsePushEvent({
    repository: { full_name: "owner/repo" },
    after: "a".repeat(40),
    ref: "refs/heads/main",
  });
  assert.equal(parsed.repositoryFullName, "owner/repo");
  assert.equal(parsed.branch, "main");
  assert.equal(parsed.headSha, "a".repeat(40));
});

test("sha 형식이 이상하면 null로 둔다", () => {
  const parsed = parsePushEvent({
    repository: { full_name: "o/r" },
    after: "'; DROP TABLE runs;--",
    ref: "refs/heads/main",
  });
  assert.equal(parsed.headSha, null);
});

test("저장소 정보가 없으면 해석하지 않는다", () => {
  assert.equal(parsePushEvent({}), null);
  assert.equal(parsePushEvent(null), null);
  assert.equal(parsePushEvent("문자열"), null);
});
