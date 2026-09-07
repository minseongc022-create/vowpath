import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { appendPlanVersion } from "./plan-engine";
import { applyProviderQuote, approvePayment, recordProviderExecutionResult, requestPaymentReview } from "./reservation-engine";
import { scheduleDajeongPlan } from "./schedule-engine";
import { buildReservationGoal, enforceAuthorizationBoundary, koreanPhoneToE164, RESERVATION_ABSOLUTE_MAX_SECONDS, RESERVATION_TARGET_SECONDS } from "./reservation-policy";
import type { DajeongPlan, ReservationOrder, ReservationTask } from "./types";
import {
  emptyReservationState,
  type ReservationBatch,
  type ReservationContact,
  type ReservationJob,
  type ReservationMetricEvent,
  type ReservationNotification,
  type ReservationPersistentState,
  type StructuredReservationResult,
} from "./reservation-ops-types";

export type ProviderCallState = {
  callId: string;
  status: "queued" | "ringing" | "in-progress" | "completed" | "failed" | "busy" | "no-answer" | "canceled" | "rejected";
  durationSeconds?: number;
  answeredAt?: string;
  endedAt?: string;
  hangupCause?: string;
  hangupSource?: string;
  sipResponseCode?: number;
};

export type ProviderTranscript = {
  status: "not_requested" | "pending" | "processing" | "completed" | "failed";
  segments?: Array<{ speaker: string; text: string }>;
};

export interface ReservationExecutionProvider {
  id: "clawops_phone" | "haruwith_direct" | "partner_online";
  start(job: ReservationJob): Promise<{ callId: string; status: string }>;
  get(callId: string): Promise<ProviderCallState>;
  terminate(callId: string): Promise<void>;
  transcript(callId: string): Promise<ProviderTranscript>;
  requestTranscript?(callId: string): Promise<void>;
}

export interface ReservationStateStore {
  read(): Promise<ReservationPersistentState>;
  update<T>(mutate: (state: ReservationPersistentState) => T | Promise<T>): Promise<T>;
}

export function createMemoryReservationStore(seed?: ReservationPersistentState): ReservationStateStore & { state: ReservationPersistentState } {
  const store = {
    state: seed ?? emptyReservationState(),
    async read() { return structuredClone(store.state); },
    async update<T>(mutate: (state: ReservationPersistentState) => T | Promise<T>) {
      const draft = structuredClone(store.state);
      const result = await mutate(draft);
      store.state = draft;
      return result;
    },
  };
  return store;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function nowIso(now = new Date()): string { return now.toISOString(); }
function afterSeconds(now: Date, seconds: number): string { return new Date(now.getTime() + seconds * 1000).toISOString(); }

function metric(type: ReservationMetricEvent["type"], at: string, values: Partial<ReservationMetricEvent> = {}): ReservationMetricEvent {
  return { id: `metric_${randomUUID()}`, type, at, ...values };
}

function batchStatus(jobs: ReservationJob[]): ReservationBatch["status"] {
  if (!jobs.length) return "failed";
  if (jobs.some((job) => job.status === "needs_user_action")) return "needs_user_action";
  const successes = jobs.filter((job) => job.status === "succeeded").length;
  const failures = jobs.filter((job) => job.status === "failed").length;
  if (successes + failures === jobs.length) {
    if (successes && failures) return "partially_completed";
    return successes ? "completed" : "failed";
  }
  if (jobs.some((job) => ["calling", "awaiting_result"].includes(job.status))) return "running";
  return "queued";
}

function batchMessage(status: ReservationBatch["status"], jobs: ReservationJob[]): string {
  const success = jobs.filter((job) => job.status === "succeeded").length;
  const failed = jobs.filter((job) => job.status === "failed").length;
  const action = jobs.filter((job) => job.status === "needs_user_action").length;
  if (status === "completed") return `${success}곳 예약 결과가 모두 확인됐어요.`;
  if (status === "partially_completed") return `${success}곳은 예약됐고 ${failed}곳은 실패했어요. 실패한 항목만 다시 확인할 수 있어요.`;
  if (status === "needs_user_action") return `${success}곳 완료, ${action}곳은 가격이나 조건 확인이 필요해요.`;
  if (status === "failed") return `예약 ${failed || jobs.length}곳을 완료하지 못했어요. 실패 이유와 재시도 가능 여부를 확인해 주세요.`;
  return "예약을 시작했어요. Haruwith가 순서대로 처리하고 모두 끝나면 알려드릴게요.";
}

function notificationFor(batch: ReservationBatch): ReservationNotification | null {
  const mapping = {
    completed: ["reservation_complete", "예약이 완료됐어요"],
    partially_completed: ["reservation_partial", "일부 예약 결과를 확인해 주세요"],
    needs_user_action: ["reservation_action_required", "예약 조건 승인이 필요해요"],
    failed: ["reservation_failed", "예약을 완료하지 못했어요"],
  } as const;
  const value = mapping[batch.status as keyof typeof mapping];
  if (!value) return null;
  return { id: `notice_${randomUUID()}`, ownerId: batch.ownerId, batchId: batch.id, type: value[0], title: value[1], body: batch.message, createdAt: batch.updatedAt, delivery: process.env.HARUWITH_NOTIFICATION_WEBHOOK_URL ? "provider_pending" : "in_app" };
}

function updateBatch(state: ReservationPersistentState, batchId: string, timestamp: string): void {
  const batch = state.batches[batchId];
  if (!batch) return;
  const jobs = batch.jobIds.map((id) => state.jobs[id]).filter(Boolean);
  const previous = batch.status;
  batch.status = batchStatus(jobs);
  batch.message = batchMessage(batch.status, jobs);
  batch.updatedAt = timestamp;
  if (batch.status !== previous && ["completed", "partially_completed", "needs_user_action", "failed"].includes(batch.status)) {
    const notice = notificationFor(batch);
    if (notice && !state.notifications.some((entry) => entry.batchId === batchId && entry.type === notice.type)) state.notifications.unshift(notice);
  }
}

function eligibleTasks(order: ReservationOrder): ReservationTask[] {
  return order.tasks.filter((task) => {
    if (task.kind !== "reservation" || !task.phoneNumber || ["booked", "completed", "purchased"].includes(task.status)) return false;
    try { koreanPhoneToE164(task.phoneNumber); return true; } catch { return false; }
  });
}

function assertReservationInput(input: EnqueueBatchInput): void {
  if (!input.plan?.id || !input.order?.id || input.order.planId !== input.plan.id || !Array.isArray(input.plan.items) || !Array.isArray(input.order.tasks)) throw new Error("INVALID_RESERVATION_INPUT");
  if (!input.contact.approvedFields.includes("name") || !input.contact.approvedFields.includes("phone") || !/^0\d{8,10}$/.test(input.contact.phone)) throw new Error("INVALID_RESERVATION_CONTACT");
  for (const task of eligibleTasks(input.order)) {
    const item = input.plan.items.find((entry) => entry.id === task.itemId);
    if (!item || item.title !== task.title || item.time !== task.time || item.reality?.phoneNumber !== task.phoneNumber) throw new Error("RESERVATION_TASK_PLAN_MISMATCH");
  }
}

export type EnqueueBatchInput = {
  plan: DajeongPlan;
  order: ReservationOrder;
  ownerId: string;
  accessToken: string;
  requestKey: string;
  contact: ReservationContact;
  attributionTokens?: string[];
};

export async function enqueueReservationBatch(store: ReservationStateStore, input: EnqueueBatchInput, now = new Date()): Promise<{ batch: ReservationBatch; created: boolean }> {
  assertReservationInput(input);
  return store.update((state) => {
    const key = hash([input.ownerId, input.plan.id, input.order.id, input.requestKey].join("|"));
    const existingId = state.idempotency[key];
    if (existingId && state.batches[existingId]) return { batch: state.batches[existingId], created: false };
    const tasks = eligibleTasks(input.order);
    if (!tasks.length) throw new Error("NO_PHONE_RESERVATIONS");
    const timestamp = nowIso(now);
    const batchId = `rb_${randomUUID()}`;
    const jobs = tasks.map((task, index): ReservationJob => {
      const jobId = `rj_${randomUUID()}`;
      return {
        id: jobId,
        batchId,
        ownerId: input.ownerId,
        planId: input.plan.id,
        orderId: input.order.id,
        taskId: task.id,
        itemId: task.itemId,
        provider: "clawops_phone",
        goal: buildReservationGoal(input.plan, task, input.contact),
        contact: input.contact,
        status: "queued",
        queuePosition: index + 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        attempts: [],
        idempotencyKey: hash(`${key}|${task.id}`),
      };
    });
    const order = {
      ...input.order,
      status: "executing" as const,
      updatedAt: timestamp,
      message: "예약을 시작했어요. Haruwith가 순서대로 처리하고 모두 끝나면 알려드릴게요.",
      tasks: input.order.tasks.map((task) => jobs.some((job) => job.taskId === task.id) ? { ...task, status: "executing" as const, explanation: "AI 전화 예약 대기열에 들어갔어요. 앱을 닫아도 백그라운드에서 계속 처리합니다." } : task),
    };
    const plan = { ...input.plan, execution: order };
    const batch: ReservationBatch = {
      id: batchId,
      ownerId: input.ownerId,
      accessTokenHash: hash(input.accessToken),
      planId: input.plan.id,
      orderId: input.order.id,
      status: "queued",
      jobIds: jobs.map((job) => job.id),
      plan,
      order,
      createdAt: timestamp,
      updatedAt: timestamp,
      message: order.message,
      idempotencyKey: key,
      attributionTokens: input.attributionTokens?.slice(0, 10),
    };
    state.batches[batchId] = batch;
    for (const job of jobs) state.jobs[job.id] = job;
    state.idempotency[key] = batchId;
    state.metrics.push(metric("request", timestamp, { batchId, value: jobs.length }));
    return { batch, created: true };
  });
}

function retryable(status: string, cause?: string): boolean {
  if (["invalid_number", "number_changed", "incompatible_destination"].includes(cause ?? "")) return false;
  return ["busy", "no-answer", "failed", "canceled"].includes(status) || ["no_answer", "user_busy", "temporary_failure", "switching_congestion", "no_circuit_available", "network_out_of_order", "destination_out_of_order", "recovery_on_timer_expire", "resource_unavailable", "app_error", "call_stuck"].includes(cause ?? "");
}

function providerTerminal(status: string): boolean {
  return ["completed", "failed", "busy", "no-answer", "canceled", "rejected"].includes(status);
}

function markDisconnected(state: ReservationPersistentState, job: ReservationJob, call: ProviderCallState, timestamp: string): void {
  const attempt = job.attempts.at(-1);
  if (attempt) Object.assign(attempt, { endedAt: call.endedAt ?? timestamp, durationSeconds: call.durationSeconds, providerStatus: call.status, hangupCause: call.hangupCause, hangupSource: call.hangupSource, sipResponseCode: call.sipResponseCode });
  const outcomeUnknownAfterAnswer = Boolean((attempt?.answeredAt || call.hangupCause === "absolute_timeout") && call.status !== "completed");
  const canRetry = !outcomeUnknownAfterAnswer && retryable(call.status, call.hangupCause) && job.attempts.length < 3;
  job.status = outcomeUnknownAfterAnswer ? "needs_user_action" : canRetry ? "retry_scheduled" : "failed";
  job.retryAt = canRetry ? new Date(new Date(timestamp).getTime() + (call.status === "busy" ? 5 : 15) * 60_000).toISOString() : undefined;
  job.failureReason = outcomeUnknownAfterAnswer ? "직원과 연결된 뒤 통화가 끊겨 예약 여부가 불명확해요. 중복 예약 방지를 위해 자동 재통화하지 않습니다." : call.hangupCause === "invalid_number" ? "확인된 전화번호가 결번이에요." : call.status === "busy" ? "통화 중이라 다시 시도할게요." : call.status === "no-answer" ? "가게에서 전화를 받지 않았어요." : `전화가 ${call.status} 상태로 끝났어요.`;
  job.updatedAt = timestamp;
  state.metrics.push(metric("call_finished", timestamp, { jobId: job.id, batchId: job.batchId, value: call.durationSeconds ?? 0, tags: { status: call.status, retry: canRetry } }));
  if (canRetry) state.metrics.push(metric("retry", timestamp, { jobId: job.id, batchId: job.batchId, tags: { reason: call.status } }));
}

export function applyStructuredResultToBatch(batch: ReservationBatch, job: ReservationJob, raw: StructuredReservationResult, timestamp: string): { batch: ReservationBatch; job: ReservationJob } {
  const result = enforceAuthorizationBoundary(job.goal, raw);
  let order = batch.order;
  if (result.status === "confirmed" && !result.requiresUserAction) {
    order = recordProviderExecutionResult(order, job.taskId, { ok: true, confirmationId: job.attempts.at(-1)?.externalCallId ?? `call_${job.id}`, confirmedAt: timestamp, details: result.specialConditions?.join(" · ") });
    job.status = "succeeded";
  } else if (result.requiresUserAction || result.status === "needs_user_action") {
    const money = result.deposit ?? result.minimumSpend ?? result.additionalFees?.[0];
    if (money) {
      const task = order.tasks.find((entry) => entry.id === job.taskId);
      const estimated = task?.price.estimatedAmount ?? 0;
      const additionalFees = result.additionalFees?.reduce((sum, fee) => sum + fee.amount, 0) ?? 0;
      const confirmedTotal = Math.max(estimated + additionalFees, result.minimumSpend?.amount ?? 0, result.deposit?.amount ?? 0);
      order = applyProviderQuote(order, job.taskId, {
        available: true,
        confirmedTotalAmount: confirmedTotal,
        prepayAmount: result.deposit?.amount ?? 0,
        onsiteAmount: Math.max(0, confirmedTotal - (result.deposit?.amount ?? 0)),
        quoteId: `phone_${job.attempts.at(-1)?.externalCallId ?? job.id}`,
        checkedAt: timestamp,
      });
      order = requestPaymentReview(order);
    }
    order = { ...order, status: "needs_approval", tasks: order.tasks.map((task) => task.id === job.taskId ? { ...task, status: result.deposit ? "needs_deposit" : "needs_approval", proposedChange: { time: result.confirmedTime, additionalCost: money?.amount, reason: result.contradiction ?? result.failureReason ?? "새 조건을 사용자가 확인해야 해요.", requiresApproval: true }, failureReason: result.failureReason } : task) };
    job.status = "needs_user_action";
  } else {
    order = recordProviderExecutionResult(order, job.taskId, { ok: false, reason: result.failureReason ?? "통화에서 예약 확정을 확인하지 못했어요.", alternativeRequired: result.status === "unavailable" });
    job.status = "failed";
  }
  if (job.status === "succeeded" && result.confirmedTime) {
    order = { ...order, tasks: order.tasks.map((task) => task.id === job.taskId ? { ...task, time: result.confirmedTime! } : task) };
  }
  const item = batch.plan.items.find((entry) => entry.id === job.itemId);
  const items = batch.plan.items.map((entry) => entry.id === job.itemId ? {
    ...entry,
    time: job.status === "succeeded" ? result.confirmedTime ?? entry.time : entry.time,
    durationMinutes: job.status === "succeeded" ? result.durationMinutes ?? entry.durationMinutes : entry.durationMinutes,
    endTime: undefined,
    timeLocked: job.status === "succeeded" || entry.timeLocked,
  } : entry);
  const planWithResult: DajeongPlan = { ...batch.plan, items, execution: order, updatedAt: timestamp };
  const scheduled = scheduleDajeongPlan(planWithResult, { applyWeatherReordering: false });
  const plan = appendPlanVersion(scheduled, `전화 예약 결과: ${item?.title ?? job.goal.venueName}`, job.status === "succeeded" ? `${result.confirmedTime ?? job.goal.time} 예약 확정과 이후 일정을 반영` : "확인이 필요한 조건과 이후 일정 영향을 반영");
  job.result = result;
  job.updatedAt = timestamp;
  return { batch: { ...batch, plan, order: plan.execution ?? order, updatedAt: timestamp }, job };
}

export async function approveReservationJob(store: ReservationStateStore, batchId: string, jobId: string, approvalText: string, now = new Date()): Promise<ReservationBatch> {
  return store.update((state) => {
    const batch = state.batches[batchId];
    const job = state.jobs[jobId];
    if (!batch || !job || job.batchId !== batchId || job.status !== "needs_user_action" || !job.result) throw new Error("RESERVATION_ACTION_NOT_AVAILABLE");
    if (!/승인|동의/.test(approvalText) || !approvalText.includes(job.goal.venueName)) throw new Error("EXPLICIT_APPROVAL_REQUIRED");
    const timestamp = nowIso(now);
    const money = job.result.deposit ?? job.result.minimumSpend ?? job.result.additionalFees?.[0];
    if (money) {
      const normalized = approvalText.replaceAll(",", "").replaceAll(" ", "");
      const exactAmount = new RegExp(`(^|[^0-9])${money.amount}원([^0-9]|$)`).test(normalized);
      if (!exactAmount || !/예약금|추가요금|최소주문|결제/.test(approvalText)) throw new Error("EXACT_AMOUNT_APPROVAL_REQUIRED");
      if (batch.order.approval) {
        const approved = approvePayment(batch.order, approvalText);
        if (approved.approval?.state !== "granted") throw new Error("EXPLICIT_APPROVAL_REQUIRED");
        batch.order = approved;
      }
      batch.plan = { ...batch.plan, execution: batch.order, updatedAt: timestamp };
      job.failureReason = `${money.amount.toLocaleString("ko-KR")}원 조건 승인은 기록했어요. Haruwith에 안전한 송금·결제 연동이 없어 아직 예약금 결제나 예약 완료는 처리하지 않았어요.`;
    } else {
      if (job.result.confirmedTime) {
        job.goal.time = job.result.confirmedTime;
        const time = job.goal.constraints.find((entry) => entry.field === "time");
        if (time) { time.value = job.result.confirmedTime; time.strength = "HARD"; time.toleranceMinutes = 0; time.note = "사용자가 전화 대안을 명시적으로 승인함"; }
      }
      if (job.result.confirmedDate) job.goal.date = job.result.confirmedDate;
      job.status = "queued";
      job.result = undefined;
      job.failureReason = undefined;
      job.retryAt = undefined;
      batch.order = { ...batch.order, status: "executing", tasks: batch.order.tasks.map((task) => task.id === job.taskId ? { ...task, status: "executing", proposedChange: undefined, failureReason: undefined } : task) };
      batch.plan = { ...batch.plan, execution: batch.order, updatedAt: timestamp };
    }
    job.updatedAt = timestamp;
    updateBatch(state, batchId, timestamp);
    return batch;
  });
}

export async function retryFailedReservationJob(store: ReservationStateStore, batchId: string, jobId: string, now = new Date()): Promise<ReservationBatch> {
  return store.update((state) => {
    const batch = state.batches[batchId];
    const job = state.jobs[jobId];
    if (!batch || !job || job.batchId !== batchId || job.status !== "failed") throw new Error("RESERVATION_RETRY_NOT_AVAILABLE");
    const last = job.attempts.at(-1);
    const unsafeCause = ["invalid_number", "number_changed", "incompatible_destination"].includes(last?.hangupCause ?? "");
    const retryableFailure = !last?.answeredAt && !unsafeCause && ["busy", "no-answer", "failed", "canceled"].includes(last?.providerStatus ?? "");
    if (!retryableFailure) throw new Error("RESERVATION_RETRY_NOT_SAFE");
    const timestamp = nowIso(now);
    job.status = "queued";
    job.retryAt = undefined;
    job.result = undefined;
    job.failureReason = undefined;
    job.updatedAt = timestamp;
    batch.order = { ...batch.order, status: "executing", tasks: batch.order.tasks.map((task) => task.id === job.taskId ? { ...task, status: "executing", failureReason: undefined } : task) };
    batch.plan = { ...batch.plan, execution: batch.order, updatedAt: timestamp };
    updateBatch(state, batchId, timestamp);
    return batch;
  });
}

export type TickOptions = {
  capacity?: number;
  now?: Date;
  extractResult: (job: ReservationJob, transcript: ProviderTranscript) => Promise<StructuredReservationResult>;
};

export async function tickReservationQueue(store: ReservationStateStore, provider: ReservationExecutionProvider, options: TickOptions): Promise<{ started: number; processed: number; active: number }> {
  const now = options.now ?? new Date();
  const timestamp = nowIso(now);
  const capacity = Math.max(1, Math.min(50, Math.floor(options.capacity ?? 1)));
  const snapshot = await store.read();
  const active = Object.values(snapshot.jobs).filter((job) => job.status === "calling");
  let processed = 0;
  for (const job of active) {
    const attempt = job.attempts.at(-1);
    if (!attempt?.externalCallId) {
      if (now.getTime() - new Date(attempt?.startedAt ?? job.updatedAt).getTime() >= 90_000) {
        await store.update((state) => {
          const current = state.jobs[job.id];
          if (!current || current.status !== "calling" || current.attempts.at(-1)?.externalCallId) return;
          current.status = "needs_user_action";
          current.failureReason = "Worker가 통화 시작 응답을 저장하기 전에 중단됐어요. 중복 예약 방지를 위해 자동 재통화하지 않습니다.";
          current.updatedAt = timestamp;
          current.result = { status: "inconclusive", venue: current.goal.venueName, requiresUserAction: true, retryRecommended: false, confidence: 0, finalReadbackConfirmed: false, failureReason: current.failureReason };
          updateBatch(state, current.batchId, timestamp);
        });
        processed += 1;
      }
      continue;
    }
    let call: ProviderCallState;
    try { call = await provider.get(attempt.externalCallId); } catch { continue; }
    if (!providerTerminal(call.status) && job.absoluteDeadlineAt && now.getTime() >= new Date(job.absoluteDeadlineAt).getTime()) {
      await provider.terminate(attempt.externalCallId).catch(() => undefined);
      call = { ...call, status: "failed", endedAt: timestamp, hangupCause: "absolute_timeout", hangupSource: "app", durationSeconds: RESERVATION_ABSOLUTE_MAX_SECONDS };
    }
    if (!providerTerminal(call.status)) {
      await store.update((state) => {
        const current = state.jobs[job.id];
        const currentAttempt = current?.attempts.at(-1);
        if (!current || !currentAttempt || currentAttempt.externalCallId !== call.callId) return;
        currentAttempt.providerStatus = call.status;
        if (call.status === "in-progress" && !currentAttempt.answeredAt) currentAttempt.answeredAt = call.answeredAt ?? timestamp;
        current.updatedAt = timestamp;
      });
      continue;
    }
    await store.update((state) => {
      const current = state.jobs[job.id];
      if (!current || current.status !== "calling") return;
      if (call.status === "completed") {
        current.status = "awaiting_result";
        current.updatedAt = timestamp;
        const last = current.attempts.at(-1);
        if (last) Object.assign(last, { endedAt: call.endedAt ?? timestamp, durationSeconds: call.durationSeconds, providerStatus: call.status });
        state.metrics.push(metric("call_finished", timestamp, { jobId: current.id, batchId: current.batchId, value: call.durationSeconds ?? 0, tags: { status: call.status, withinTarget: (call.durationSeconds ?? 0) <= RESERVATION_TARGET_SECONDS, hitMax: (call.durationSeconds ?? 0) >= RESERVATION_ABSOLUTE_MAX_SECONDS } }));
      } else markDisconnected(state, current, call, timestamp);
      updateBatch(state, current.batchId, timestamp);
    });
    processed += 1;
  }

  const afterCalls = await store.read();
  const waiting = Object.values(afterCalls.jobs).filter((job) => job.status === "awaiting_result");
  for (const job of waiting) {
    const callId = job.attempts.at(-1)?.externalCallId;
    if (!callId) continue;
    let transcript: ProviderTranscript;
    try { transcript = await provider.transcript(callId); } catch { continue; }
    await store.update((state) => {
      const current = state.jobs[job.id];
      const attempt = current?.attempts.at(-1);
      if (attempt) attempt.transcriptStatus = transcript.status;
    });
    if (transcript.status === "not_requested" && provider.requestTranscript) {
      await provider.requestTranscript(callId).catch(() => undefined);
      continue;
    }
    const endedAt = job.attempts.at(-1)?.endedAt;
    const transcriptExpired = Boolean(endedAt && now.getTime() - new Date(endedAt).getTime() >= 15 * 60_000);
    if (transcript.status === "failed" || transcriptExpired) {
      await store.update((state) => {
        const current = state.jobs[job.id];
        if (!current || current.status !== "awaiting_result") return;
        current.status = "needs_user_action";
        current.failureReason = transcript.status === "failed" ? "통화 transcript 생성에 실패해 예약 결과를 안전하게 확인할 수 없어요." : "통화 transcript 확인이 오래 지연되어 예약 여부를 직접 확인해야 해요.";
        current.result = { status: "inconclusive", venue: current.goal.venueName, requiresUserAction: true, retryRecommended: false, confidence: 0, finalReadbackConfirmed: false, failureReason: current.failureReason };
        current.updatedAt = timestamp;
        updateBatch(state, current.batchId, timestamp);
      });
      processed += 1;
      continue;
    }
    if (transcript.status !== "completed") continue;
    let extracted: StructuredReservationResult;
    try { extracted = await options.extractResult(job, transcript); }
    catch {
      extracted = { status: "inconclusive", venue: job.goal.venueName, requiresUserAction: true, retryRecommended: false, confidence: 0, finalReadbackConfirmed: false, failureReason: "통화는 끝났지만 결과 구조화에 실패해 사람이 확인해야 해요." };
    }
    await store.update((state) => {
      const current = state.jobs[job.id];
      const batch = state.batches[job.batchId];
      if (!current || !batch || current.status !== "awaiting_result") return;
      const applied = applyStructuredResultToBatch(batch, current, extracted, timestamp);
      state.jobs[job.id] = applied.job;
      state.batches[job.batchId] = applied.batch;
      state.metrics.push(metric("result", timestamp, { jobId: job.id, batchId: job.batchId, tags: { status: applied.job.status, confidence: extracted.confidence } }));
      updateBatch(state, job.batchId, timestamp);
      state.batches[job.batchId].plan = applied.batch.plan;
      state.batches[job.batchId].order = applied.batch.order;
    });
    processed += 1;
  }

  await store.update((state) => {
    for (const job of Object.values(state.jobs)) {
      if (job.status === "retry_scheduled" && job.retryAt && now.getTime() >= new Date(job.retryAt).getTime()) {
        job.status = "queued";
        job.updatedAt = timestamp;
      }
    }
  });

  const ready = await store.read();
  const activeCount = Object.values(ready.jobs).filter((job) => job.status === "calling").length;
  const queued = Object.values(ready.jobs).filter((job) => job.status === "queued").sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, Math.max(0, capacity - activeCount));
  let started = 0;
  for (const candidate of queued) {
    const claimed = await store.update((state) => {
      const current = state.jobs[candidate.id];
      const count = Object.values(state.jobs).filter((job) => job.status === "calling").length;
      if (!current || current.status !== "queued" || count >= capacity) return null;
      current.status = "calling";
      current.startedAt = timestamp;
      current.targetDeadlineAt = afterSeconds(now, RESERVATION_TARGET_SECONDS);
      current.absoluteDeadlineAt = afterSeconds(now, RESERVATION_ABSOLUTE_MAX_SECONDS);
      current.updatedAt = timestamp;
      current.attempts.push({ attempt: current.attempts.length + 1, provider: provider.id, startedAt: timestamp });
      state.metrics.push(metric("queue_wait", timestamp, { jobId: current.id, batchId: current.batchId, value: Math.max(0, (now.getTime() - new Date(current.createdAt).getTime()) / 1000) }));
      updateBatch(state, current.batchId, timestamp);
      return structuredClone(current);
    });
    if (!claimed) continue;
    try {
      const launched = await provider.start(claimed);
      await store.update((state) => {
        const current = state.jobs[claimed.id];
        if (!current || current.status !== "calling") return;
        const attempt = current.attempts.at(-1);
        if (attempt) Object.assign(attempt, { externalCallId: launched.callId, providerStatus: launched.status });
        current.updatedAt = timestamp;
        state.metrics.push(metric("call_started", timestamp, { jobId: current.id, batchId: current.batchId }));
      });
      started += 1;
    } catch (error) {
      await store.update((state) => {
        const current = state.jobs[claimed.id];
        if (!current) return;
        const attempt = current.attempts.at(-1);
        if (attempt) Object.assign(attempt, { endedAt: timestamp, providerStatus: "launch_unknown", hangupCause: "app_error", hangupSource: "app" });
        current.status = "needs_user_action";
        current.retryAt = undefined;
        current.failureReason = "ClawOps 통화 생성 응답을 확인하지 못했어요. 요청이 전달됐을 가능성이 있어 중복 예약 방지를 위해 자동 재통화하지 않습니다.";
        current.result = { status: "inconclusive", venue: current.goal.venueName, requiresUserAction: true, retryRecommended: false, confidence: 0, finalReadbackConfirmed: false, failureReason: current.failureReason };
        current.updatedAt = timestamp;
        state.metrics.push(metric("call_finished", timestamp, { jobId: current.id, batchId: current.batchId, value: 0, tags: { status: "launch_unknown", error: error instanceof Error ? error.name : "unknown" } }));
        updateBatch(state, current.batchId, timestamp);
      });
    }
  }
  const final = await store.read();
  return { started, processed, active: Object.values(final.jobs).filter((job) => job.status === "calling").length };
}

export async function recordClawOpsWebhook(store: ReservationStateStore, payload: ProviderCallState & { eventKey: string }, now = new Date()): Promise<{ duplicate: boolean; jobId?: string }> {
  return store.update((state) => {
    if (state.webhookEvents[payload.eventKey]) return { duplicate: true };
    state.webhookEvents[payload.eventKey] = nowIso(now);
    const job = Object.values(state.jobs).find((entry) => entry.attempts.some((attempt) => attempt.externalCallId === payload.callId));
    if (!job) return { duplicate: false };
    const attempt = job.attempts.find((entry) => entry.externalCallId === payload.callId);
    if (attempt) {
      attempt.providerStatus = payload.status;
      attempt.durationSeconds = payload.durationSeconds ?? attempt.durationSeconds;
      attempt.hangupCause = payload.hangupCause ?? attempt.hangupCause;
      attempt.hangupSource = payload.hangupSource ?? attempt.hangupSource;
      attempt.sipResponseCode = payload.sipResponseCode ?? attempt.sipResponseCode;
      if (payload.status === "in-progress") attempt.answeredAt = nowIso(now);
      if (providerTerminal(payload.status)) attempt.endedAt = nowIso(now);
    }
    job.updatedAt = nowIso(now);
    return { duplicate: false, jobId: job.id };
  });
}

export function canAccessBatch(batch: ReservationBatch, accessToken: string): boolean {
  const a = Buffer.from(batch.accessTokenHash);
  const b = Buffer.from(hash(accessToken));
  return a.length === b.length && timingSafeEqual(a, b);
}
