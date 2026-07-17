"use client";

import { useState } from "react";
import { settingsPage } from "@/lib/content";
import type { ForwardingProviderId } from "@/lib/forwarding-guides";
import {
  CELL_CARRIER_OPTIONS,
  FORWARDING_OVERFLOW_PATHS,
  VOIP_SYSTEM_OPTIONS,
  type ForwardingSetupPathId,
} from "@/lib/forwarding-paths";
import { ForwardingPathQuiz } from "@/components/settings/ForwardingPathQuiz";

type Props = {
  onSelect: (provider: ForwardingProviderId, pathId: ForwardingSetupPathId) => void;
};

const confidenceStyles = {
  highest: "border-emerald-400 bg-emerald-50/80 ring-emerald-200",
  high: "border-brand-300 bg-white",
  medium: "border-amber-300 bg-amber-50/50",
} as const;

export function ForwardingPathPicker({ onSelect }: Props) {
  const p = settingsPage.forwardingPathPicker;
  const [subPick, setSubPick] = useState<ForwardingSetupPathId | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  if (showQuiz) {
    return (
      <ForwardingPathQuiz
        onResolved={(provider) => {
          onSelect(provider, "quiz");
        }}
      />
    );
  }

  if (subPick === "cell_overflow") {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-lg font-bold text-slate-900">{p.pickCarrier}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CELL_CARRIER_OPTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id, "cell_overflow")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-left hover:border-brand-400"
            >
              <span className="text-base font-semibold text-slate-900">{c.label}</span>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">{c.hint}</p>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setSubPick(null)} className="text-sm text-brand-700 underline">
          {p.back}
        </button>
      </div>
    );
  }

  if (subPick === "business_voip") {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-lg font-bold text-slate-900">{p.pickVoip}</p>
        <div className="grid gap-2">
          {VOIP_SYSTEM_OPTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id, "business_voip")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-left hover:border-brand-400"
            >
              <span className="text-base font-semibold text-slate-900">{c.label}</span>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">{c.hint}</p>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setSubPick(null)} className="text-sm text-brand-700 underline">
          {p.back}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{p.badge}</p>
        <p className="mt-1 text-xl font-bold text-brand-950">{p.title}</p>
        <p className="mt-2 text-base leading-relaxed text-slate-600">{p.subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FORWARDING_OVERFLOW_PATHS.map((path) => {
          const copy = p.paths[path.id];
          const style = confidenceStyles[path.confidence];
          return (
            <button
              key={path.id}
              type="button"
              onClick={() => {
                if (path.provider) {
                  onSelect(path.provider, path.id);
                  return;
                }
                if (path.requiresCarrierPick) {
                  setSubPick("cell_overflow");
                  return;
                }
                if (path.requiresVoipPick) {
                  setSubPick("business_voip");
                  return;
                }
              }}
              className={`rounded-xl border-2 p-4 text-left ring-2 ring-transparent transition hover:ring-brand-200 ${style}`}
            >
              <span className="text-base font-bold text-slate-900">{copy.title}</span>
              <p className="mt-2 text-base leading-relaxed text-stone-700">{copy.description}</p>
              <p className="mt-2 text-sm font-semibold text-brand-800">
                {path.successLabel} · {path.timeLabel}
              </p>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onSelect("effiroad_main", "dedicated_line")}
          className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 p-4 text-left ring-2 ring-transparent transition hover:ring-emerald-200 sm:col-span-2"
        >
          <span className="text-base font-bold text-emerald-950">
            {p.paths.dedicated_line.title}
          </span>
          <p className="mt-2 text-base leading-relaxed text-emerald-900">
            {p.paths.dedicated_line.description}
          </p>
          <p className="mt-2 text-sm font-semibold text-emerald-800">{p.bestBadge}</p>
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowQuiz(true)}
        className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-700 hover:border-brand-400"
      >
        {p.quizFallback}
      </button>
    </div>
  );
}
