import { test } from "node:test";
import assert from "node:assert/strict";
import { orderIdFor } from "@/vibesafe/lib/billing/subscription";

/**
 * orderId 결정론 — 실기동 검증에서 실제로 돈이 걸린 버그가 났던 자리.
 *
 * 원래는 "구독ID + YYYYMM"으로 만들었다. 매달 1일에 가입하면 30일 뒤
 * 갱신일도 같은 달이라, 첫 결제와 갱신 결제가 같은 orderId를 갖게 되고
 * 유니크 제약이 **정상적인 두 번째 결제**를 중복으로 착각해 막았다 —
 * 이미 토스에서 돈은 나갔는데 우리 쪽만 실패로 기록하는 상황이었다.
 * periodStart를 밀리초로 쓰는 지금 방식이 이 문제를 다시 만들지 않는지를
 * 여기서 고정해둔다.
 */

test("같은 구독·같은 주기 재시도는 같은 orderId를 낸다 (이중 청구 방지)", () => {
  const periodStart = new Date("2026-01-01T00:00:00.000Z");
  const first = orderIdFor("sub_1", periodStart);
  const retry = orderIdFor("sub_1", new Date(periodStart.getTime()));
  assert.equal(first, retry);
});

test("같은 달 안에서도 주기가 다르면 다른 orderId를 낸다 (실제로 났던 버그)", () => {
  // 1월 1일 가입 → 1월 31일 갱신. 둘 다 "2026-01"이지만 서로 다른 결제다.
  const firstCharge = orderIdFor("sub_1", new Date("2026-01-01T00:00:00.000Z"));
  const renewalCharge = orderIdFor("sub_1", new Date("2026-01-31T00:00:00.000Z"));
  assert.notEqual(firstCharge, renewalCharge);
});

test("체험 종료 후 첫 결제도 같은 규칙을 탄다 — periodStart가 다르면 다른 orderId", () => {
  // processTrialsEnding()이 trialEndsAt을 periodStart로 고정해 이 함수에
  // 넘긴다. 서로 다른 두 체험(종료일이 다른)은 반드시 다른 orderId여야 한다.
  const trialA = orderIdFor("sub_2", new Date("2026-02-08T00:00:00.000Z"));
  const trialB = orderIdFor("sub_2", new Date("2026-02-09T00:00:00.000Z"));
  assert.notEqual(trialA, trialB);
});

test("다른 구독은 같은 periodStart라도 다른 orderId를 낸다", () => {
  const periodStart = new Date("2026-01-01T00:00:00.000Z");
  assert.notEqual(orderIdFor("sub_1", periodStart), orderIdFor("sub_2", periodStart));
});
