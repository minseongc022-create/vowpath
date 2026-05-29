"use client";

import { useEffect, useState } from "react";
import { phoneSetup as copy } from "@/lib/content";
import { formatPriority } from "@/lib/priority-labels";
import type { JobPriority } from "@/lib/types";

type PhoneStatus = {
  twilioConfigured: boolean;
  phoneNumber: string | null;
  webhookBase: string;
  defaultUserSet: boolean;
};

export function PhoneSetup({ embedded = false }: { embedded?: boolean }) {
  const [status, setStatus] = useState<PhoneStatus | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState(false);
  const [configureMsg, setConfigureMsg] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState("");
  const [completing, setCompleting] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulateMsg, setSimulateMsg] = useState<string | null>(null);
  const [simulateOk, setSimulateOk] = useState(false);

  useEffect(() => {
    fetch("/api/phone/status")
      .then((r) => r.json())
      .then((d: PhoneStatus) => setStatus(d))
      .catch(() =>
        setStatus({
          twilioConfigured: false,
          phoneNumber: null,
          webhookBase: "",
          defaultUserSet: false,
        }),
      );
    fetch("/api/me")
      .then((r) => r.json())
      .then((d: { userId?: string }) => setUserId(d.userId ?? null))
      .catch(() => setUserId(null));
  }, []);

  if (!status) return null;

  const webhookIsLocal =
    !status.webhookBase ||
    status.webhookBase.includes("localhost") ||
    status.webhookBase.includes("127.0.0.1");

  const voiceWebhookUrl = status.webhookBase
    ? `${status.webhookBase}${copy.voiceWebhookPath}`
    : null;

  const ready =
    status.twilioConfigured && status.defaultUserSet && !webhookIsLocal;

  async function handleSimulateCall() {
    setSimulating(true);
    setSimulateMsg(null);
    setSimulateOk(false);
    try {
      const res = await fetch("/api/dev/simulate-call", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        card?: { priority?: string; symptom?: string };
        error?: string;
      };
      if (!res.ok) {
        setSimulateMsg(data.error ?? "시뮬레이션 실패. 로그인 상태와 dev 서버를 확인하세요.");
        return;
      }
      setSimulateOk(true);
      const p = data.card?.priority as JobPriority | undefined;
      setSimulateMsg(
        `${copy.simulateCallOk} ${p ? formatPriority(p) : ""} · ${data.card?.symptom ?? ""}`,
      );
      window.dispatchEvent(new CustomEvent("vowpath:calls-updated"));
    } catch {
      setSimulateMsg("네트워크 오류. npm run dev 가 켜져 있는지 확인하세요.");
    } finally {
      setSimulating(false);
    }
  }

  async function handleTwilioComplete() {
    setCompleting(true);
    setConfigureMsg(null);
    try {
      const res = await fetch("/api/dev/twilio-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authToken }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) {
        setConfigureMsg(data.error ?? copy.configureWebhookFail);
        return;
      }
      setConfigureMsg(data.message ?? copy.configureWebhookOk);
      setAuthToken("");
      const st = await fetch("/api/phone/status").then((r) => r.json());
      setStatus(st as PhoneStatus);
    } catch {
      setConfigureMsg(copy.configureWebhookFail);
    } finally {
      setCompleting(false);
    }
  }

  async function handleConfigureWebhook() {
    setConfiguring(true);
    setConfigureMsg(null);
    try {
      const res = await fetch("/api/twilio/configure-webhook", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; voiceUrl?: string; error?: string };
      if (!res.ok) {
        setConfigureMsg(data.error ?? copy.configureWebhookFail);
        return;
      }
      setConfigureMsg(`${copy.configureWebhookOk} ${data.voiceUrl ?? ""}`);
    } catch {
      setConfigureMsg(copy.configureWebhookFail);
    } finally {
      setConfiguring(false);
    }
  }

  const content = (
    <>
      {!embedded ? (
        <>
          <p className="text-sm font-medium text-brand-600">{copy.eyebrow}</p>
          <h2 className="mt-1 text-lg font-semibold text-brand-950">{copy.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{copy.subtitle}</p>
        </>
      ) : null}

      <dl className={`grid gap-2 text-sm ${embedded ? "mt-3" : "mt-4"}`}>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">{copy.twilioLabel}</dt>
          <dd className="font-medium text-brand-950">
            {status.twilioConfigured ? copy.yes : copy.no}
          </dd>
        </div>
        {status.phoneNumber ? (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">{copy.numberLabel}</dt>
            <dd className="font-mono text-brand-950">{status.phoneNumber}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">{copy.userLabel}</dt>
          <dd className="font-medium text-brand-950">
            {status.defaultUserSet ? copy.yes : copy.no}
          </dd>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
          <dt className="text-slate-500">{copy.webhookLabel}</dt>
          <dd className="break-all text-right font-mono text-xs text-brand-900">
            {webhookIsLocal ? "미설정 (localhost는 Twilio가 못 붙음)" : status.webhookBase}
          </dd>
        </div>
      </dl>

      {voiceWebhookUrl && !webhookIsLocal ? (
        <div className="mt-3 space-y-2">
          <p className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-900">
            Twilio Voice 웹훅에 넣을 주소:
            <br />
            <span className="font-mono font-semibold">{voiceWebhookUrl}</span>
          </p>
          {status.twilioConfigured ? (
            <button
              type="button"
              onClick={handleConfigureWebhook}
              disabled={configuring}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {configuring ? "등록 중…" : copy.configureWebhook}
            </button>
          ) : null}
          {configureMsg ? (
            <p className="text-xs text-brand-800">{configureMsg}</p>
          ) : null}
        </div>
      ) : null}

      {(userId || !status.defaultUserSet) && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
          TWILIO_DEFAULT_USER_ID=
          {userId ?? "로그인 후 여기 표시됨"}
        </p>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
        <p className="text-xs text-slate-700">{copy.krTrialNote}</p>
        <p className="text-xs text-slate-600">{copy.ivrNote}</p>
        <p className="text-xs text-slate-600">{copy.costNote}</p>
        <button
          type="button"
          onClick={handleSimulateCall}
          disabled={simulating}
          className="mt-3 w-full rounded-lg border border-brand-300 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-60"
        >
          {simulating ? "AI 처리 중… (10~20초)" : copy.simulateCall}
        </button>
        {simulateMsg ? (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
              simulateOk
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {simulateMsg}
            {simulateOk ? (
              <>
                {" "}
                <a href="/dashboard" className="underline">
                  대시보드에서 보기 →
                </a>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {!status.twilioConfigured ? (
        <div className="mt-4 rounded-xl border border-brand-200 bg-white px-4 py-4">
          <p className="text-sm font-semibold text-brand-950">Twilio Auth Token (한 번만)</p>
          <p className="mt-1 text-xs text-slate-600">
            콘솔 → Account → Auth Token → Show → 복사. SID(+12255291680)와 웹훅은 자동 설정됩니다.
          </p>
          <input
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Auth Token 붙여넣기"
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleTwilioComplete}
            disabled={completing || authToken.length < 10}
            className="mt-3 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {completing ? "연결 중…" : "전화 연동 완료하기"}
          </button>
          {configureMsg && !voiceWebhookUrl ? (
            <p className="mt-2 text-xs text-brand-800">{configureMsg}</p>
          ) : null}
        </div>
      ) : null}

      {ready ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          전화 연동 준비 완료. Twilio 번호로 전화해 보세요. (Trial은 인증한 번호만)
        </p>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4">
          <p className="text-sm font-semibold text-amber-950">{copy.stepsTitle}</p>
          <p className="mt-1 text-xs text-amber-900">{copy.hint}</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-amber-950">
            {copy.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-amber-800">{copy.restartHint}</p>
        </div>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <section className="hvac-card p-5">
      {content}
    </section>
  );
}
