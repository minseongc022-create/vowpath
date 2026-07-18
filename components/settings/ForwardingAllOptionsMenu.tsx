"use client";

import { useSettingsPage } from "@/components/providers/LocaleProvider";
import type { ForwardingProviderId } from "@/lib/forwarding-guides";
import { FORWARDING_PROVIDERS } from "@/lib/forwarding-guides";
import {
  CELL_CARRIER_OPTIONS,
  VOIP_SYSTEM_OPTIONS,
} from "@/lib/forwarding-paths";

type Props = {
  selected?: ForwardingProviderId | null;
  onSelect: (provider: ForwardingProviderId) => void;
};

function OptionButton({
  id,
  label,
  hint,
  badge,
  selected,
  onSelect,
}: {
  id: ForwardingProviderId;
  label: string;
  hint: string;
  badge?: string;
  selected: boolean;
  onSelect: (id: ForwardingProviderId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`flex min-h-[52px] flex-col justify-center rounded-xl border-2 px-2.5 py-2 text-left transition active:scale-[0.99] sm:px-3 sm:py-2.5 ${
        selected
          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
          : "border-slate-200 bg-white hover:border-brand-400"
      }`}
    >
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-semibold leading-tight text-slate-900">{label}</span>
        {badge ? (
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-800">
            {badge}
          </span>
        ) : null}
      </span>
      {hint ? (
        <span className="mt-0.5 text-xs leading-snug text-stone-600">{hint}</span>
      ) : null}
    </button>
  );
}

export function ForwardingAllOptionsMenu({ selected, onSelect }: Props) {
  const settingsPage = useSettingsPage();
  const copy = settingsPage.forwardingAllOptions;
  const dedicated = FORWARDING_PROVIDERS.find((p) => p.id === "effiroad_main");
  const googleVoice = FORWARDING_PROVIDERS.find((p) => p.id === "google_voice");

  return (
    <div className="space-y-4 rounded-xl border-2 border-brand-200 bg-white p-3 sm:p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{copy.badge}</p>
        <p className="text-base font-bold text-brand-950 sm:text-lg">{copy.title}</p>
        <p className="mt-1 text-sm leading-snug text-slate-600">{copy.subtitle}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-800">{copy.carrierSection}</p>
        <div className="grid grid-cols-2 gap-2">
          {CELL_CARRIER_OPTIONS.map((c) => (
            <OptionButton
              key={c.id}
              id={c.id}
              label={c.label}
              hint={c.hint}
              badge={c.id === "verizon" ? copy.verifiedBadge : undefined}
              selected={selected === c.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-800">{copy.voipSection}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {VOIP_SYSTEM_OPTIONS.map((c) => (
            <OptionButton
              key={c.id}
              id={c.id}
              label={c.label}
              hint={c.hint}
              badge={c.id === "dialpad" ? copy.recommendedBadge : undefined}
              selected={selected === c.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-800">{copy.otherSection}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {googleVoice ? (
            <OptionButton
              id="google_voice"
              label={googleVoice.label}
              hint={copy.googleVoiceHint}
              selected={selected === "google_voice"}
              onSelect={onSelect}
            />
          ) : null}
          {dedicated ? (
            <OptionButton
              id="effiroad_main"
              label={dedicated.label}
              hint={copy.dedicatedHint}
              badge={copy.easiestBadge}
              selected={selected === "effiroad_main"}
              onSelect={onSelect}
            />
          ) : null}
        </div>
      </div>

      {selected ? (
        <p className="rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs leading-relaxed text-brand-900">
          {copy.selectedNote}
        </p>
      ) : null}
    </div>
  );
}
