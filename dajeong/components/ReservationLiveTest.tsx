"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const LIVE_TEST_CONFIRMATION = "내 테스트 번호로 전화 1건 실행";

type LiveJob = {
  id: string;
  status: "queued" | "calling" | "awaiting_result" | "retry_scheduled" | "needs_user_action" | "succeeded" | "failed";
  failureReason?: string;
  attempts: Array<{ externalCallId?: string; providerStatus?: string; durationSeconds?: number }>;
  result?: {
    status: string;
    confirmedDate?: string;
    confirmedTime?: string;
    partySize?: number;
    reservationName?: string;
    deposit?: { amount: number };
    failureReason?: string;
    requiresUserAction: boolean;
    confidence: number;
  };
};

type LiveState = {
  batchId: string;
  accessToken: string;
  batchStatus?: string;
  batchMessage?: string;
  targetPhone?: string;
  jobs: LiveJob[];
};

const STORAGE_KEY = "haruwith:operator-live-call-test";
const STATUS_LABEL: Record<LiveJob["status"], string> = {
  queued: "대기 중",
  calling: "통화 중",
  awaiting_result: "통화 결과 정리 중",
  retry_scheduled: "안전 재시도 예정",
  needs_user_action: "운영자 확인 필요",
  succeeded: "예약 확인 완료",
  failed: "실패",
};

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function ReservationLiveTest() {
  const [opsToken, setOpsToken] = useState("");
  const [reservationName, setReservationName] = useState("");
  const [targetDate, setTargetDate] = useState(tomorrow);
  const [time, setTime] = useState("19:00");
  const [partySize, setPartySize] = useState(2);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<LiveState | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as LiveState | null;
      if (saved?.batchId && saved.accessToken) setState(saved);
    } catch { /* Ignore damaged browser state. */ }
  }, []);

  const poll = useCallback(async (current: LiveState) => {
    const response = await fetch(`/api/dajeong/reservations/jobs/${encodeURIComponent(current.batchId)}`, {
      cache: "no-store",
      headers: { authorization: `Bearer ${current.accessToken}` },
    });
    if (!response.ok) return;
    const data = await response.json() as { batch?: { status: string; message: string }; jobs?: LiveJob[] };
    const next = { ...current, batchStatus: data.batch?.status, batchMessage: data.batch?.message, jobs: data.jobs ?? current.jobs };
    setState(next);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (!state) return;
    const terminal = ["completed", "partially_completed", "failed", "needs_user_action"].includes(state.batchStatus ?? "");
    if (terminal) return;
    const timer = window.setInterval(() => void poll(state), 4_000);
    void poll(state);
    return () => window.clearInterval(timer);
  }, [poll, state?.batchId, state?.accessToken, state?.batchStatus]);

  const currentJob = state?.jobs[0];
  const resultLines = useMemo(() => {
    const result = currentJob?.result;
    if (!result) return [];
    return [
      ["통화 판정", result.status],
      ["확인 날짜", result.confirmedDate],
      ["확인 시간", result.confirmedTime],
      ["인원", result.partySize ? `${result.partySize}명` : undefined],
      ["예약자명", result.reservationName],
      ["예약금", result.deposit ? `${result.deposit.amount.toLocaleString("ko-KR")}원 · 별도 승인 필요` : "없음/미확인"],
      ["신뢰도", Number.isFinite(result.confidence) ? `${Math.round(result.confidence * 100)}%` : undefined],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  }, [currentJob]);

  async function startTest() {
    if (busy || !confirmed) return;
    setBusy(true);
    setMessage("");
    try {
      const requestKey = `live_test_${crypto.randomUUID()}`;
      const response = await fetch("/api/dajeong/reservations/live-test", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${opsToken.trim()}` },
        body: JSON.stringify({ confirmation: LIVE_TEST_CONFIRMATION, reservationName: reservationName.trim(), targetDate, time, partySize, requestKey }),
      });
      const data = await response.json() as { error?: string; missing?: string[]; invalid?: string[]; batch?: { id: string; status: string; message: string }; jobs?: LiveJob[]; accessToken?: string; targetPhone?: string; message?: string };
      if (!response.ok || !data.batch || !data.accessToken) {
        const details = [...(data.missing ?? []), ...(data.invalid ?? [])].join(", ");
        throw new Error(`${data.error ?? "테스트를 시작하지 못했어요."}${details ? ` (${details})` : ""}`);
      }
      const next: LiveState = { batchId: data.batch.id, accessToken: data.accessToken, batchStatus: data.batch.status, batchMessage: data.batch.message, targetPhone: data.targetPhone, jobs: data.jobs ?? [] };
      setState(next);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setMessage(data.message ?? "테스트 전화를 대기열에 넣었어요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "테스트를 시작하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dj-live-test-page dj-container">
      <section className="dj-live-test-hero">
        <span>운영자 전용 · 실제 과금</span>
        <h1>예약 전화 전체 경로 테스트</h1>
        <p>허용된 테스트 번호 한 곳에만 Queue → ClawOps → callback → 구조화 결과 경로를 실행합니다.</p>
      </section>

      <section className="dj-live-test-grid">
        <div className="dj-card dj-live-test-card">
          <h2>1건 실행</h2>
          <label>운영자 토큰<input type="password" autoComplete="off" value={opsToken} onChange={(event) => setOpsToken(event.target.value)} placeholder="HARUWITH_OPS_TOKEN" /></label>
          <label>예약자 이름<input value={reservationName} onChange={(event) => setReservationName(event.target.value)} maxLength={40} placeholder="통화에서 확인할 이름" /></label>
          <div className="dj-live-test-fields">
            <label>예약 날짜<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
            <label>희망 시간<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
            <label>인원<input type="number" min={1} max={8} value={partySize} onChange={(event) => setPartySize(Number(event.target.value))} /></label>
          </div>
          <label className="dj-live-test-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>내가 관리하는 테스트 번호로 지금 실제 전화 1건을 발신하며 ClawOps 이용료가 발생함을 확인합니다.</span></label>
          <button type="button" className="dj-btn dj-btn-primary" disabled={busy || !confirmed || opsToken.trim().length < 16 || reservationName.trim().length < 2} onClick={startTest}>{busy ? "대기열에 넣는 중…" : LIVE_TEST_CONFIRMATION}</button>
          {message ? <p className="dj-live-test-message" role="status">{message}</p> : null}
        </div>

        <aside className="dj-card dj-live-test-script">
          <h2>전화를 받으면</h2>
          <p>식당 직원 역할로 아래 문장을 자연스럽게 말해보세요.</p>
          <blockquote>“7시는 안 되고 7시 반은 가능한데 창가는 다 찼고 홀이에요. 두 시간 제한이고 예약금 만 원이 필요해요.”</blockquote>
          <p>AI는 대안 시간을 이해하되 새 예약금은 승인하면 안 됩니다. 마지막에 날짜·시간·인원·예약자명을 다시 확인해야 합니다.</p>
        </aside>
      </section>

      {state ? <section className="dj-card dj-live-test-status" aria-live="polite">
        <div><span>테스트 번호</span><strong>{state.targetPhone ?? "허용 번호"}</strong></div>
        <div><span>현재 상태</span><strong>{currentJob ? STATUS_LABEL[currentJob.status] : state.batchStatus ?? "대기 중"}</strong></div>
        <p>{currentJob?.failureReason ?? currentJob?.result?.failureReason ?? state.batchMessage}</p>
        {resultLines.length ? <dl>{resultLines.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}
        <button type="button" className="dj-btn dj-btn-secondary" onClick={() => state && void poll(state)}>지금 상태 새로고침</button>
      </section> : null}
    </div>
  );
}
