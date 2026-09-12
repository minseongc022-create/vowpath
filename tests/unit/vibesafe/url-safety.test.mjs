import { test } from "node:test";
import assert from "node:assert/strict";
import { guessPlatform, validateServiceUrl } from "@/vibesafe/lib/url-safety";

/**
 * 등록된 주소는 우리 워커의 브라우저가 실제로 방문한다.
 * 여기가 뚫리면 남이 우리 인프라로 내부망을 긁는다(SSRF).
 */

test("정상적인 https 주소는 통과한다", () => {
  const result = validateServiceUrl("https://my-app.vercel.app");
  assert.equal(result.ok, true);
  assert.equal(result.url, "https://my-app.vercel.app");
});

test("스킴이 없으면 https를 붙인다", () => {
  const result = validateServiceUrl("my-app.vercel.app");
  assert.equal(result.ok, true);
  assert.equal(result.url, "https://my-app.vercel.app");
});

test("끝의 슬래시를 떼어 저장 형태를 하나로 만든다", () => {
  const result = validateServiceUrl("https://my-app.vercel.app/");
  assert.equal(result.ok && result.url, "https://my-app.vercel.app");
});

test("클라우드 메타데이터 주소는 어떤 설정에서도 막힌다", () => {
  // 개발용 로컬 허용 스위치가 켜져 있어도 막혀야 한다.
  process.env.VIBESAFE_ALLOW_LOCAL_TARGETS = "1";
  try {
    for (const url of [
      "http://169.254.169.254/latest/meta-data",
      "https://169.254.169.254/",
      "http://metadata.google.internal/computeMetadata/v1/",
    ]) {
      const result = validateServiceUrl(url);
      assert.equal(result.ok, false, `${url} 은 막혀야 한다`);
    }
  } finally {
    delete process.env.VIBESAFE_ALLOW_LOCAL_TARGETS;
  }
});

test("사설 IP와 localhost는 기본적으로 막힌다", () => {
  for (const url of [
    "http://localhost:3000",
    "http://127.0.0.1:8080",
    "https://10.0.0.5",
    "https://192.168.1.1",
    "https://172.16.0.1",
    "https://internal.local",
  ]) {
    assert.equal(validateServiceUrl(url).ok, false, `${url} 은 막혀야 한다`);
  }
});

test("주소에 자격증명이 박혀 있으면 거절한다", () => {
  const result = validateServiceUrl("https://user:pass@example.com");
  assert.equal(result.ok, false);
});

test("http는 운영에서 거절한다", () => {
  const result = validateServiceUrl("http://example.com", { allowHttp: false });
  assert.equal(result.ok, false);
});

test("점 없는 호스트는 거절한다", () => {
  assert.equal(validateServiceUrl("https://myapp").ok, false);
});

test("플랫폼을 주소로 추측한다", () => {
  assert.equal(guessPlatform("https://x.vercel.app"), "vercel");
  assert.equal(guessPlatform("https://x.onrender.com"), "render");
  assert.equal(guessPlatform("https://x.up.railway.app"), "railway");
  assert.equal(guessPlatform("https://example.com"), "custom");
});
