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
  /** When set, show compact summary instead of full list */
  selectedProvider?: ForwardingProviderId | null;
  onChangePath?: () => void;
};

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
      <div className="space-y-3 rounded-xl border-2 border-brand-200 bg-white p-4">
        <p className="text-lg font-bold text-slate-900">{p.pickCarrier}</p>
        <div className="flex flex-col gap-2">
          {CELL_CARRIER_OPTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id, "cell_overflow")}
              className="flex min-h-[52px] w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-brand-400"
            >
              <span className="text-base font-semibold text-slate-900">{c.label}</span>
              <span className="text-brand-600" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setSubPick(null)} className="text-base font-semibold text-brand-700 underline">
          {p.back}
        </button>
      </div>
    );
  }

  if (subPick === "business_voip") {
    return (
      <div className="space-y-3 rounded-xl border-2 border-brand-200 bg-white p-4">
        <p className="text-lg font-bold text-slate-900">{p.pickVoip}</p>
        <div className="flex flex-col gap-2">
          {VOIP_SYSTEM_OPTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id, "business_voip")}
              className="flex min-h-[52px] w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-brand-400"
            >
              <span className="text-base font-semibold text-slate-900">{c.label}</span>
              <span className="text-brand-600" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setSubPick(null)} className="text-base font-semibold text-brand-700 underline">
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
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/80 px-4 py-3">
        <p className="text-base font-semibold text-brand-950">{p.selectedLabel.replace("{type}", label)}</p>
        <button
          type="button"
          onClick={onChangePath}
          className="text-base font-semibold text-brand-700 underline"
        >
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
        description: copy.shortDescription ?? copy.description,
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
      description:
        (p.paths.dedicated_line as { shortDescription?: string }).shortDescription ??
        p.paths.dedicated_line.description,
      onClick: () => onSelect("effiroad_main", "dedicated_line"),
      highlight: true,
    },
  ];

  return (
    <div className="space-y-3 rounded-xl border-2 border-brand-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{p.badge}</p>
        <p className="mt-1 text-lg font-bold text-brand-950">{p.title}</p>
        <p className="mt-1 text-base leading-snug text-slate-600">{p.subtitle}</p>
      </div>

      <div className="flex flex-col gap-2">
        {pathButtons.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition active:scale-[0.99] ${
              item.highlight
                ? "border-emerald-300 bg-emerald-50/70 hover:border-emerald-400"
                : "border-slate-200 bg-white hover:border-brand-400"
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-slate-900">{item.title}</span>
              <span className="mt-0.5 block text-sm leading-snug text-stone-600">{item.description}</span>
            </span>
            <span className="shrink-0 text-xl font-bold text-brand-600" aria-hidden="true">
              →
            </span>
          </button>
        ))}
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
