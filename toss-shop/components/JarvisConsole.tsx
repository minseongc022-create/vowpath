"use client";

/**
 * 자비스 콘솔 — 이 화면 하나가 전부다
 *
 * ★ 왜 갈아엎었나
 *
 * 종전 대시보드는 카드 12개, 메뉴 8개였다. 대부분은 "자비스가 알아서 하는 일"의
 * 중간 계산 결과였는데(정책 브리핑, 페널티 등급표, 상위셀러 정렬도 등), 사장님이
 * 그걸 보고 할 수 있는 게 없었다. 볼 필요 없는 걸 보여주면 정작 봐야 할
 * "지금 뭐가 막혔나"가 묻힌다.
 *
 * 그리고 실행 버튼을 눌러도 아무 반응이 없었다 — 돌고 있는지 멈췄는지
 * 화면만 봐서는 알 수 없었다. 자동화 도구에서 이건 치명적이다.
 *
 * ★ 이 화면이 답하는 질문은 셋뿐이다
 *
 *  1. 자비스가 지금 돌고 있나?        → 맨 위 상태등 + 큰 버튼
 *  2. 내가 지금 뭘 해야 하나?          → 할 일 카드 (없으면 아예 안 뜬다)
 *  3. 얼마나 벌고 있나?                → 숫자 세 개
 *
 * 나머지는 전부 자비스와의 대화로 물어보면 된다.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import type { JarvisAutopilotReport, JarvisFulfillmentJob } from "@/toss-shop/lib/types";

type ChatMessage = { role: "user" | "assistant"; content: string; steps?: string[] };

type Status = {
  running: boolean;
  publishedCount: number;
  pendingReviewCount: number;
  activeOrders: number;
  awaitingTracking: number;
  pendingReturnAddresses: number;
  monthlyNetKrw: number;
  goalKrw: number;
  todos: string[];
};

function formatMoney(krw: number): string {
  if (krw >= 10_000_000) return `${(krw / 10_000_000).toFixed(1)}천만`;
  if (krw >= 10_000) return `${Math.round(krw / 10_000).toLocaleString()}만`;
  return krw.toLocaleString();
}

export function JarvisConsole() {
  const [status, setStatus] = useState<Status | null>(null);
  const [report, setReport] = useState<JarvisAutopilotReport | null>(null);
  const [jobs, setJobs] = useState<JarvisFulfillmentJob[]>([]);
  const [apiConfigured, setApiConfigured] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // 자비스가 지금 뭘 하는 중인지 — 서버가 기록한 걸 그대로 보여준다.
  // 눌렀는데 아무 반응이 없으면 사장님은 안 되는 줄 알고 다시 누르게 되고,
  // 그러면 같은 일이 두 번 돈다.
  const [activity, setActivity] = useState<{ label: string; detail?: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    const [s, a, f, me] = await Promise.all([
      fetch("/api/toss-shop/jarvis/status").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/toss-shop/jarvis/autopilot").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/toss-shop/fulfillment").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/toss-shop/auth/me").then((r) => (r.ok ? r.json() : null)),
    ]);
    setStatus((s as { status?: Status })?.status ?? null);
    setReport((a as { report?: JarvisAutopilotReport })?.report ?? null);
    setJobs((f as { jobs?: JarvisFulfillmentJob[] })?.jobs ?? []);
    setApiConfigured(Boolean((me as { api?: { configured?: boolean } })?.api?.configured));
  }, []);

  const { initialLoading } = useSilentFetch(fetchData);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: msg }];
    setMessages(next);
    setSending(true);
    setActivity({ label: "듣고 있습니다" });

    // 오래 걸리는 일(도매꾹 발굴 등)은 서버가 진행 상황을 기록한다.
    // 그걸 계속 읽어서 "무선 이어폰 (12/24)"처럼 실제로 어디까지 갔는지 띄운다.
    const poll = setInterval(() => {
      void fetch("/api/toss-shop/jarvis/activity")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          const a = (j as { activity?: { label: string; detail?: string } } | null)?.activity;
          if (a) setActivity(a);
        })
        .catch(() => {});
    }, 1500);

    try {
      const res = await fetch("/api/toss-shop/jarvis/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages.slice(-8) }),
      });
      const json = (await res.json()) as { reply?: string; steps?: string[]; did?: string };
      setMessages([
        ...next,
        { role: "assistant", content: json.reply ?? "응답이 비었습니다.", steps: json.steps },
      ]);
      // 실제로 뭔가 실행됐으면 화면 숫자도 같이 갱신한다
      if (json.did && json.did !== "talk") void fetchData();
    } catch {
      setMessages([...next, { role: "assistant", content: "연결이 끊겼습니다." }]);
    } finally {
      clearInterval(poll);
      setActivity(null);
      setSending(false);
    }
  }

  const backlog = report?.returnAddressBacklog;
  const goalPct =
    status && status.goalKrw > 0
      ? Math.min(100, Math.round((status.monthlyNetKrw / status.goalKrw) * 100))
      : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* ── 1. 자비스가 돌고 있나 ─────────────────────────────── */}
      <section className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              status?.running ? "animate-pulse bg-emerald-300" : "bg-white/40"
            }`}
          />
          <p className="text-sm font-medium text-white/90">
            {initialLoading
              ? "확인 중…"
              : status?.running
                ? "자비스가 돌고 있습니다"
                : "자비스가 쉬고 있습니다 — 말 걸어주세요"}
          </p>
        </div>

        {!apiConfigured && !initialLoading && (
          <Link
            href={SP_ROUTES.settings}
            className="mt-3 block rounded-xl bg-amber-400 px-4 py-3 text-center text-sm font-bold text-amber-950"
          >
            먼저 토스 연동하기 →
          </Link>
        )}

        {report?.actions?.length ? (
          <ul className="mt-4 space-y-1 rounded-xl bg-black/20 p-3 text-xs leading-relaxed text-white/90">
            {report.actions.slice(0, 4).map((l, i) => (
              <li key={i}>· {l}</li>
            ))}
          </ul>
        ) : null}

        <p className="mt-4 text-xs leading-relaxed text-white/70">
          10분마다 시장을 훑고, 안 팔리는 상품은 값을 내리고, 손이 필요하면 문자로 알립니다.
        </p>
      </section>

      {/* ── 2. 숫자 ────────────────────────────────────────────── */}
      {status && (
        <section className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-slate-500">등록</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
                {status.publishedCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">주문</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
                {status.activeOrders}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">이번 달</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-violet-700">
                {formatMoney(status.monthlyNetKrw)}
              </p>
            </div>
          </div>

          {/* 목표까지 얼마나 왔는지 — 숫자만 있으면 감이 안 온다 */}
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-violet-600 transition-all"
                style={{ width: `${goalPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-center text-[11px] text-slate-400">
              월 목표 {formatMoney(status.goalKrw)}원의 {goalPct}%
            </p>
          </div>
        </section>
      )}

      {/* ── 3. 사장님이 할 일 (있을 때만) ──────────────────────── */}
      {backlog && backlog.count > 0 && (
        <section className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">반품지 {backlog.count}곳 등록 대기</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            제가 토스에 직접 등록합니다. 10분마다 도는 사이클에서 자동으로 처리되고, 급하시면
            아래에 「반품지 등록해줘」라고 하시면 지금 바로 넣겠습니다.
          </p>
        </section>
      )}

      {jobs.some((j) => j.status !== "tracking_registered" && !j.pendingTrackingNumber) && (
        <section className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-bold text-sky-900">손이 필요한 주문</p>
          <div className="mt-1.5 space-y-0.5 text-xs text-sky-900">
            {jobs
              .filter((j) => j.status !== "tracking_registered" && !j.pendingTrackingNumber)
              .slice(0, 3)
              .map((j) => (
                <p key={j.id} className="truncate">
                  · {j.productName}
                </p>
              ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-sky-800">
            발주 전이면 「발주 정보 줘」, 발주하셨으면 「발주했어」, 송장이 나왔으면
            「1234567890 CJ대한통운」이라고 아래에 말씀해 주세요.
          </p>
        </section>
      )}

      {/* ── 4. 자비스와 대화 ───────────────────────────────────── */}
      <section className="mt-4 rounded-2xl bg-white ring-1 ring-slate-200">
        <div className="max-h-[22rem] space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="text-sm leading-relaxed text-slate-500">
              <p className="font-semibold text-slate-700">자비스에게 말 걸어보세요</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["지금 돌려", "더 찾아봐", "안 팔리는 거 손봐", "상태 어때?"].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void send(q)}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto max-w-[85%] bg-violet-600 text-white"
                  : "mr-auto max-w-[92%] bg-slate-100 text-slate-800"
              }`}
            >
              {m.content}
              {m.role === "assistant" && m.steps && m.steps.length > 0 && (
                <ul className="mt-2 space-y-0.5 border-t border-slate-200 pt-2 text-xs text-slate-500">
                  {m.steps.map((st, si) => (
                    <li key={si}>✓ {st}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {sending && (
            <div className="mr-auto max-w-[92%] rounded-2xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-500" />
                <span className="font-medium">{activity?.label ?? "생각하는 중"}…</span>
              </span>
              {activity?.detail && (
                <p className="mt-1 text-xs text-slate-500">{activity.detail}</p>
              )}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex gap-2 border-t border-slate-100 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="송장번호를 붙여넣거나 뭐든 물어보세요"
            className="min-w-0 flex-1 rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            보내기
          </button>
        </form>
      </section>

      <div className="mt-4 text-center">
        <Link href={SP_ROUTES.settings} className="text-[11px] text-slate-400 underline">
          연동 설정
        </Link>
      </div>
    </div>
  );
}
