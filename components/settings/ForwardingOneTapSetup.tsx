"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { settingsPage } from "@/lib/content";
import { getOrderedSetupActions } from "@/lib/forwarding-setup-flow";
import type { ForwardingProviderId } from "@/lib/forwarding-guides";

type Props = {
  provider: ForwardingProviderId;
  phoneNumber: string;
};

function storageKey(provider: string) {
  return `effiroad-fwd-done:${provider}`;
}

export function ForwardingOneTapSetup({ provider, phoneNumber }: Props) {
  const actions = useMemo(
    () => getOrderedSetupActions(provider, phoneNumber),
    [provider, phoneNumber],
  );

  const [done, setDone] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(provider));
      if (raw) setDone(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      setDone({});
    }
  }, [provider]);

  const persist = useCallback(
    (next: Record<string, boolean>) => {
      setDone(next);
      try {
        localStorage.setItem(storageKey(provider), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [provider],
  );

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  }

  if (actions.length === 0) {
    return null;
  }

  const allDone = actions.every((a) => done[a.id]);

  return (
    <div className="space-y-3 rounded-xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 to-white p-4">
      <div>
        <p className="text-lg font-bold text-brand-950">{settingsPage.forwardingOneTapTitle}</p>
        <p className="mt-0.5 text-base leading-snug text-slate-600">{settingsPage.forwardingOneTapHint}</p>
      </div>

      <ol className="space-y-3">
        {actions.map((action) => {
          const checked = Boolean(done[action.id]);
          return (
            <li
              key={action.id}
              className={`rounded-xl border p-3 transition sm:p-4 ${
                checked ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    checked ? "bg-emerald-600 text-white" : "bg-brand-600 text-white"
                  }`}
                >
                  {checked ? "✓" : action.order}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{action.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{action.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {action.tapHref ? (
                      <a
                        href={action.tapHref}
                        className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
                      >
                        {action.tapLabel ?? settingsPage.forwardingTapToActivate}
                      </a>
                    ) : null}
                    {action.externalHref ? (
                      <a
                        href={action.externalHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
                      >
                        {action.externalLabel ?? "Open settings"}
                      </a>
                    ) : null}
                    {action.copyText ? (
                      <button
                        type="button"
                        onClick={() => void copyText(action.id, action.copyText!)}
                        className="rounded-lg border border-brand-300 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50"
                      >
                        {copiedId === action.id
                          ? settingsPage.forwardingCopied
                          : settingsPage.forwardingCopyNumber}
                      </button>
                    ) : null}
                    {action.deactivateHref ? (
                      <a
                        href={action.deactivateHref}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {action.deactivateLabel ?? settingsPage.forwardingTurnOff}
                      </a>
                    ) : null}
                  </div>
                  <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        persist({ ...done, [action.id]: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                    />
                    {settingsPage.forwardingStepDone}
                  </label>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {allDone ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
          {settingsPage.forwardingOneTapComplete}
        </p>
      ) : (
        <p className="text-xs text-slate-500">{settingsPage.forwardingOneTapProgress}</p>
      )}
    </div>
  );
}
