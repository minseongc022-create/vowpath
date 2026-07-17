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
      className="scroll-mt-6 rounded-xl border border-brand-200/80 bg-white p-3 shadow-card sm:rounded-2xl sm:p-6"
    >
      <div className="mb-3 border-b border-brand-100 pb-2 sm:mb-5 sm:pb-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-brand-600 sm:text-xs">Connect</p>
        <h2 className="text-sm font-bold text-brand-950 sm:text-lg">Integrations at a glance</h2>
        <p className="mt-0.5 hidden text-sm text-stone-500 sm:block">
          One card per connection. Tap a card to jump to that setup section.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="group flex flex-col gap-1 rounded-lg border border-brand-100 bg-brand-50/30 p-2 transition hover:border-brand-300 hover:bg-brand-50/60 sm:flex-row sm:gap-3 sm:rounded-xl sm:p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm sm:h-11 sm:w-11 sm:rounded-xl sm:text-xl">
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <p className="text-xs font-semibold leading-tight text-brand-950 sm:text-base">{item.title}</p>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:px-2 sm:text-[10px] ${
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
              <p className="mt-0.5 hidden text-sm leading-snug text-stone-600 sm:block">{item.subtitle}</p>
            </div>
          </a>
        ))}
      </div>

      <p className="mt-2 hidden text-center text-xs text-stone-500 sm:mt-4 sm:block">
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
