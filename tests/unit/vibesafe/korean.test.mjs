import { test } from "node:test";
import assert from "node:assert/strict";
import { hasFinalConsonant, particle, withParticle } from "@/vibesafe/lib/korean";

/**
 * 한국어 제품에서 "이(가)"가 화면에 그대로 나오면, 공들여 쓴 나머지 문장까지
 * 기계가 뱉은 것처럼 읽힌다. 실기동 검증에서 실제로 그 문장이 나왔다.
 */

test("받침이 있으면 이/은/을/과", () => {
  assert.equal(withParticle("손님", "이/가"), "손님이");
  assert.equal(withParticle("사장님", "은/는"), "사장님은");
  assert.equal(withParticle("결제", "을/를"), "결제를");
  assert.equal(withParticle("로그인", "을/를"), "로그인을");
});

test("받침이 없으면 가/는/를/와", () => {
  assert.equal(withParticle("손님이", "이/가"), "손님이가"); // 이미 조사가 붙은 말은 그대로
  assert.equal(withParticle("예약", "이/가"), "예약이");
  assert.equal(withParticle("매장 둘러보기", "이/가"), "매장 둘러보기가");
  assert.equal(withParticle("라이더", "은/는"), "라이더는");
});

test("한글이 아니면 둘 다 보여준다 — 틀린 조사보다 낫다", () => {
  assert.equal(hasFinalConsonant("checkout"), null);
  assert.equal(particle("checkout", "이/가"), "이(가)");
  assert.equal(particle("42", "을/를"), "을(를)");
});

test("따옴표·괄호로 끝나도 그 앞 글자로 판단한다", () => {
  // 문장에서 기능 이름을 따옴표로 감싸는 경우가 많다.
  assert.equal(particle('"예약 결제"', "이/가"), "가");
  assert.equal(particle('"로그인"', "이/가"), "이");
});

test("빈 문자열에서 터지지 않는다", () => {
  assert.equal(hasFinalConsonant(""), null);
  assert.equal(particle("", "이/가"), "이(가)");
});
