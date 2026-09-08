import assert from "node:assert/strict";
import test from "node:test";
import { isHaruwithHost } from "../../dajeong/lib/host.ts";

test("하루위드 공개 도메인만 허용한다", () => {
  assert.equal(isHaruwithHost("haruwith.com"), true);
  assert.equal(isHaruwithHost("www.haruwith.com"), true);
  assert.equal(isHaruwithHost("effiroad.com"), false);
  assert.equal(isHaruwithHost("www.effiroad.com"), false);
  assert.equal(isHaruwithHost("giucuu.com"), false);
});

test("개발 및 Vercel Preview 호스트는 허용한다", () => {
  assert.equal(isHaruwithHost("localhost"), true);
  assert.equal(isHaruwithHost("127.0.0.1"), true);
  assert.equal(isHaruwithHost("vowpath-feature-example.vercel.app"), true);
});
