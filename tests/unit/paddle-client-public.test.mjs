import assert from "node:assert/strict";
import test from "node:test";

function resolvePaddleClientToken() {
  return (
    process.env.PADDLE_CLIENT_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() ||
    undefined
  );
}

function resolvePaddleClientEnvironment() {
  const env =
    process.env.PADDLE_ENV?.trim() || process.env.NEXT_PUBLIC_PADDLE_ENV?.trim();
  return env === "production" ? "production" : "sandbox";
}

function paddleClientTokenConfigured() {
  return Boolean(resolvePaddleClientToken());
}

test("resolvePaddleClientToken prefers PADDLE_CLIENT_TOKEN", () => {
  process.env.PADDLE_CLIENT_TOKEN = "live_server_token";
  process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = "build_token";
  assert.equal(resolvePaddleClientToken(), "live_server_token");
  delete process.env.PADDLE_CLIENT_TOKEN;
  delete process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
});

test("resolvePaddleClientToken falls back to NEXT_PUBLIC", () => {
  delete process.env.PADDLE_CLIENT_TOKEN;
  process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = "build_token";
  assert.equal(resolvePaddleClientToken(), "build_token");
  delete process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
});

test("resolvePaddleClientEnvironment uses PADDLE_ENV", () => {
  process.env.PADDLE_ENV = "production";
  delete process.env.NEXT_PUBLIC_PADDLE_ENV;
  assert.equal(resolvePaddleClientEnvironment(), "production");
  delete process.env.PADDLE_ENV;
});

test("paddleClientTokenConfigured is false when unset", () => {
  delete process.env.PADDLE_CLIENT_TOKEN;
  delete process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  assert.equal(paddleClientTokenConfigured(), false);
});
