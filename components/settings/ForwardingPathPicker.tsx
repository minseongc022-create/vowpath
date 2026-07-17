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
  selectedProvider?: ForwardingProviderId | null;
  onChangePath?: () => void;
};

function OptionGrid({
  options,
  onPick,
}: {
  options: { id: string; label: string; hint?: string }[];
  onPick: (id: ForwardingProviderId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c.id as ForwardingProviderId)}
          className="flex min-h-[52px] flex-col justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left hover:border-brand-400 active:scale-[0.99] sm:px-3 sm:py-2.5"
        >
          <span className="text-sm font-semibold leading-tight text-slate-900">{c.label}</span>
          {c.hint ? (
            <span className="mt-0.5 text-xs leading-snug text-stone-600">{c.hint}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function ForwardingPathPicker({
  onSelect,
  selectedProvider = null,
  onChangePath,
}: Props) {
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
      <div className="space-y-2.5 rounded-xl border-2 border-brand-200 bg-white p-3 sm:p-4">
        <p className="text-base font-bold text-slate-900 sm:text-lg">{p.pickCarrier}</p>
        <OptionGrid options={CELL_CARRIER_OPTIONS} onPick={(id) => onSelect(id, "cell_overflow")} />
        <button type="button" onClick={() => setSubPick(null)} className="text-sm font-semibold text-brand-700 underline">
          {p.back}
        </button>
      </div>
    );
  }

  if (subPick === "business_voip") {
    return (
      <div className="space-y-2.5 rounded-xl border-2 border-brand-200 bg-white p-3 sm:p-4">
        <p className="text-base font-bold text-slate-900 sm:text-lg">{p.pickVoip}</p>
        <OptionGrid options={VOIP_SYSTEM_OPTIONS} onPick={(id) => onSelect(id, "business_voip")} />
        <button type="button" onClick={() => setSubPick(null)} className="text-sm font-semibold text-brand-700 underline">
          {p.back}
        </button>
      </div>
    );
  }

  if (selectedProvider && onChangePath) {
    const label =
      CELL_CARRIER_OPTIONS.find((c) => c.id === selectedProvider)?.label ??
      VOIP_SYSTEM_OPTIONS.find((c) => c.id === selectedProvider)?.label ??
      p.paths[
        selectedProvider === "effiroad_main"
          ? "dedicated_line"
          : selectedProvider === "google_voice"
            ? "google_voice"
            : "cell_overflow"
      ]?.title ??
      selectedProvider;

    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/80 px-3 py-2.5 sm:px-4 sm:py-3">
        <p className="text-sm font-semibold text-brand-950 sm:text-base">
          {p.selectedLabel.replace("{type}", label)}
        </p>
        <button type="button" onClick={onChangePath} className="text-sm font-semibold text-brand-700 underline">
          {p.changeType}
        </button>
      </div>
    );
  }

  const pathButtons: {
    key: string;
    title: string;
    description: string;
    onClick: () => void;
    highlight?: boolean;
  }[] = [
    ...FORWARDING_OVERFLOW_PATHS.map((path) => {
      const copy = p.paths[path.id] as { title: string; description: string; shortDescription?: string };
      return {
        key: path.id,
        title: copy.title,
        description: copy.description,
        onClick: () => {
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
          }
        },
      };
    }),
    {
      key: "dedicated_line",
      title: p.paths.dedicated_line.title,
      description: p.paths.dedicated_line.description,
      onClick: () => onSelect("effiroad_main", "dedicated_line"),
      highlight: true,
    },
  ];

  return (
    <div className="space-y-2.5 rounded-xl border-2 border-brand-200 bg-white p-3 sm:p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{p.badge}</p>
        <p className="text-base font-bold text-brand-950 sm:text-lg">{p.title}</p>
        <p className="mt-1 text-sm leading-snug text-slate-600">{p.subtitle}</p>
      </div>

      <div className="flex flex-col gap-2">
        {pathButtons.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className={`flex w-full items-start gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition active:scale-[0.99] sm:gap-3 sm:px-4 sm:py-3 ${
              item.highlight
                ? "border-emerald-300 bg-emerald-50/70 hover:border-emerald-400"
                : "border-slate-200 bg-white hover:border-brand-400"
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900 sm:text-base">{item.title}</span>
              <span className="mt-0.5 block text-xs leading-snug text-stone-600 sm:text-sm">{item.description}</span>
            </span>
            <span className="shrink-0 pt-0.5 text-lg font-bold text-brand-600 sm:text-xl" aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowQuiz(true)}
        className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-brand-400"
      >
        {p.quizFallback}
      </button>
    </div>
  );
}
