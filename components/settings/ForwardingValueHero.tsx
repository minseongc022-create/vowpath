"use client";

import { useSettingsPage } from "@/components/providers/LocaleProvider";

type Props = {
  /** Hide long subtitle on small screens — bullets stay readable */
  dense?: boolean;
};

export function ForwardingValueHero({ dense = false }: Props) {
  const settingsPage = useSettingsPage();
  const c = settingsPage.forwardingValueHero;
  const bullets: readonly string[] = c.bullets;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{c.badge}</p>
      <p className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{c.title}</p>
      {!dense ? (
        <p className="mt-1 hidden text-base leading-relaxed text-slate-600 sm:block">{c.subtitle}</p>
      ) : null}
      <ul className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
        {bullets.map((item) => (
          <li
            key={item}
            className="flex gap-2.5 rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-base leading-snug text-slate-800 sm:flex-col sm:gap-2 sm:p-3.5"
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 sm:h-8 sm:w-8"
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
