"use client";

import { useState } from "react";
import { clientFetch } from "@/lib/client-fetch";
import { useLocale } from "@/components/providers/LocaleProvider";
import { shopVerticalLabel, VISIBLE_SHOP_VERTICALS, type ShopVertical } from "@/lib/shop-vertical";
import { VERTICAL_CONFIGS } from "@/lib/vertical-config";

const VERTICAL_ORDER: ShopVertical[] = VISIBLE_SHOP_VERTICALS;

const TAGLINE_KO: Partial<Record<ShopVertical, string>> = {
  restoration: "새벽 긴급 콜도 빠짐없이 받고, 확인되면 바로 크루를 보냅니다.",
  hvac: "난방 중단(no-heat) 콜은 확인되는 즉시 배차합니다.",
};

export function VerticalPicker({
  onComplete,
}: {
  onComplete: (vertical: ShopVertical) => void;
}) {
  const { locale, isEnglish } = useLocale();
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
      setError(
        isEnglish ? "Could not save — please try again." : "저장하지 못했습니다. 다시 시도해 주세요.",
      );
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {isEnglish ? "What type of shop are you?" : "어떤 업체인가요?"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {isEnglish
            ? "Effiroad tailors your AI intake, dispatch rules, and crew notifications to your trade."
            : "업종에 맞춰 AI 접수·배차 규칙·기사 문자가 달라집니다."}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VERTICAL_ORDER.map((v) => {
          const cfg = VERTICAL_CONFIGS[v];
          const active = selected === v;
          const label = shopVerticalLabel(v, locale);
          const tagline = isEnglish ? cfg.tagline : (TAGLINE_KO[v] ?? cfg.tagline);
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
              <p className="mt-2 text-sm font-semibold text-slate-900">{label}</p>
              <p className="mt-0.5 text-xs text-slate-500 leading-snug">{tagline}</p>
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saving && selected ? (
        <p className="text-sm text-slate-500">
          {isEnglish
            ? `Setting up your ${VERTICAL_CONFIGS[selected].shortLabel} workspace…`
            : `${shopVerticalLabel(selected, locale)} 설정 중…`}
        </p>
      ) : null}
    </div>
  );
}
