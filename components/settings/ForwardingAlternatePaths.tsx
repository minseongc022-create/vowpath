"use client";

import { useSettingsPage } from "@/components/providers/LocaleProvider";
import { FORWARDING_PROVIDERS, type ForwardingProviderId } from "@/lib/forwarding-guides";
import { getAlternateForwardingPaths } from "@/lib/forwarding-paths";

type Props = {
  current: ForwardingProviderId;
  onSwitch: (provider: ForwardingProviderId) => void;
  limit?: number;
};

export function ForwardingAlternatePaths({ current, onSwitch, limit = 5 }: Props) {
  const settingsPage = useSettingsPage();
  const a = settingsPage.forwardingAlternatePaths;
  const alternates = getAlternateForwardingPaths(current).slice(0, limit);

  if (alternates.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-800">{a.title}</p>
      <p className="mt-1 text-xs text-slate-600">{a.hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {alternates.map((id) => {
          const label = FORWARDING_PROVIDERS.find((p) => p.id === id)?.label ?? id;
          const isDedicated = id === "effiroad_main";
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSwitch(id)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                isDedicated
                  ? "border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100"
                  : "border-slate-300 bg-white text-slate-800 hover:border-brand-400"
              }`}
            >
              {isDedicated ? a.dedicatedLabel : label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
