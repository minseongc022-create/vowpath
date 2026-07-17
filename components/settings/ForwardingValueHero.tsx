"use client";

import { settingsPage } from "@/lib/content";

type Props = {
  compact?: boolean;
};

export function ForwardingValueHero({ compact = false }: Props) {
  const c = settingsPage.forwardingValueHero;
  const bullets: readonly string[] = c.bullets;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white ${
        compact ? "p-4" : "p-5 sm:p-6"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{c.badge}</p>
      <p className={`mt-1 font-bold text-slate-900 ${compact ? "text-lg" : "text-xl"}`}>
        {c.title}
      </p>
      {!compact ? (
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">{c.subtitle}</p>
      ) : null}
      <ul className={`space-y-3 ${compact ? "mt-3" : "mt-4"}`}>
        {bullets.map((item) => (
          <li key={item} className="flex gap-3 text-base leading-relaxed text-slate-800">
            <span
              className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800"
              aria-hidden="true"
            >
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
