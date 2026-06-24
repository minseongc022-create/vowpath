"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useIsEnglishUi } from "@/components/providers/LocaleProvider";
import type { VowroadAiAction, VowroadAiResponse } from "@/lib/vowroad-ai-query";
import type { AiAdminPreview } from "@/lib/ai-admin/types";

type Message =
  | { id: string; role: "user"; content: string }
  | ({ id: string; role: "assistant" } & VowroadAiResponse);

const STARTERS_EN = [
  "Auto approve No Cooling",
  "Gas smell is always urgent",
  "Weekend bookings need approval",
  "Turn off morning SMS report",
  "Add Plano to service areas",
  "How many calls today?",
  "Show automation rules",
  "Show pending approvals",
];

const STARTERS_KO = [
  "No Cooling은 자동 승인해줘",
  "Gas Smell은 무조건 긴급 처리",
  "주말 예약은 승인 필요",
  "아침 SMS 리포트 꺼줘",
  "운영 규칙 목록 보여줘",
  "오늘 통화 몇 건이야?",
  "승인 대기 보여줘",
  "이번 주 예약 보여줘",
];

const FALLBACK_SUGGESTIONS_EN = [
  "Pending approvals",
  "Urgent requests",
  "Today's schedule",
  "Recent calls",
  "This week's bookings",
];

const FALLBACK_SUGGESTIONS_KO = [
  "승인 대기 보여줘",
  "긴급 요청 보여줘",
  "오늘 일정",
  "최근 통화",
  "이번 주 예약",
];

function ActionButton({
  action,
  onStatus,
}: {
  action: VowroadAiAction;
  onStatus: (bookingId: string, status: "approved" | "rejected") => void;
}) {
  if (action.kind === "approve" && action.bookingId) {
    return (
      <button
        type="button"
        onClick={() => onStatus(action.bookingId!, "approved")}
        className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-400"
      >
        {action.label}
      </button>
    );
  }
  if (action.kind === "decline" && action.bookingId) {
    return (
      <button
        type="button"
        onClick={() => onStatus(action.bookingId!, "rejected")}
        className="rounded-xl bg-rose-500 px-4 py-3 text-sm font-bold text-white hover:bg-rose-400"
      >
        {action.label}
      </button>
    );
  }
  if (!action.href) return null;
  return (
    <Link
      className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-center text-sm font-semibold text-brand-900 hover:bg-brand-50"
      href={action.href}
    >
      {action.label}
    </Link>
  );
}

function AdminPreviewCard({
  preview,
  onConfirm,
  onCancel,
}: {
  preview: AiAdminPreview;
  onConfirm: (preview: AiAdminPreview, password?: string) => Promise<void>;
  onCancel: (preview: AiAdminPreview) => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm(preview, password || undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vow-ai-preview-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">
        {preview.action.type === "create_workflow_rule"
          ? "Automation Rule"
          : "AI Admin Action"}
      </p>
      <h3 className="mt-2 text-lg font-bold text-brand-950">{preview.title}</h3>
      <p className="mt-2 text-base leading-relaxed text-stone-700">{preview.message}</p>

      {preview.rows?.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {preview.rows.map((row) => (
            <div key={`${row.label}-${row.value}`} className="vow-ai-row-card">
              <p className="text-xs font-medium text-stone-500">{row.label}</p>
              <p className="mt-1 text-sm font-semibold text-brand-950">{row.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {preview.requiresPassword ? (
        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-600">
            Password required
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="vow-ai-input mt-2"
            placeholder="Confirm your password"
          />
        </label>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={busy || (preview.requiresPassword && !password)}
          onClick={() => void confirm()}
          className="min-h-12 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving..." : preview.confirmLabel ?? "Confirm"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onCancel(preview)}
          className="vow-dash-btn-secondary min-h-12 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {preview.cancelLabel ?? "Cancel"}
        </button>
      </div>
    </div>
  );
}

function BillingCard({ card }: { card: NonNullable<VowroadAiResponse["billingCard"]> }) {
  const [portalLoading, setPortalLoading] = useState(false);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
        Billing & Subscription
      </p>
      <h3 className="mt-2 text-lg font-bold text-brand-950">{card.title}</h3>
      <p className="mt-2 text-base leading-relaxed text-stone-700">{card.description}</p>

      {card.rows?.length ? (
        <div className="mt-4 grid gap-2">
          {card.rows.map((row) => (
            <div key={`${row.label}-${row.value}`} className="vow-ai-row-card">
              <p className="text-xs font-medium text-stone-500">{row.label}</p>
              <p className="mt-1 text-sm font-semibold text-brand-950">{row.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {card.actions.map((action) =>
          action.kind === "portal" ? (
            <button
              key={`${action.kind}-${action.label}`}
              type="button"
              disabled={portalLoading}
              onClick={() => void openPortal()}
              className="vow-dash-btn-primary min-h-12 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {portalLoading ? "Opening..." : action.label}
            </button>
          ) : action.href ? (
            <Link
              key={`${action.kind}-${action.label}`}
              href={action.href}
              className="vow-dash-btn-secondary min-h-12"
            >
              {action.label}
            </Link>
          ) : null,
        )}
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  onAsk,
  onStatus,
  onAdminConfirm,
  onAdminCancel,
  isEnglish,
}: {
  message: Extract<Message, { role: "assistant" }>;
  onAsk: (q: string) => void;
  onStatus: (bookingId: string, status: "approved" | "rejected") => void;
  onAdminConfirm: (preview: AiAdminPreview, password?: string) => Promise<void>;
  onAdminCancel: (preview: AiAdminPreview) => void;
  isEnglish: boolean;
}) {
  const fallbackSuggestions = isEnglish ? FALLBACK_SUGGESTIONS_EN : FALLBACK_SUGGESTIONS_KO;
  return (
    <div className="vow-dash-card max-w-3xl p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="vow-ai-avatar !h-9 !w-9 !text-base" aria-hidden>
          🙂
        </span>
        <span className="text-sm font-semibold text-brand-800">
          {isEnglish ? "Vow" : "보우"}
        </span>
      </div>
      <p className="vow-ai-msg-text">{message.answer}</p>

      {message.rows?.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {message.rows.map((row) => (
            <div key={`${row.label}-${row.value}`} className="vow-ai-row-card">
              <p className="text-xs font-medium text-stone-500">{row.label}</p>
              <p className="mt-1 text-sm font-semibold text-brand-950">{row.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {message.customer ? (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
          <h3 className="font-semibold text-brand-950">{message.customer.name}</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {message.customer.fields.map((field) => (
              <div key={field.label}>
                <dt className="text-xs font-medium text-stone-500">{field.label}</dt>
                <dd className="mt-1 text-sm font-medium text-stone-700">{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {message.bookings?.length ? (
        <div className="mt-4 space-y-2">
          {message.bookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/dashboard/bookings/${encodeURIComponent(booking.id)}`}
              className="block rounded-xl border border-stone-200 bg-stone-50/80 p-3 transition hover:border-brand-300 hover:bg-brand-50/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-950">{booking.customerName}</p>
                  <p className="mt-1 text-sm text-stone-600">{booking.issueType}</p>
                </div>
                <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-medium text-brand-800">
                  {booking.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {message.items?.length ? (
        <div className="mt-4 space-y-2">
          {message.items.map((item) => {
            const body = (
              <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3 transition hover:border-brand-300 hover:bg-brand-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-950">{item.title}</p>
                    {item.subtitle ? (
                      <p className="mt-1 text-sm text-stone-600">{item.subtitle}</p>
                    ) : null}
                  </div>
                  {item.status ? (
                    <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-medium text-brand-800">
                      {item.status}
                    </span>
                  ) : null}
                </div>
              </div>
            );
            return item.href ? (
              <Link key={item.id} href={item.href}>
                {body}
              </Link>
            ) : (
              <div key={item.id}>{body}</div>
            );
          })}
        </div>
      ) : null}

      {message.adminPreview ? (
        <AdminPreviewCard
          preview={message.adminPreview}
          onConfirm={onAdminConfirm}
          onCancel={onAdminCancel}
        />
      ) : null}

      {message.billingCard ? <BillingCard card={message.billingCard} /> : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {message.actions.map((action, i) => (
          <ActionButton
            key={`${action.label}-${i}`}
            action={action}
            onStatus={onStatus}
          />
        ))}
      </div>

      <div className="mt-5 border-t border-stone-200/80 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {isEnglish ? "Would you like me to show:" : "이것도 확인해 드릴까요?"}
        </p>
        <div className="vow-ai-scrollbar mt-3 flex gap-2 overflow-x-auto pb-2">
          {(message.suggestions ?? fallbackSuggestions).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onAsk(suggestion)}
              className="vow-ai-suggestion"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function VowroadAiView() {
  const isEnglish = useIsEnglishUi();
  const starters = isEnglish ? STARTERS_EN : STARTERS_KO;
  const fallbackSuggestions = isEnglish ? FALLBACK_SUGGESTIONS_EN : FALLBACK_SUGGESTIONS_KO;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booted, setBooted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (booted) return;
    setBooted(true);
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/vowroad-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proactive: true }),
        });
        const data = (await res.json()) as Partial<VowroadAiResponse> & { error?: string };
        setMessages([
          {
            id: "briefing",
            role: "assistant",
            answer:
              data.answer ??
              (isEnglish
                ? "Good morning. I'm ready to help with your shop operations."
                : "좋은 아침입니다, 사장님. 샵 운영을 도와드릴 준비가 되었습니다."),
            rows: data.rows,
            adminPreview: data.adminPreview,
            actions: data.actions ?? [],
            suggestions: data.suggestions ?? fallbackSuggestions,
          },
        ]);
      } catch {
        setMessages([
          {
            id: "briefing",
            role: "assistant",
            answer: isEnglish
              ? "Good morning. Ask about calls, customers, bookings, or shop settings."
              : "좋은 아침입니다, 사장님. 통화, 고객, 예약, 설정에 대해 물어보세요.",
            actions: [
              { label: isEnglish ? "Open Calendar" : "캘린더", href: "/dashboard/calendar" },
              { label: isEnglish ? "Call History" : "통화 기록", href: "/dashboard/missed-calls" },
            ],
            suggestions: fallbackSuggestions,
          },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [booted, isEnglish, fallbackSuggestions]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    const historyPayload = messages.slice(-10).map((m) =>
      m.role === "user"
        ? { role: "user" as const, text: m.content }
        : { role: "assistant" as const, text: m.answer },
    );
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: q },
    ]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/vowroad-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history: historyPayload }),
      });
      const data = (await res.json()) as Partial<VowroadAiResponse> & {
        error?: string;
      };
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          answer:
            data.answer ??
            data.error ??
            (isEnglish
              ? "I couldn't load that data right now. Try a pending approvals or customer name search."
              : "지금은 데이터를 불러오지 못했습니다. 승인 대기나 고객 이름으로 다시 물어봐 주세요."),
          rows: data.rows,
          bookings: data.bookings,
          customer: data.customer,
          adminPreview: data.adminPreview,
          billingCard: data.billingCard,
          actions: data.actions ?? [],
          suggestions: data.suggestions ?? fallbackSuggestions,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          answer: isEnglish
            ? "Something went wrong. Please try again in a moment."
            : "일시적인 오류입니다. 잠시 후 다시 시도해 주세요.",
          actions: [],
          suggestions: fallbackSuggestions,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function updateStatus(bookingId: string, status: "approved" | "rejected") {
    await fetch("/api/bookings/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bookingId, status }),
    });
    await ask("Show pending approvals");
  }

  async function confirmAdmin(preview: AiAdminPreview, password?: string) {
    try {
      const res = await fetch("/api/vowroad-ai/admin/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: preview.action, password }),
      });
      const data = (await res.json()) as {
        message?: string;
        rows?: { label: string; value: string }[];
        error?: string;
      };
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          answer: data.message ?? data.error ?? "Admin action failed.",
          rows: data.rows,
          actions: [
            { label: isEnglish ? "Automation Rules" : "운영 규칙", href: "/dashboard/settings" },
            { label: isEnglish ? "Ask Vowroad AI" : "Vowroad AI", href: "/dashboard/ai" },
          ],
          suggestions: fallbackSuggestions,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          answer: isEnglish ? "Admin action failed." : "설정 변경에 실패했습니다.",
          actions: [{ label: isEnglish ? "Open Settings" : "설정 열기", href: "/dashboard/settings" }],
          suggestions: fallbackSuggestions,
        },
      ]);
    }
  }

  function cancelAdmin(preview: AiAdminPreview) {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        answer: isEnglish
          ? `${preview.title} was cancelled. No settings were changed.`
          : `${preview.title} 변경을 취소했습니다. 설정은 변경되지 않았습니다.`,
        actions: [],
        suggestions: fallbackSuggestions,
      },
    ]);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-5xl flex-col gap-5">
      <header className="vow-dash-card flex gap-4 p-5 sm:p-6">
        <span className="vow-ai-avatar" aria-hidden>
          🙂
        </span>
        <div className="min-w-0 flex-1">
          <p className="vow-settings-eyebrow">Vowroad AI</p>
          <h1 className="mt-1 text-2xl font-bold text-brand-950 sm:text-3xl">
            {isEnglish ? "Hi — I'm Vow, your shop sidekick" : "안녕하세요, 샵 도우미 보우예요"}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-stone-600">
            {isEnglish
              ? "I search your shop data first, then answer with next steps. Settings changes always need your confirmation."
              : "회사 데이터를 먼저 찾아 답변하고, 다음 행동을 제안합니다. 설정 변경은 항상 확인 후 저장됩니다."}
          </p>
        </div>
      </header>

      <div className="vow-ai-scrollbar flex gap-2 overflow-x-auto pb-2">
        {starters.map((starter) => (
          <button
            key={starter}
            type="button"
            onClick={() => void ask(starter)}
            className="vow-ai-starter"
          >
            {starter}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-4 pb-32 lg:pb-28">
        {messages.map((message) =>
          message.role === "user" ? (
            <div
              key={message.id}
              className="ml-auto max-w-2xl rounded-2xl bg-brand-700 px-4 py-3 text-base font-medium text-white shadow-sm"
            >
              {message.content}
            </div>
          ) : (
            <AssistantMessage
              key={message.id}
              message={message}
              isEnglish={isEnglish}
              onAsk={(q) => void ask(q)}
              onStatus={(id, status) => void updateStatus(id, status)}
              onAdminConfirm={confirmAdmin}
              onAdminCancel={cancelAdmin}
            />
          ),
        )}
        {loading ? (
          <p className="text-base text-stone-500">
            {isEnglish ? "Checking your shop data…" : "샵 데이터 확인 중…"}
          </p>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="vow-ai-input-bar">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isEnglish ? "Ask Vow anything…" : "보우에게 무엇이든 물어보세요…"}
            className="vow-ai-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="vow-dash-btn-primary min-h-12 !px-5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEnglish ? "Ask" : "질문"}
          </button>
        </div>
      </form>
    </div>
  );
}
