"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { openEffiroadAssistant } from "@/lib/assistant-events";

type HubItem = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  status: "done" | "todo" | "optional";
  statusLabel: string;
};

export function SettingsIntegrationsHub({
  phoneDone,
  jobberDone,
  jobberOptional,
  zapierUrl,
}: {
  phoneDone: boolean;
  jobberDone: boolean;
  jobberOptional: boolean;
  zapierUrl?: string;
}) {
  const items: HubItem[] = [
    {
      id: "phone",
      icon: "📞",
      title: "Phone forwarding",
      subtitle: "Connect your shop line so Effiroad answers when you can't.",
      href: "#go-live-phone",
      status: phoneDone ? "done" : "todo",
      statusLabel: phoneDone ? "Connected" : "Start here",
    },
    {
      id: "jobber",
      icon: "🔗",
      title: "Jobber",
      subtitle: "Sync bookings and revenue automatically.",
      href: "#go-live-jobber",
      status: jobberDone ? "done" : jobberOptional ? "optional" : "todo",
      statusLabel: jobberDone ? "Connected" : "Optional",
    },
    {
      id: "zapier",
      icon: "⚡",
      title: "Zapier / CRM",
      subtitle: "Send new requests to ServiceTitan, Housecall Pro, Slack, etc.",
      href: "#integrations-zapier",
      status: zapierUrl ? "done" : "optional",
      statusLabel: zapierUrl ? "Webhook set" : "Optional",
    },
    {
      id: "widget",
      icon: "💬",
      title: "Website chat",
      subtitle: "Embed the same AI intake on your homepage.",
      href: "#integrations-widget",
      status: "optional",
      statusLabel: "Optional",
    },
  ];

  return (
    <section
      id="integrations-hub"
      className="scroll-mt-6 rounded-2xl border border-brand-200/80 bg-white p-5 shadow-card sm:p-6"
    >
      <div className="mb-5 border-b border-brand-100 pb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Connect</p>
        <h2 className="mt-1 text-lg font-bold text-brand-950">Integrations at a glance</h2>
        <p className="mt-1 text-sm text-stone-500">
          One card per connection. Tap a card to jump to that setup section.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="group flex gap-3 rounded-xl border border-brand-100 bg-brand-50/30 p-4 transition hover:border-brand-300 hover:bg-brand-50/60"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-brand-950">{item.title}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    item.status === "done"
                      ? "bg-emerald-100 text-emerald-800"
                      : item.status === "todo"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {item.statusLabel}
                </span>
              </div>
              <p className="mt-1 text-sm leading-snug text-stone-600">{item.subtitle}</p>
            </div>
          </a>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-stone-500">
        Need help? Ask{" "}
        <button
          type="button"
          className="font-semibold text-brand-700 underline-offset-2 hover:underline"
          onClick={() => openEffiroadAssistant()}
        >
          Effiroad AI
        </button>{" "}
        or open the{" "}
        <Link href={ROUTES.ai} className="font-semibold text-brand-700 hover:underline">
          full AI workspace
        </Link>
        .
      </p>
    </section>
  );
}
