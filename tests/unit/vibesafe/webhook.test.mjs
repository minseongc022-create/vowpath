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

/**
 * PR 프리뷰 검사의 입구 — Vercel이 프리뷰 배포를 마치면 보내는 이벤트.
 * 여기서 잘못 읽으면 "머지 전에 잡는" 기능이 통째로 안 돈다.
 */
import { parseDeploymentStatusEvent } from "@/vibesafe/lib/github/webhook";

test("성공한 프리뷰 배포에서 주소와 브랜치를 뽑는다", () => {
  const parsed = parseDeploymentStatusEvent({
    deployment_status: {
      state: "success",
      environment: "Preview",
      environment_url: "https://my-app-git-feature-x.vercel.app",
    },
    deployment: { ref: "feature-x", environment: "Preview" },
  });
  assert.equal(parsed.url, "https://my-app-git-feature-x.vercel.app");
  assert.equal(parsed.branch, "feature-x");
});

test("운영 배포는 프리뷰 검사 대상이 아니다", () => {
  // 운영 배포는 push 이벤트 쪽에서 다룬다. 여기서 또 잡으면 검사가 두 번 돈다.
  const parsed = parseDeploymentStatusEvent({
    deployment_status: { state: "success", environment: "Production", environment_url: "https://my-app.com" },
    deployment: { ref: "main", environment: "Production" },
  });
  assert.equal(parsed, null);
});

test("실패하거나 진행 중인 배포는 무시한다", () => {
  for (const state of ["failure", "pending", "in_progress", "error"]) {
    const parsed = parseDeploymentStatusEvent({
      deployment_status: { state, environment: "Preview", environment_url: "https://x.vercel.app" },
      deployment: { ref: "b", environment: "Preview" },
    });
    assert.equal(parsed, null, `${state} 상태는 무시해야 한다`);
  }
});

test("http 주소는 받지 않는다", () => {
  const parsed = parseDeploymentStatusEvent({
    deployment_status: { state: "success", environment: "Preview", environment_url: "http://insecure.example.com" },
    deployment: { ref: "b", environment: "Preview" },
  });
  assert.equal(parsed, null);
});

test("주소나 브랜치가 없으면 해석하지 않는다", () => {
  assert.equal(parseDeploymentStatusEvent({ deployment_status: { state: "success" } }), null);
  assert.equal(parseDeploymentStatusEvent({}), null);
  assert.equal(parseDeploymentStatusEvent(null), null);
});

test("target_url만 있어도 읽는다", () => {
  // Vercel이 environment_url 대신 target_url을 쓰는 경우가 있다.
  const parsed = parseDeploymentStatusEvent({
    deployment_status: { state: "success", environment: "preview", target_url: "https://x-git-b.vercel.app" },
    deployment: { ref: "b" },
  });
  assert.equal(parsed.url, "https://x-git-b.vercel.app");
});
