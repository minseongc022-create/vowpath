"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSettingsPage } from "@/components/providers/LocaleProvider";
import { ROUTES } from "@/lib/constants";

type BillingStatus = {
  entitled: boolean;
  plan: string | null;
  subscriptionStatus: string;
  paddleCustomerId: string | null;
};

export function BillingStatusBanner({ transactionId }: { transactionId?: string }) {
  const settingsPage = useSettingsPage();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const qs = transactionId ? `?transaction_id=${encodeURIComponent(transactionId)}` : "";
    void fetch(`/api/billing/status${qs}`)
      .then((r) => r.json())
      .then((data) => setStatus(data as BillingStatus))
      .catch(() => setStatus(null));
  }, [transactionId]);

  if (!status) return null;

  if (!status.entitled) {
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-950">
        <p>Choose a plan anytime — see Lite, Flex, Pro, and Scale.</p>
        <Link
          href={ROUTES.pricing}
          className="mt-2 inline-block font-semibold text-brand-800 underline hover:text-brand-950"
        >
          View plans
        </Link>
      </div>
    );
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <p>{settingsPage.paidWelcome}</p>
      {status.plan ? (
        <p className="mt-1 text-emerald-800">
          Plan: <span className="font-semibold capitalize">{status.plan}</span>
          {status.subscriptionStatus !== "active" ? (
            <span className="ml-2 text-amber-700">({status.subscriptionStatus})</span>
          ) : null}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {status.paddleCustomerId ? (
          <button
            type="button"
            onClick={() => void openPortal()}
            disabled={portalLoading}
            className="font-semibold text-emerald-800 underline hover:text-emerald-950 disabled:opacity-50"
          >
            {portalLoading ? "Opening…" : "Manage billing"}
          </button>
        ) : null}
        <Link
          href={ROUTES.pricing}
          className="font-semibold text-emerald-800 underline hover:text-emerald-950"
        >
          View plans
        </Link>
      </div>
    </div>
  );
}
