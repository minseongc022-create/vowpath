"use client";

import { useState } from "react";
import { settingsPage } from "@/lib/content";
import {
  FORWARDING_CARRIER_PHONES,
  getForwardingUnblockGuides,
  type ForwardingProviderId,
} from "@/lib/forwarding-guides";

type Props = {
  provider: ForwardingProviderId;
  effiroadNumber: string;
};

export function ForwardingUnblockGuide({ provider, effiroadNumber }: Props) {
  const guides = getForwardingUnblockGuides(provider, effiroadNumber);
  const [openId, setOpenId] = useState<string | null>(guides[0]?.id ?? null);

  const carrierPhone =
    provider === "verizon"
      ? FORWARDING_CARRIER_PHONES.verizon
      : provider === "att"
        ? FORWARDING_CARRIER_PHONES.att
        : provider === "tmobile"
          ? FORWARDING_CARRIER_PHONES.tmobile
          : null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
      <p className="text-base font-bold text-amber-950">{settingsPage.forwardingUnblockTitle}</p>
      <p className="mt-1 text-sm text-amber-900/90">{settingsPage.forwardingUnblockHint}</p>

      <div className="mt-4 space-y-2">
        {guides.map((g) => {
          const open = openId === g.id;
          return (
            <div key={g.id} className="overflow-hidden rounded-lg border border-amber-200 bg-white">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : g.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-900"
              >
                {g.problem}
                <span className={`text-slate-400 ${open ? "rotate-180" : ""}`} aria-hidden>
                  ▾
                </span>
              </button>
              {open ? (
                <ol className="list-decimal space-y-2 border-t border-amber-100 px-4 py-3 pl-8 text-sm leading-relaxed text-slate-700">
                  {g.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : null}
            </div>
          );
        })}
      </div>

      {carrierPhone ? (
        <p className="mt-4 text-sm text-amber-950">
          {settingsPage.forwardingCarrierCallLabel}{" "}
          <span className="font-mono font-semibold">{carrierPhone}</span>
        </p>
      ) : null}
    </div>
  );
}
