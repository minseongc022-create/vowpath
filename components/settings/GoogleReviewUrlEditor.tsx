"use client";

import { useState } from "react";
import { useSettingsPage } from "@/components/providers/LocaleProvider";

export function GoogleReviewUrlEditor({
  reviewUrl,
  onSaved,
}: {
  reviewUrl?: string;
  onSaved: (url: string | undefined) => void;
}) {
  const copy = useSettingsPage().googleReview;
  const [draft, setDraft] = useState(reviewUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = draft.trim();
    if (trimmed && !/^https:\/\/.+/.test(trimmed)) {
      setError(copy.invalidUrl);
      return;
    }
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/shop/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleReviewUrl: trimmed }),
      });
      if (res.ok) {
        onSaved(trimmed || undefined);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 sm:p-4">
      <p className="text-sm font-medium text-brand-900">{copy.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{copy.hint}</p>
      <input
        type="url"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onBlur={() => void handleSave()}
        placeholder={copy.placeholder}
        maxLength={300}
        className="vow-settings-input mt-3"
      />
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
      {saving ? (
        <p className="mt-2 text-xs text-slate-500">{copy.saving}</p>
      ) : saved ? (
        <p className="mt-2 text-xs text-emerald-600">{copy.saved}</p>
      ) : null}
    </div>
  );
}
