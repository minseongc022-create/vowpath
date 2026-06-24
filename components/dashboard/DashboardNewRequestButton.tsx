"use client";

import { useState } from "react";
import { useVowDashboard } from "@/components/providers/LocaleProvider";

type DashboardNewRequestButtonProps = {
  onCreated?: () => void;
};

export function DashboardNewRequestButton({ onCreated }: DashboardNewRequestButtonProps) {
  const vowDashboard = useVowDashboard();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch("/api/dev/simulate-call", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string; card?: { symptom?: string } };
      if (!res.ok) {
        setToast(data.error ?? vowDashboard.header.simulateFail);
        return;
      }
      setToast(vowDashboard.header.simulateDone);
      window.dispatchEvent(new CustomEvent("vowroad:calls-updated"));
      onCreated?.();
      setTimeout(() => setToast(null), 4000);
    } catch {
      setToast(vowDashboard.header.simulateFail);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={busy}
        className="vow-dash-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="text-lg leading-none">+</span>
        {vowDashboard.header.newRequest}
      </button>
      {toast ? (
        <p className="absolute right-0 top-full z-50 mt-2 max-w-xs rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs text-stone-700 shadow-lg">
          {busy ? vowDashboard.header.simulateWorking : toast}
        </p>
      ) : null}
    </div>
  );
}
