import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { adFunnel, createMemoryAdStore, recordAdEvent, serveSponsoredPlacement } from "../../dajeong/lib/ads.ts";
import { clawOpsReadiness, monthlyMinuteAllowance, normalizeClawOpsFromNumber, reservationWorkerCapacity } from "../../dajeong/lib/clawops-config.ts";
import { createDajeongPlan } from "../../dajeong/lib/plan-engine.ts";
import { prepareReservationOrder } from "../../dajeong/lib/reservation-engine.ts";
import { reservationMetrics } from "../../dajeong/lib/reservation-metrics.ts";
import { buildClawOpsCallInstruction, enforceAuthorizationBoundary, koreanPhoneToE164 } from "../../dajeong/lib/reservation-policy.ts";
import { routeReservationProvider } from "../../dajeong/lib/reservation-provider-router.ts";
import { approveReservationJob, canAccessBatch, createMemoryReservationStore, enqueueReservationBatch, recordClawOpsWebhook, retryFailedReservationJob, tickReservationQueue } from "../../dajeong/lib/reservation-queue.ts";

const contact = { name: "하루고객", phone: "01012345678", approvedFields: ["name", "phone"], approvedAt: "2026-09-07T00:00:00.000Z", purpose: "식당 예약" };

function phonePlan(title = "성수 식당") {
  const base = createDajeongPlan({ request: "토요일 7시쯤 성수에서 여자친구와 식사", region: "성수", targetDate: "2026-09-12", budget: 150_000, partySize: 2 });
  const meal = base.items.find((item) => item.category === "meal") ?? base.items[0];
  const plan = { ...base, items: [{ ...meal, title, time: "19:00", reservationRequired: true, reality: { ...meal.reality, phoneNumber: "0212345678", bookingMethod: "phone_only" } }] };
  return { ...plan, execution: prepareReservationOrder(plan) };
}

async function enqueue(store, suffix, plan = phonePlan()) {
  return enqueueReservationBatch(store, { plan, order: plan.execution, ownerId: `owner_${suffix}`, accessToken: `token_${suffix}`.padEnd(40, "x"), requestKey: `request_${suffix}`.padEnd(20, "x"), contact });
}

class FakeProvider {
  id = "clawops_phone";
  starts = [];
  states = new Map();
  transcripts = new Map();
  terminated = [];
  async start(job) { const callId = `call_${job.id}`; this.starts.push(job.id); this.states.set(callId, { callId, status: "in-progress" }); return { callId, status: "queued" }; }
  async get(callId) { return this.states.get(callId) ?? { callId, status: "in-progress" }; }
  async terminate(callId) { this.terminated.push(callId); this.states.set(callId, { callId, status: "failed", hangupCause: "absolute_timeout", durationSeconds: 240 }); }
  async transcript(callId) { return this.transcripts.get(callId) ?? { status: "pending" }; }
  async requestTranscript() {}
}

const confirmed = (job, overrides = {}) => ({ status: "confirmed", confirmedDate: job.goal.date, confirmedTime: job.goal.time, partySize: job.goal.partySize, reservationName: job.goal.reservationName, venue: job.goal.venueName, requiresUserAction: false, retryRecommended: false, confidence: 0.98, finalReadbackConfirmed: true, ...overrides });
const extractor = async (job) => confirmed(job);

test("예약 worker 배포 설정은 5초 상시 프로세스와 secret 주입 경계를 유지한다", async () => {
  const blueprint = await readFile(new URL("../../render.yaml", import.meta.url), "utf8");
  assert.match(blueprint, /type: worker/);
  assert.match(blueprint, /plan: 0\.5c-512mb/);
  assert.match(blueprint, /startCommand: node scripts\/haruwith-reservation-worker\.mjs/);
  assert.match(blueprint, /HARUWITH_PUBLIC_BASE_URL[\s\S]*https:\/\/haruwith\.com/);
  assert.match(blueprint, /HARUWITH_WORKER_POLL_MS[\s\S]*"5000"/);
  assert.match(blueprint, /HARUWITH_WORKER_TOKEN[\s\S]*sync: false/);
  assert.doesNotMatch(blueprint, /CLAWOPS_API_KEY|CLAWOPS_SIGNING_KEY/);
});

test("예약 Queue: concurrency=1은 A calling, B/C queued를 보장한다", async () => {
  const store = createMemoryReservationStore();
  await enqueue(store, "a"); await enqueue(store, "b"); await enqueue(store, "c");
  const provider = new FakeProvider();
  const tick = await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:00:00Z"), extractResult: extractor });
  assert.equal(tick.started, 1);
  assert.equal(Object.values(store.state.jobs).filter((job) => job.status === "calling").length, 1);
  assert.equal(Object.values(store.state.jobs).filter((job) => job.status === "queued").length, 2);
});

test("예약 Queue: configurable concurrency=10은 열 건을 동시에 claim할 수 있다", async () => {
  const store = createMemoryReservationStore();
  for (let index = 0; index < 10; index += 1) await enqueue(store, `capacity_${index}`);
  const provider = new FakeProvider();
  const tick = await tickReservationQueue(store, provider, { capacity: 10, now: new Date("2026-09-07T00:00:00Z"), extractResult: extractor });
  assert.equal(tick.started, 10);
  assert.equal(provider.starts.length, 10);
});

test("예약 Queue: 동일 request key 버튼 연타는 batch와 전화를 중복 생성하지 않는다", async () => {
  const store = createMemoryReservationStore();
  const plan = phonePlan();
  const first = await enqueue(store, "duplicate", plan);
  const second = await enqueue(store, "duplicate", plan);
  assert.equal(first.batch.id, second.batch.id);
  assert.equal(second.created, false);
  assert.equal(Object.keys(store.state.jobs).length, 1);
});

test("예약 webhook: 동일 callback은 한 번만 반영한다", async () => {
  const store = createMemoryReservationStore();
  await enqueue(store, "webhook");
  const provider = new FakeProvider();
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:00:00Z"), extractResult: extractor });
  const callId = Object.values(store.state.jobs)[0].attempts[0].externalCallId;
  const payload = { callId, status: "completed", eventKey: `${callId}:completed:1` };
  assert.equal((await recordClawOpsWebhook(store, payload)).duplicate, false);
  assert.equal((await recordClawOpsWebhook(store, payload)).duplicate, true);
});

test("예약 Queue: worker crash의 시작 결과 미상은 자동 재통화하지 않아 중복 예약을 막는다", async () => {
  const store = createMemoryReservationStore();
  const { batch } = await enqueue(store, "crash");
  const job = store.state.jobs[batch.jobIds[0]];
  job.status = "calling";
  job.updatedAt = "2026-09-07T00:00:00Z";
  job.attempts.push({ attempt: 1, provider: "clawops_phone", startedAt: "2026-09-07T00:00:00Z" });
  const provider = new FakeProvider();
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:02:00Z"), extractResult: extractor });
  assert.equal(store.state.jobs[job.id].status, "needs_user_action");
  assert.equal(provider.starts.length, 0);
});

test("예약 Queue: ClawOps create 응답 미상은 자동 POST 재시도하지 않는다", async () => {
  const store = createMemoryReservationStore(); await enqueue(store, "launch_unknown");
  class LaunchUnknownProvider extends FakeProvider { async start() { throw new Error("socket closed after request"); } }
  const provider = new LaunchUnknownProvider();
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:00:00Z"), extractResult: extractor });
  const job = Object.values(store.state.jobs)[0];
  assert.equal(job.status, "needs_user_action");
  assert.equal(job.retryAt, undefined);
  assert.equal(job.attempts.length, 1);
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:10:00Z"), extractResult: extractor });
  assert.equal(job.attempts.length, 1);
});

test("예약 Queue: busy/no-answer/disconnect는 제한된 retry로 돌아간다", async () => {
  for (const status of ["busy", "no-answer", "failed"]) {
    const store = createMemoryReservationStore(); const provider = new FakeProvider(); await enqueue(store, `retry_${status}`);
    await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:00:00Z"), extractResult: extractor });
    const job = Object.values(store.state.jobs)[0]; const callId = job.attempts[0].externalCallId;
    provider.states.set(callId, { callId, status, hangupCause: status === "failed" ? "temporary_failure" : undefined });
    await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:01:00Z"), extractResult: extractor });
    assert.equal(store.state.jobs[job.id].status, "retry_scheduled");
  }
});

test("예약 Queue: 직원 연결 뒤 끊김은 예약 여부가 불명확하므로 자동 재통화하지 않는다", async () => {
  const store = createMemoryReservationStore(); const provider = new FakeProvider(); await enqueue(store, "answered_disconnect");
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:00:00Z"), extractResult: extractor });
  const job = Object.values(store.state.jobs)[0]; const callId = job.attempts[0].externalCallId;
  await recordClawOpsWebhook(store, { callId, status: "in-progress", eventKey: `${callId}:answered` }, new Date("2026-09-07T00:00:20Z"));
  provider.states.set(callId, { callId, status: "failed", hangupCause: "network_out_of_order" });
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:01:00Z"), extractResult: extractor });
  assert.equal(store.state.jobs[job.id].status, "needs_user_action");
  assert.equal(store.state.jobs[job.id].retryAt, undefined);
});

test("예약 Queue: wrong number는 재시도하지 않고 실패한다", async () => {
  const store = createMemoryReservationStore(); const provider = new FakeProvider(); await enqueue(store, "wrong");
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:00:00Z"), extractResult: extractor });
  const job = Object.values(store.state.jobs)[0]; const callId = job.attempts[0].externalCallId;
  provider.states.set(callId, { callId, status: "failed", hangupCause: "invalid_number" });
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:01:00Z"), extractResult: extractor });
  assert.equal(store.state.jobs[job.id].status, "failed");
  assert.equal(store.state.jobs[job.id].retryAt, undefined);
  await assert.rejects(() => retryFailedReservationJob(store, job.batchId, job.id), /RESERVATION_RETRY_NOT_SAFE/);
});

test("예약 Queue: 연결 전 일시 실패만 사용자가 해당 항목 단독 재시도할 수 있다", async () => {
  const store = createMemoryReservationStore(); const { batch } = await enqueue(store, "manual_retry"); const job = store.state.jobs[batch.jobIds[0]];
  job.status = "failed";
  job.failureReason = "no answer retries exhausted";
  job.attempts = [{ attempt: 1, provider: "clawops_phone", externalCallId: "call_retry", startedAt: "2026-09-07T00:00:00Z", endedAt: "2026-09-07T00:01:00Z", providerStatus: "no-answer", hangupCause: "no_answer" }];
  const updated = await retryFailedReservationJob(store, batch.id, job.id, new Date("2026-09-07T01:00:00Z"));
  assert.equal(store.state.jobs[job.id].status, "queued");
  assert.equal(updated.order.tasks[0].status, "executing");
});

test("예약 Queue: 240초 absolute deadline은 provider hangup을 실제 호출한다", async () => {
  const store = createMemoryReservationStore(); const provider = new FakeProvider(); await enqueue(store, "timeout");
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:00:00Z"), extractResult: extractor });
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:04:01Z"), extractResult: extractor });
  assert.equal(provider.terminated.length, 1);
  assert.equal(Object.values(store.state.jobs)[0].status, "needs_user_action");
  assert.equal(Object.values(store.state.jobs)[0].retryAt, undefined);
});

test("예약 정책: FLEXIBLE 30분 대안은 승인 가능하지만 HARD 시간 변경은 차단한다", () => {
  const plan = phonePlan(); const task = plan.execution.tasks[0];
  const store = createMemoryReservationStore();
  return enqueue(store, "policy", plan).then(({ batch }) => {
    const job = store.state.jobs[batch.jobIds[0]];
    const flexible = enforceAuthorizationBoundary(job.goal, confirmed(job, { confirmedTime: "19:30" }));
    assert.equal(flexible.status, "confirmed");
    job.goal.constraints.find((entry) => entry.field === "time").strength = "HARD";
    const hard = enforceAuthorizationBoundary(job.goal, confirmed(job, { confirmedTime: "19:30" }));
    assert.equal(hard.status, "needs_user_action");
  });
});

test("예약 정책: 핵심 확정값이 하나라도 없으면 completed 통화도 예약 성공이 아니다", async () => {
  const store = createMemoryReservationStore(); const { batch } = await enqueue(store, "missing_core"); const job = store.state.jobs[batch.jobIds[0]];
  const missingName = enforceAuthorizationBoundary(job.goal, confirmed(job, { reservationName: undefined }));
  assert.equal(missingName.status, "needs_user_action");
  assert.match(missingName.contradiction, /날짜·시간·인원·예약자명/);
  const duplicate = enforceAuthorizationBoundary(job.goal, { status: "duplicate_found", venue: job.goal.venueName, requiresUserAction: false, retryRecommended: false, confidence: 0.99, finalReadbackConfirmed: false });
  assert.equal(duplicate.status, "needs_user_action");
});

test("예약 정책: 새 예약금은 별도 사용자 승인 없이는 확정되지 않는다", async () => {
  const store = createMemoryReservationStore(); const { batch } = await enqueue(store, "deposit"); const job = store.state.jobs[batch.jobIds[0]];
  const result = enforceAuthorizationBoundary(job.goal, confirmed(job, { deposit: { amount: 10_000, currency: "KRW", method: "deposit", paymentMethod: "bank_transfer" } }));
  assert.equal(result.status, "needs_user_action");
  assert.equal(result.requiresUserAction, true);
});

test("예약 정책: 명확한 예약 불가는 성공 readback 없이도 실패로 구조화한다", async () => {
  const store = createMemoryReservationStore(); const { batch } = await enqueue(store, "unavailable_policy"); const job = store.state.jobs[batch.jobIds[0]];
  const result = enforceAuthorizationBoundary(job.goal, { status: "unavailable", venue: job.goal.venueName, failureReason: "해당 날짜 예약 마감", requiresUserAction: false, retryRecommended: false, confidence: 0.97, finalReadbackConfirmed: false });
  assert.equal(result.status, "unavailable");
  assert.equal(result.requiresUserAction, false);
});

test("승인 전 대안 시간은 proposed change에만 남고 실제 Plan 시간은 바뀌지 않는다", async () => {
  const store = createMemoryReservationStore(); const provider = new FakeProvider(); const { batch } = await enqueue(store, "pending_alternative");
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:00:00Z"), extractResult: extractor });
  const job = store.state.jobs[batch.jobIds[0]]; const callId = job.attempts[0].externalCallId;
  job.goal.constraints.find((entry) => entry.field === "time").strength = "HARD";
  provider.states.set(callId, { callId, status: "completed", durationSeconds: 80 });
  provider.transcripts.set(callId, { status: "completed", segments: [{ speaker: "speaker_0", text: "7시 반만 가능합니다" }] });
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:02:00Z"), extractResult: async (current) => confirmed(current, { confirmedTime: "19:30" }) });
  const updated = store.state.batches[batch.id];
  assert.equal(updated.plan.items[0].time, "19:00");
  assert.equal(updated.order.tasks[0].time, "19:00");
  assert.equal(updated.order.tasks[0].proposedChange.time, "19:30");
});

test("예약금 승인은 업체명·정확한 금액·금전 조건을 모두 명시해야 하며 결제 완료로 바뀌지 않는다", async () => {
  const store = createMemoryReservationStore(); const { batch } = await enqueue(store, "money_approval"); const job = store.state.jobs[batch.jobIds[0]];
  job.status = "needs_user_action";
  job.result = confirmed(job, { status: "needs_user_action", requiresUserAction: true, deposit: { amount: 10_000, currency: "KRW", method: "deposit", paymentMethod: "bank_transfer" } });
  await assert.rejects(() => approveReservationJob(store, batch.id, job.id, "좋아 승인"), /EXPLICIT_APPROVAL_REQUIRED/);
  await assert.rejects(() => approveReservationJob(store, batch.id, job.id, `${job.goal.venueName} 예약금 110000원 승인`), /EXACT_AMOUNT_APPROVAL_REQUIRED/);
  const updated = await approveReservationJob(store, batch.id, job.id, `${job.goal.venueName} 예약금 10000원 결제 승인에 동의합니다`);
  assert.equal(store.state.jobs[job.id].status, "needs_user_action");
  assert.match(store.state.jobs[job.id].failureReason, /아직 예약금 결제나 예약 완료는 처리하지 않았어요/);
  assert.notEqual(updated.status, "completed");
});

test("전화 Agent policy는 개인정보·금전·최종 readback·3분/4분 경계를 포함한다", async () => {
  const store = createMemoryReservationStore(); const { batch } = await enqueue(store, "prompt"); const job = store.state.jobs[batch.jobIds[0]];
  const prompt = buildClawOpsCallInstruction(job.goal, contact);
  assert.match(prompt, /HARD/); assert.match(prompt, /카드번호·CVV/); assert.match(prompt, /날짜·시간·인원·예약자명/); assert.match(prompt, /180초/); assert.match(prompt, /225초/);
});

test("ClawOps 발신 대상은 한국 국내번호를 E.164로 변환하고 잘못된 번호를 거절한다", () => {
  assert.equal(koreanPhoneToE164("02-1234-5678"), "+82212345678");
  assert.equal(koreanPhoneToE164("010 1234 5678"), "+821012345678");
  assert.equal(koreanPhoneToE164("+82 10 1234 5678"), "+821012345678");
  assert.throws(() => koreanPhoneToE164("1234"), /INVALID_KOREAN_PHONE_NUMBER/);
});

test("ClawOps 보유 발신번호는 국내 070과 +82 입력을 같은 국내 형식으로 정규화한다", () => {
  assert.equal(normalizeClawOpsFromNumber("070-1234-5678"), "07012345678");
  assert.equal(normalizeClawOpsFromNumber("+82 70 1234 5678"), "07012345678");
  assert.throws(() => normalizeClawOpsFromNumber("0101"), /CLAWOPS_FROM_NUMBER_MUST_BE_KOREAN_OWNED_NUMBER/);
});

test("ClawOps readiness는 비밀값을 노출하지 않고 누락된 환경변수 이름만 반환한다", () => {
  const ready = clawOpsReadiness({ CLAWOPS_API_KEY: "key", CLAWOPS_ACCOUNT_ID: "account", CLAWOPS_FROM_NUMBER: "07012345678", CLAWOPS_AGENT_ID: "agent", CLAWOPS_SIGNING_KEY: "sign" });
  assert.deepEqual(ready, { configured: true, missing: [], invalid: [] });
  const missing = clawOpsReadiness({ CLAWOPS_API_KEY: "key" });
  assert.equal(missing.configured, false);
  assert.deepEqual(missing.missing, ["CLAWOPS_ACCOUNT_ID", "CLAWOPS_FROM_NUMBER", "CLAWOPS_AGENT_ID", "CLAWOPS_SIGNING_KEY"]);
  assert.deepEqual(missing.invalid, []);
  const invalid = clawOpsReadiness({ CLAWOPS_API_KEY: "key", CLAWOPS_ACCOUNT_ID: "account", CLAWOPS_FROM_NUMBER: "1234", CLAWOPS_AGENT_ID: "agent", CLAWOPS_SIGNING_KEY: "sign" });
  assert.deepEqual(invalid.invalid, ["CLAWOPS_FROM_NUMBER"]);
});

test("예약 worker capacity와 월 분 한도는 운영 설정값을 안전 범위로 정규화한다", () => {
  assert.equal(reservationWorkerCapacity({ HARUWITH_RESERVATION_CONCURRENCY: "10" }), 10);
  assert.equal(reservationWorkerCapacity({ HARUWITH_RESERVATION_CONCURRENCY: "999" }), 50);
  assert.equal(reservationWorkerCapacity({ HARUWITH_RESERVATION_CONCURRENCY: "invalid" }), 1);
  assert.equal(monthlyMinuteAllowance({ HARUWITH_MONTHLY_MINUTE_ALLOWANCE: "100" }), 100);
});

test("예약 provider router는 direct/partner/전화/manual 경계를 분리한다", () => {
  const task = phonePlan().execution.tasks[0];
  assert.equal(routeReservationProvider({ ...task, bookingMethod: "haruon_direct" }), "haruwith_direct");
  assert.equal(routeReservationProvider(task), "clawops_phone");
  assert.equal(routeReservationProvider({ ...task, phoneNumber: undefined, bookingMethod: "external_online" }), "partner_online");
  assert.equal(routeReservationProvider({ ...task, phoneNumber: undefined, bookingMethod: "unsupported" }), "manual");
});

test("예약 Queue: transcript 실패는 예약 성공으로 추정하지 않고 사용자 확인으로 끝낸다", async () => {
  const store = createMemoryReservationStore(); const provider = new FakeProvider(); const { batch } = await enqueue(store, "transcript_failed");
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:00:00Z"), extractResult: extractor });
  const job = store.state.jobs[batch.jobIds[0]]; const callId = job.attempts[0].externalCallId;
  provider.states.set(callId, { callId, status: "completed", durationSeconds: 80 });
  provider.transcripts.set(callId, { status: "failed" });
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:02:00Z"), extractResult: extractor });
  assert.equal(store.state.jobs[job.id].status, "needs_user_action");
  assert.equal(store.state.jobs[job.id].result.status, "inconclusive");
});

test("예약 성공 structured result는 Plan 시간·체류시간·예약 상태를 함께 재계산한다", async () => {
  const store = createMemoryReservationStore(); const provider = new FakeProvider(); const { batch } = await enqueue(store, "success");
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:00:00Z"), extractResult: async (job) => confirmed(job, { confirmedTime: "19:30", durationMinutes: 120 }) });
  const job = store.state.jobs[batch.jobIds[0]]; const callId = job.attempts[0].externalCallId;
  provider.states.set(callId, { callId, status: "completed", durationSeconds: 95 }); provider.transcripts.set(callId, { status: "completed", segments: [{ speaker: "speaker_0", text: "예약 확인" }] });
  await tickReservationQueue(store, provider, { capacity: 1, now: new Date("2026-09-07T00:02:00Z"), extractResult: async (current) => confirmed(current, { confirmedTime: "19:30", durationMinutes: 120 }) });
  const updated = store.state.batches[batch.id];
  assert.equal(store.state.jobs[job.id].status, "succeeded");
  assert.equal(updated.plan.items[0].time, "19:30");
  assert.equal(updated.plan.items[0].durationMinutes, 120);
  assert.equal(updated.order.tasks[0].time, "19:30");
  assert.equal(updated.order.tasks[0].status, "booked");
  assert.equal(updated.status, "completed");
  assert.equal(store.state.notifications[0].type, "reservation_complete");
});

test("예약 부분 성공은 성공을 되돌리지 않고 batch에 정확히 남긴다", async () => {
  const store = createMemoryReservationStore();
  const one = phonePlan("A 식당"); const secondItem = { ...one.items[0], id: "second", title: "B 식당", reality: { ...one.items[0].reality, phoneNumber: "0299999999" } };
  const plan = { ...one, items: [one.items[0], secondItem] }; plan.execution = prepareReservationOrder(plan);
  const { batch } = await enqueue(store, "partial", plan);
  const [first, second] = batch.jobIds.map((id) => store.state.jobs[id]);
  first.status = "succeeded"; first.result = confirmed(first); second.status = "failed"; second.failureReason = "예약 불가";
  batch.status = "partially_completed";
  assert.equal(first.status, "succeeded"); assert.equal(second.status, "failed"); assert.equal(batch.status, "partially_completed");
});

test("운영 지표는 통화시간·3분율·4분율·queue wait·100분 경고를 계산한다", async () => {
  const store = createMemoryReservationStore(); const { batch } = await enqueue(store, "metrics"); const job = store.state.jobs[batch.jobIds[0]];
  job.status = "succeeded"; job.attempts = [{ attempt: 1, provider: "clawops_phone", startedAt: "2026-09-07T00:00:00Z", durationSeconds: 6_000, providerStatus: "completed" }];
  store.state.metrics.push({ id: "wait", type: "queue_wait", jobId: job.id, batchId: batch.id, at: "2026-09-07T00:00:00Z", value: 30 });
  const metrics = reservationMetrics(store.state, new Date("2026-09-07T12:00:00Z"));
  assert.equal(metrics.totalOutboundMinutes, 100); assert.equal(metrics.monthlyOutboundMinutes, 100); assert.equal(metrics.minuteAllowanceWarning, true); assert.equal(metrics.p95QueueWaitSeconds, 30);
});

test("Ads V1은 관련 verified Sponsored만 노출하고 organic plan 데이터와 분리해 attribution한다", async () => {
  const now = "2026-09-07T00:00:00Z"; const store = createMemoryAdStore();
  store.state.advertisers.adv = { id: "adv", name: "광고주", status: "active", createdAt: now };
  store.state.merchants.mer = { id: "mer", advertiserId: "adv", name: "성수 꽃집", region: "성수", categories: ["flower"], verifiedAt: now, status: "active" };
  store.state.campaigns.cam = { id: "cam", advertiserId: "adv", merchantId: "mer", name: "생일 꽃", status: "active", startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-09-30T00:00:00Z", targeting: { regions: ["성수"], categories: ["flower"], occasions: ["birthday"] }, budget: { totalKrw: 100_000, dailyKrw: 10_000, spentKrw: 0 }, createdAt: now };
  store.state.creatives.cre = { id: "cre", campaignId: "cam", headline: "생일 꽃", body: "픽업 꽃다발", destinationUrl: "https://example.com", disclosure: "Sponsored", status: "active" };
  store.state.placements.plc = { id: "plc", campaignId: "cam", creativeId: "cre", surface: "execution_footer", status: "active" };
  const organicPlan = phonePlan(); const ids = organicPlan.items.map((item) => item.id);
  const placement = await serveSponsoredPlacement(store, { region: "성수", categories: ["flower"], occasion: "birthday", planId: organicPlan.id }, "execution_footer", "secret", new Date(now));
  assert.equal(placement.disclosure, "Sponsored"); assert.deepEqual(organicPlan.items.map((item) => item.id), ids);
  assert.equal((await recordAdEvent(store, placement.attributionToken, "secret", "click", { planId: organicPlan.id })).recorded, true);
  assert.equal((await recordAdEvent(store, placement.attributionToken, "secret", "click", { planId: organicPlan.id })).recorded, false);
  assert.equal((await recordAdEvent(store, placement.attributionToken, "secret", "plan_add", { planId: organicPlan.id })).recorded, true);
  assert.equal((await recordAdEvent(store, placement.attributionToken, "secret", "reservation_attempt", { planId: organicPlan.id })).recorded, true);
  assert.equal((await recordAdEvent(store, placement.attributionToken, "secret", "reservation_success", { planId: organicPlan.id })).recorded, true);
  assert.equal((await recordAdEvent(store, placement.attributionToken, "secret", "conversion", { planId: organicPlan.id, valueKrw: 50_000 })).recorded, true);
  assert.deepEqual(adFunnel(store.state), { impressions: 1, clicks: 1, planAdds: 1, reservationAttempts: 1, reservationSuccesses: 1, conversions: 1 });
  await assert.rejects(() => recordAdEvent(store, `${placement.attributionToken}x`, "secret", "conversion"), /INVALID_ATTRIBUTION_TOKEN/);
});

test("Ads V1은 impression 비용을 총예산과 일예산에 반영하고 소진 뒤 노출하지 않는다", async () => {
  const now = "2026-09-07T00:00:00Z"; const store = createMemoryAdStore();
  store.state.advertisers.adv = { id: "adv", name: "광고주", status: "active", createdAt: now };
  store.state.merchants.mer = { id: "mer", advertiserId: "adv", name: "성수 식당", region: "성수", categories: ["meal"], verifiedAt: now, status: "active" };
  store.state.campaigns.cam = { id: "cam", advertiserId: "adv", merchantId: "mer", name: "저녁", status: "active", startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-09-30T00:00:00Z", targeting: { regions: ["성수"], categories: ["meal"], occasions: [] }, budget: { totalKrw: 20, dailyKrw: 10, spentKrw: 0, impressionCostKrw: 10 }, createdAt: now };
  store.state.creatives.cre = { id: "cre", campaignId: "cam", headline: "성수 저녁", body: "예약 가능한 식당", destinationUrl: "https://example.com", disclosure: "Sponsored", status: "active" };
  store.state.placements.plc = { id: "plc", campaignId: "cam", creativeId: "cre", surface: "execution_footer", status: "active" };
  const intent = { region: "성수", categories: ["meal"], planId: "plan_budget" };
  assert.ok(await serveSponsoredPlacement(store, intent, "execution_footer", "secret", new Date(now)));
  assert.equal(store.state.campaigns.cam.budget.spentKrw, 10);
  assert.equal(await serveSponsoredPlacement(store, intent, "execution_footer", "secret", new Date("2026-09-07T01:00:00Z")), null);
  assert.ok(await serveSponsoredPlacement(store, intent, "execution_footer", "secret", new Date("2026-09-08T00:00:00Z")));
  assert.equal(store.state.campaigns.cam.budget.spentKrw, 20);
  assert.equal(await serveSponsoredPlacement(store, intent, "execution_footer", "secret", new Date("2026-09-09T00:00:00Z")), null);
});

test("예약 batch 조회 권한은 원문 token을 저장하지 않고 timing-safe hash로 검증한다", async () => {
  const store = createMemoryReservationStore(); const { batch } = await enqueue(store, "auth");
  const token = "token_auth".padEnd(40, "x");
  assert.equal(canAccessBatch(batch, token), true); assert.equal(canAccessBatch(batch, "wrong".padEnd(40, "x")), false); assert.equal(JSON.stringify(batch).includes(token), false);
});
