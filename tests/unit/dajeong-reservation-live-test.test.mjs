import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildLiveTestReservation,
  liveTestAccessToken,
  liveTestReadiness,
  maskKoreanPhone,
  secureOpsTokenEqual,
} from "../../dajeong/lib/reservation-live-test.ts";
import { createMemoryReservationStore, enqueueReservationBatch } from "../../dajeong/lib/reservation-queue.ts";

test("실전화 테스트는 명시적 enable, 허용 번호와 운영자 토큰을 모두 요구한다", () => {
  const disabled = liveTestReadiness({});
  assert.equal(disabled.configured, false);
  assert.deepEqual(disabled.missing.sort(), ["HARUWITH_LIVE_TEST_ENABLED", "HARUWITH_OPS_TOKEN", "HARUWITH_TEST_PHONE"].sort());

  const ready = liveTestReadiness({ HARUWITH_LIVE_TEST_ENABLED: "true", HARUWITH_TEST_PHONE: "+82 10-1234-5678", HARUWITH_OPS_TOKEN: "secret", CLAWOPS_FROM_NUMBER: "07012345678" });
  assert.equal(ready.configured, true);
  assert.equal(ready.targetPhone, "01012345678");
});

test("실전화 테스트는 발신번호 자신과 유효하지 않은 목적지를 거부한다", () => {
  const same = liveTestReadiness({ HARUWITH_LIVE_TEST_ENABLED: "true", HARUWITH_TEST_PHONE: "07012345678", HARUWITH_OPS_TOKEN: "secret", CLAWOPS_FROM_NUMBER: "+827012345678" });
  assert.equal(same.configured, false);
  assert.match(same.invalid.join(" "), /cannot equal/);

  const invalid = liveTestReadiness({ HARUWITH_LIVE_TEST_ENABLED: "true", HARUWITH_TEST_PHONE: "not-a-phone", HARUWITH_OPS_TOKEN: "secret" });
  assert.equal(invalid.configured, false);
});

test("운영자 토큰 비교와 batch 조회 토큰은 결정적이고 원문을 노출하지 않는다", () => {
  assert.equal(secureOpsTokenEqual("correct", "correct"), true);
  assert.equal(secureOpsTokenEqual("wrong", "correct"), false);
  assert.equal(secureOpsTokenEqual("", "correct"), false);
  const first = liveTestAccessToken("ops-secret", "live_test_123456789012");
  assert.equal(first, liveTestAccessToken("ops-secret", "live_test_123456789012"));
  assert.notEqual(first, liveTestAccessToken("ops-secret", "live_test_other123456"));
  assert.equal(maskKoreanPhone("01012345678"), "010****5678");
});

test("실전화 테스트도 일반 Plan/Reservation Order와 동일한 전화 Queue 입력을 만든다", async () => {
  const built = buildLiveTestReservation({
    targetPhone: "01012345678",
    reservationName: "테스트고객",
    targetDate: "2026-09-12",
    time: "19:00",
    partySize: 2,
    requestKey: "live_test_123456789012",
    accessToken: "access-token-for-test".padEnd(40, "x"),
    now: new Date("2026-09-08T00:00:00.000Z"),
  });
  assert.equal(built.plan.execution.id, built.order.id);
  assert.equal(built.order.tasks.length, 1);
  assert.equal(built.order.tasks[0].bookingMethod, "phone_only");
  assert.equal(built.order.tasks[0].phoneNumber, "01012345678");
  assert.equal(built.plan.items[0].reality.phoneNumber, "01012345678");
  assert.equal(built.contact.approvedFields.includes("name"), true);
  assert.equal(built.contact.approvedFields.includes("phone"), true);
  const store = createMemoryReservationStore();
  const queued = await enqueueReservationBatch(store, built, new Date("2026-09-08T00:00:01.000Z"));
  assert.equal(queued.created, true);
  assert.equal(store.state.jobs[queued.batch.jobIds[0]].status, "queued");
});

test("실전화 route는 서버 허용 번호만 사용하고 운영자·확인·rate limit 경계를 둔다", async () => {
  const route = await readFile(new URL("../../app/api/dajeong/reservations/live-test/route.ts", import.meta.url), "utf8");
  assert.match(route, /HARUWITH_OPS_TOKEN/);
  assert.match(route, /LIVE_TEST_CONFIRMATION/);
  assert.match(route, /readiness\.targetPhone/);
  assert.match(route, /limit:\s*3/);
  assert.doesNotMatch(route, /targetPhone:\s*z\./);
});
