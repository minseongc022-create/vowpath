"use client";

import { useCallback, useEffect, useState } from "react";
import { BillingRegisterButton } from "./BillingRegisterButton";

type Plan = {
  key: string;
  title: string;
  priceKrw: number;
  tagline: string;
  limits: { projects: number; testRunsPerMonth: number; aiAnalysesPerMonth: number; browserMsPerMonth: number };
  features: string[];
};

type Subscription = {
  planKey: string;
  status: string;
  cardCompany: string | null;
  cardNumberMasked: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  charges: { status: string; amount: number; failReason: string | null; createdAt: string }[];
};

type BillingState = {
  currentPlan: Plan;
  plans: Plan[];
  subscription: Subscription | null;
  usage: { test_runs: number; ai_analyses: number; browser_ms: number };
  tossConfigured: boolean;
  customerEmail: string;
};

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

const STATUS_LABEL: Record<string, { text: string; tone: "ok" | "warn" | "down" | "neutral" }> = {
  active: { text: "이용 중", tone: "ok" },
  past_due: { text: "결제 실패 · 재시도 중", tone: "warn" },
  canceled: { text: "해지됨", tone: "neutral" },
  incomplete: { text: "카드 등록 필요", tone: "warn" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * 결제 화면.
 *
 * ★ 무슨 일이 일어날지 미리 말한다
 *
 * "구독하기" 버튼을 누르면 카드 등록 화면(토스 도메인)으로 이동하고,
 * 돌아오면 그 자리에서 첫 달 요금이 결제된다는 걸 버튼 옆에 그대로 적는다.
 * 결제는 되돌리기 어려운 일이라, 눌렀을 때 뭐가 벌어지는지 모르게 하지 않는다.
 */
export function BillingPanel() {
  const [state, setState] = useState<BillingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/vibesafe/billing");
    const data = (await res.json()) as BillingState & { ok?: boolean; error?: string };
    if (!res.ok) {
      setError(data.error ?? "결제 정보를 불러오지 못했습니다.");
      return;
    }
    setState(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function cancel() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/vibesafe/billing/cancel", { method: "POST" });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "해지하지 못했습니다.");
      return;
    }
    setNotice("해지를 예약했습니다. 이번 결제 기간이 끝날 때까지는 그대로 쓰실 수 있습니다.");
    await load();
  }

  async function resume() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/vibesafe/billing/resume", { method: "POST" });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "처리하지 못했습니다.");
      return;
    }
    setNotice("해지를 취소했습니다. 계속 이용하실 수 있습니다.");
    await load();
  }

  if (!state) return <p className="vs-hint">불러오는 중…</p>;

  const { subscription } = state;
  const proPlan = state.plans.find((p) => p.key === "pro");
  const isPro = state.currentPlan.key === "pro";
  const isActive = subscription?.status === "active";

  return (
    <div className="vs-stack">
      {error && (
        <div className="vs-alert" data-tone="error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="vs-alert" data-tone="ok" role="status">
          {notice}
        </div>
      )}

      {!state.tossConfigured && (
        <div className="vs-alert" data-tone="warn">
          결제 기능이 아직 설정되지 않았습니다. 무료 베타 한도로 계속 이용하실 수 있습니다.
        </div>
      )}

      {/* 지금 상태 */}
      <div className="vs-card vs-stack">
        <div className="vs-row-between">
          <div>
            <strong style={{ fontSize: 18 }}>{state.currentPlan.title}</strong>
            {subscription && (
              <span className="vs-badge" data-tone={STATUS_LABEL[subscription.status]?.tone ?? "neutral"} style={{ marginLeft: 8 }}>
                {STATUS_LABEL[subscription.status]?.text ?? subscription.status}
              </span>
            )}
          </div>
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {state.currentPlan.priceKrw > 0 ? `${won(state.currentPlan.priceKrw)} / 월` : "무료"}
          </span>
        </div>

        {isActive && subscription && (
          <>
            <p className="vs-hint">
              {subscription.cardCompany ?? "카드"} ({subscription.cardNumberMasked ?? "····"}) ·{" "}
              {subscription.cancelAtPeriodEnd
                ? `${formatDate(subscription.currentPeriodEnd)}까지 이용 후 해지됩니다`
                : `다음 결제일: ${formatDate(subscription.currentPeriodEnd)}`}
            </p>
            <div className="vs-row">
              {subscription.cancelAtPeriodEnd ? (
                <button className="vs-btn" onClick={() => void resume()} disabled={busy}>
                  해지 취소하기
                </button>
              ) : (
                <button className="vs-btn vs-btn-danger" onClick={() => void cancel()} disabled={busy}>
                  {busy ? "처리 중…" : "구독 해지하기"}
                </button>
              )}
            </div>
          </>
        )}

        {subscription?.status === "past_due" && (
          <div className="vs-alert" data-tone="warn">
            최근 결제 시도가 실패했습니다{subscription.charges[0]?.failReason ? ` — ${subscription.charges[0].failReason}` : ""}.
            며칠 안에 다시 시도합니다. 계속 실패하면 무료 베타로 자동 전환됩니다.
          </div>
        )}
      </div>

      {/* 이번 달 사용량 */}
      <div className="vs-grid-3">
        <div className="vs-stat">
          <div className="vs-stat-value">{state.usage.test_runs}</div>
          <div className="vs-stat-label">이번 달 검사 / {state.currentPlan.limits.testRunsPerMonth}</div>
        </div>
        <div className="vs-stat">
          <div className="vs-stat-value">{state.usage.ai_analyses}</div>
          <div className="vs-stat-label">이번 달 앱 분석 / {state.currentPlan.limits.aiAnalysesPerMonth}</div>
        </div>
        <div className="vs-stat">
          <div className="vs-stat-value">{Math.round(state.usage.browser_ms / 60000)}분</div>
          <div className="vs-stat-label">
            이번 달 브라우저 실행 / {Math.round(state.currentPlan.limits.browserMsPerMonth / 60000)}분
          </div>
        </div>
      </div>

      {/* 업그레이드 — 이미 프로면 안 보여준다 */}
      {!isPro && proPlan && state.tossConfigured && (
        <div className="vs-card vs-stack">
          <h2 className="vs-section-title">{proPlan.title}로 업그레이드</h2>
          <p className="vs-hint">{proPlan.tagline}</p>
          <ul className="vs-flow-list">
            {proPlan.features.map((f) => (
              <li key={f} className="vs-flow-item">
                <span className="vs-flow-name">{f}</span>
              </li>
            ))}
          </ul>
          <p style={{ fontSize: 20, fontWeight: 700 }}>{won(proPlan.priceKrw)} / 월</p>
          <BillingRegisterButton customerEmail={state.customerEmail} />
        </div>
      )}

      {/* 결제 내역 — 성공만 보여주지 않는다 */}
      {subscription && subscription.charges.length > 0 && (
        <div className="vs-card vs-card-flush">
          <div className="vs-card-head">
            <h2 className="vs-section-title">결제 내역</h2>
          </div>
          {subscription.charges.map((c, i) => (
            <div key={i} className="vs-flow-item">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5 }}>{formatDate(c.createdAt)}</div>
                {c.status === "failed" && c.failReason && (
                  <p className="vs-hint" style={{ margin: "2px 0 0" }}>
                    {c.failReason}
                  </p>
                )}
              </div>
              <span className="vs-badge" data-tone={c.status === "succeeded" ? "ok" : "down"}>
                {c.status === "succeeded" ? "결제됨" : "실패"}
              </span>
              <span style={{ fontWeight: 600, minWidth: 90, textAlign: "right" }}>{won(c.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
