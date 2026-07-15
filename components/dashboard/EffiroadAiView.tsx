"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { EffiroadAiMark } from "@/components/brand/EffiroadAiMark";
import type { EffiroadAiAction, EffiroadAiResponse } from "@/lib/effiroad-ai-query";
import type { AiAdminPreview } from "@/lib/ai-admin/types";

type Message =
  | { id: string; role: "user"; content: string }
  | ({ id: string; role: "assistant" } & EffiroadAiResponse);

const STARTERS = [
  "Auto approve No Cooling",
  "Gas smell is always urgent",
  "Weekend bookings need approval",
  "Turn off morning SMS report",
  "Add Plano to service areas",
  "How many calls today?",
  "Show automation rules",
  "Show pending approvals",
];

const FALLBACK_SUGGESTIONS = [
  "Pending approvals",
  "Urgent requests",
  "Today's schedule",
  "Recent calls",
  "This week's bookings",
];

const CAPABILITIES = [
  "Answer questions about calls, bookings & schedule",
  "Approve or decline pending requests in chat",
  "Create and manage automation rules by voice",
  "Change settings — hours, SMS alerts, service areas",
  "Compare this week vs. last week automatically",
  "Proactive briefing every time you open this page",
];

function ActionButton({
  action,
  onStatus,
}: {
  action: EffiroadAiAction;
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

function BillingCard({ card }: { card: NonNullable<EffiroadAiResponse["billingCard"]> }) {
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
}: {
  message: Extract<Message, { role: "assistant" }>;
  onAsk: (q: string) => void;
  onStatus: (bookingId: string, status: "approved" | "rejected") => void;
  onAdminConfirm: (preview: AiAdminPreview, password?: string) => Promise<void>;
  onAdminCancel: (preview: AiAdminPreview) => void;
}) {
  return (
    <div className="vow-dash-card max-w-3xl p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <EffiroadAiMark size={36} shadow="sm" />
        <span className="text-sm font-semibold text-brand-800">
          Effiroad AI
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
          Would you like me to show:
        </p>
        <div className="vow-ai-scrollbar mt-3 flex gap-2 overflow-x-auto pb-2">
          {(message.suggestions ?? FALLBACK_SUGGESTIONS).map((suggestion) => (
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

export function EffiroadAiView() {
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
        const res = await fetch("/api/effiroad-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proactive: true }),
        });
        const data = (await res.json()) as Partial<EffiroadAiResponse> & { error?: string };
        setMessages([
          {
            id: "briefing",
            role: "assistant",
            answer:
              data.answer ??
              "Good morning. I'm ready to help with your shop operations.",
            rows: data.rows,
            adminPreview: data.adminPreview,
            actions: data.actions ?? [],
            suggestions: data.suggestions ?? FALLBACK_SUGGESTIONS,
          },
        ]);
      } catch {
        setMessages([
          {
            id: "briefing",
            role: "assistant",
            answer: "Good morning. Ask about calls, customers, bookings, or shop settings.",
            actions: [
              { label: "Open Calendar", href: "/dashboard/calendar" },
              { label: "Call History", href: "/dashboard/missed-calls" },
            ],
            suggestions: FALLBACK_SUGGESTIONS,
          },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [booted]);

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
      const res = await fetch("/api/effiroad-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history: historyPayload }),
      });
      const data = (await res.json()) as Partial<EffiroadAiResponse> & {
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
            "I couldn't load that data right now. Try a pending approvals or customer name search.",
          rows: data.rows,
          bookings: data.bookings,
          customer: data.customer,
          adminPreview: data.adminPreview,
          billingCard: data.billingCard,
          actions: data.actions ?? [],
          suggestions: data.suggestions ?? FALLBACK_SUGGESTIONS,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          answer: "Something went wrong. Please try again in a moment.",
          actions: [],
          suggestions: FALLBACK_SUGGESTIONS,
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
      const res = await fetch("/api/effiroad-ai/admin/confirm", {
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
            { label: "Automation Rules", href: "/dashboard/settings" },
            { label: "Ask Effiroad AI", href: "/dashboard/ai" },
          ],
          suggestions: FALLBACK_SUGGESTIONS,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          answer: "Admin action failed.",
          actions: [{ label: "Open Settings", href: "/dashboard/settings" }],
          suggestions: FALLBACK_SUGGESTIONS,
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
        answer: `${preview.title} was cancelled. No settings were changed.`,
        actions: [],
        suggestions: FALLBACK_SUGGESTIONS,
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
        <EffiroadAiMark size={56} shadow="md" />
        <div className="min-w-0 flex-1">
          <p className="vow-settings-eyebrow">Effiroad AI</p>
          <h1 className="mt-1 text-2xl font-bold text-brand-950 sm:text-3xl">
            Hi — I'm your Effiroad AI sidekick
          </h1>
          <p className="mt-2 text-base leading-relaxed text-stone-600">
            I pull your live shop data before every answer and suggest concrete next steps. Any settings change requires your confirmation before it saves.
          </p>
          <ul className="mt-4 grid gap-1.5 text-sm text-stone-500 sm:grid-cols-2">
            {CAPABILITIES.map((cap) => (
              <li key={cap} className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-400" aria-hidden>✓</span>
                {cap}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-stone-400">
            Every settings change requires your explicit confirmation before it applies. Effiroad AI never modifies dispatch rules, billing, or account access without your approval.
          </p>
        </div>
      </header>

      <div className="vow-ai-scrollbar flex gap-2 overflow-x-auto pb-2">
        {STARTERS.map((starter) => (
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
              onAsk={(q) => void ask(q)}
              onStatus={(id, status) => void updateStatus(id, status)}
              onAdminConfirm={confirmAdmin}
              onAdminCancel={cancelAdmin}
            />
          ),
        )}
        {loading ? (
          <p className="text-base text-stone-500">Checking your shop data…</p>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="vow-ai-input-bar">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Effiroad AI anything…"
            className="vow-ai-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="vow-dash-btn-primary min-h-12 !px-5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}
