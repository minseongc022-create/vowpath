"use client";

import { useMemo } from "react";
import { useSettingsPage } from "@/components/providers/LocaleProvider";
import { getCarrierQuickActions } from "@/lib/forwarding-carrier-codes";
import type { ForwardingProviderId } from "@/lib/forwarding-guides";

type Props = {
  provider: ForwardingProviderId;
  phoneNumber: string;
};

export function ForwardingQuickActions({ provider, phoneNumber }: Props) {
  const settingsPage = useSettingsPage();
  const actions = useMemo(
    () => getCarrierQuickActions(provider, phoneNumber),
    [provider, phoneNumber],
  );

  if (provider === "dialpad" || provider === "verizon" || provider === "google_voice" || actions.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Use the portal or app steps in the guide — no dial code on this provider.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <a
          key={action.id}
          href={`tel:${encodeURIComponent(action.dial)}`}
          className="block rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white"
        >
          {action.label}
        </a>
      ))}
      <p className="text-xs text-slate-500">{settingsPage.forwardingOneTapHint}</p>
    </div>
  );
}
