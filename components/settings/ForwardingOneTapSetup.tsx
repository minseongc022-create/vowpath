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

  const actionBtn =
    "rounded-lg px-2.5 py-1.5 text-xs font-semibold sm:px-3 sm:py-2 sm:text-sm";

  return (
    <div className="space-y-2 rounded-lg border-2 border-brand-300 bg-gradient-to-br from-brand-50 to-white p-2.5 sm:space-y-3 sm:rounded-xl sm:p-4">
      <div>
        <p className="text-sm font-bold text-brand-950 sm:text-lg">{settingsPage.forwardingOneTapTitle}</p>
        <p className="mt-0.5 hidden text-sm leading-snug text-slate-600 sm:block">
          {settingsPage.forwardingOneTapHint}
        </p>
      </div>

      <ol className="space-y-1.5 sm:space-y-3">
        {actions.map((action) => {
          const checked = Boolean(done[action.id]);
          return (
            <li
              key={action.id}
              className={`rounded-lg border p-2 transition sm:rounded-xl sm:p-3 ${
                checked ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold sm:h-8 sm:w-8 sm:text-sm ${
                    checked ? "bg-emerald-600 text-white" : "bg-brand-600 text-white"
                  }`}
                >
                  {checked ? "✓" : action.order}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-tight text-slate-900 sm:text-base">{action.label}</p>
                  <p className="mt-0.5 hidden text-sm text-slate-600 sm:block">{action.description}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 sm:gap-2">
                    {action.tapHref ? (
                      <a
                        href={action.tapHref}
                        className={`${actionBtn} bg-brand-600 text-white hover:bg-brand-500`}
                      >
                        {action.tapLabel ?? settingsPage.forwardingTapToActivate}
                      </a>
                    ) : null}
                    {action.externalHref ? (
                      <a
                        href={action.externalHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${actionBtn} bg-brand-600 text-white hover:bg-brand-500`}
                      >
                        {action.externalLabel ?? "Open settings"}
                      </a>
                    ) : null}
                    {action.copyText ? (
                      <button
                        type="button"
                        onClick={() => void copyText(action.id, action.copyText!)}
                        className={`${actionBtn} border border-brand-300 bg-white text-brand-800 hover:bg-brand-50`}
                      >
                        {copiedId === action.id
                          ? settingsPage.forwardingCopied
                          : settingsPage.forwardingCopyNumber}
                      </button>
                    ) : null}
                    {action.deactivateHref ? (
                      <a
                        href={action.deactivateHref}
                        className={`${actionBtn} border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50`}
                      >
                        {action.deactivateLabel ?? settingsPage.forwardingTurnOff}
                      </a>
                    ) : null}
                  </div>
                  <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-700 sm:mt-2 sm:gap-2 sm:text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        persist({ ...done, [action.id]: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 sm:h-4 sm:w-4"
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
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-900 sm:px-4 sm:py-3 sm:text-sm">
          {settingsPage.forwardingOneTapComplete}
        </p>
      ) : (
        <p className="text-[10px] text-slate-500 sm:text-xs">{settingsPage.forwardingOneTapProgress}</p>
      )}
    </div>
  );
}
