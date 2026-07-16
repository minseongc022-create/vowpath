"use client";

import { useState } from "react";
import { settingsPage } from "@/lib/content";
import type { ForwardingProviderId } from "@/lib/forwarding-guides";
import {
  CELL_CARRIER_OPTIONS,
  FORWARDING_SETUP_PATHS,
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
      <div className="space-y-4">
        <p className="text-sm font-semibold text-slate-800">{p.pickCarrier}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CELL_CARRIER_OPTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id, "cell_overflow")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left hover:border-brand-400"
            >
              <span className="font-semibold text-slate-900">{c.label}</span>
              <p className="mt-1 text-sm text-stone-600">{c.hint}</p>
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
      <div className="space-y-4">
        <p className="text-sm font-semibold text-slate-800">{p.pickVoip}</p>
        <div className="grid gap-2">
          {VOIP_SYSTEM_OPTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id, "business_voip")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left hover:border-brand-400"
            >
              <span className="font-semibold text-slate-900">{c.label}</span>
              <p className="mt-1 text-sm text-stone-600">{c.hint}</p>
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
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{p.badge}</p>
        <p className="mt-1 text-lg font-bold text-brand-950">{p.title}</p>
        <p className="mt-1 text-sm text-slate-600">{p.subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FORWARDING_SETUP_PATHS.map((path) => {
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900">{copy.title}</span>
                {path.confidence === "highest" ? (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                    {p.bestBadge}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{copy.description}</p>
              <p className="mt-2 text-xs font-semibold text-brand-800">
                {path.successLabel} · {path.timeLabel}
              </p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowQuiz(true)}
        className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-brand-400"
      >
        {p.quizFallback}
      </button>
    </div>
  );
}
