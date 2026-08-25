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

type ChatMessage = { role: "user" | "assistant"; content: string };

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
    try {
      const res = await fetch("/api/toss-shop/jarvis/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages.slice(-8) }),
      });
      const json = (await res.json()) as { reply?: string; did?: string };
      setMessages([...next, { role: "assistant", content: json.reply ?? "응답이 비었습니다." }]);
      // 실제로 뭔가 실행된 경우 화면 숫자도 같이 갱신한다
      if (json.did && json.did !== "talk") void fetchData();
    } catch {
      setMessages([...next, { role: "assistant", content: "연결이 끊겼습니다." }]);
    } finally {
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
                ? "자비스가 24시간 돌고 있습니다"
                : "자비스가 멈춰 있습니다"}
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
          지시는 아래 대화창에 말로 하시면 됩니다 — 「지금 돌려」, 「발주 정보 줘」, 「발주했어」,
          송장은 「1234567890 CJ대한통운」.
        </p>
      </section>

      {/* ── 2. 숫자 셋 ────────────────────────────────────────── */}
      {status && (
        <section className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200">
            <p className="text-xs text-slate-500">등록</p>
            <p className="mt-0.5 text-xl font-bold text-slate-900">{status.publishedCount}</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200">
            <p className="text-xs text-slate-500">주문</p>
            <p className="mt-0.5 text-xl font-bold text-slate-900">{status.activeOrders}</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200">
            <p className="text-xs text-slate-500">이번 달</p>
            <p className="mt-0.5 text-xl font-bold text-violet-700">
              {formatMoney(status.monthlyNetKrw)}
            </p>
            <p className="text-[10px] text-slate-400">목표 {goalPct}%</p>
          </div>
        </section>
      )}

      {/* ── 3. 사장님이 할 일 (있을 때만) ──────────────────────── */}
      {backlog && backlog.count > 0 && (
        <section className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-bold text-amber-900">반품지 {backlog.count}곳 등록하면 끝</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-800">
            토스가 반품지 등록만 API를 안 열어놨습니다. 아래 대화창에 「반품지 주소 줘」라고
            하시면 주소를 그대로 드릴게요. 셀러센터에 넣으신 뒤 「반품지 등록했어」라고만
            해주시면 나머지는 제가 다 합니다.
          </p>
        </section>
      )}

      {jobs.some((j) => j.status !== "tracking_registered" && !j.pendingTrackingNumber) && (
        <section className="mt-4 rounded-2xl border border-sky-300 bg-sky-50 p-4">
          <p className="font-bold text-sky-900">손이 필요한 주문이 있습니다</p>
          <div className="mt-2 space-y-1 text-sm text-sky-900">
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
            아직 발주 전이면 「발주 정보 줘」, 발주를 넣으셨으면 「발주했어」, 송장이 나왔으면
            「1234567890 CJ대한통운」처럼 아래 대화창에 말씀해 주세요. 토스 등록까지 제가 합니다.
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
                {["상태 어때?", "지금 돌려", "발주 정보 줘", "반품지 주소 줘"].map((q) => (
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
            </div>
          ))}
          {sending && (
            <div className="mr-auto rounded-2xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500">
              …
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
        <Link href={SP_ROUTES.settings} className="text-xs text-slate-400 underline">
          연동 설정
        </Link>
      </div>
    </div>
  );
}
