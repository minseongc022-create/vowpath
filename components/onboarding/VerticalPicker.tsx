"use client";

import { useState } from "react";
import { clientFetch } from "@/lib/client-fetch";
import { VISIBLE_SHOP_VERTICALS, type ShopVertical } from "@/lib/shop-vertical";
import { VERTICAL_CONFIGS } from "@/lib/vertical-config";

const VERTICAL_ORDER: ShopVertical[] = VISIBLE_SHOP_VERTICALS;

export function VerticalPicker({
  onComplete,
}: {
  onComplete: (vertical: ShopVertical) => void;
}) {
  const [selected, setSelected] = useState<ShopVertical | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(vertical: ShopVertical) {
    setSelected(vertical);
    setSaving(true);
    setError(null);
    try {
      const res = await clientFetch(
        "/api/shop/profile",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vertical }),
        },
        8_000,
      );
      if (!res.ok) throw new Error("Could not save.");
      onComplete(vertical);
    } catch {
      setError("Could not save — please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">What type of shop are you?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Effiroad tailors your AI intake, dispatch rules, and crew notifications to your trade.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VERTICAL_ORDER.map((v) => {
          const cfg = VERTICAL_CONFIGS[v];
          const active = selected === v;
          return (
            <button
              key={v}
              type="button"
              disabled={saving}
              onClick={() => void handleSelect(v)}
              className={`rounded-xl border p-4 text-left transition ${
                active
                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-300"
                  : "border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/40"
              } ${saving && !active ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <span className="text-2xl" aria-hidden>
                {cfg.icon}
              </span>
              <p className="mt-2 text-sm font-semibold text-slate-900">{cfg.shortLabel}</p>
              <p className="mt-0.5 text-xs text-slate-500 leading-snug">{cfg.tagline}</p>
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saving && selected ? (
        <p className="text-sm text-slate-500">Setting up your {VERTICAL_CONFIGS[selected].shortLabel} workspace…</p>
      ) : null}
    </div>
  );
}
