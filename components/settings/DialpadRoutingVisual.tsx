"use client";

import { useEffect, useState } from "react";
import { settingsPage } from "@/lib/content";

const STEPS = [
  { title: "Main Line", detail: "Admin Settings → Main Line" },
  { title: "Edit routing", detail: "Business Hours & Call Routing → Edit" },
  { title: "Fallback", detail: "External number → paste Effiroad → Save" },
] as const;

export function DialpadRoutingVisual() {
  const [active, setActive] = useState(0);
  const v = settingsPage.forwardingDialpadVisual;

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((n) => (n + 1) % STEPS.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-white">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{v.caption}</p>
      <p className="mt-1 text-sm text-slate-300">{v.hint}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => {
          const on = i === active;
          return (
            <div
              key={step.title}
              className={`rounded-lg border p-3 transition-all duration-500 ${
                on
                  ? "border-brand-400 bg-brand-950/80 ring-2 ring-brand-400/60"
                  : "border-slate-700 bg-slate-800/60 opacity-60"
              }`}
            >
              <p className="text-xs font-bold text-brand-300">{v.stepLabel(i + 1)}</p>
              <p className="mt-1 font-semibold">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{step.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-700 px-3 py-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          dialpad.com/officesettings
        </div>
        <div className="space-y-2 p-4 text-sm">
          <div
            className={`rounded px-2 py-1 transition ${active === 0 ? "bg-brand-600/30 text-brand-100" : "text-slate-500"}`}
          >
            Main Line
          </div>
          <div
            className={`rounded px-2 py-1 transition ${active === 1 ? "bg-brand-600/30 text-brand-100" : "text-slate-500"}`}
          >
            Business Hours & Call Routing → Edit Call Routing
          </div>
          <div
            className={`rounded px-2 py-1 transition ${active === 2 ? "bg-brand-600/30 text-brand-100" : "text-slate-500"}`}
          >
            Fallback → To external number → +1 Effiroad…
          </div>
        </div>
      </div>
    </div>
  );
}
