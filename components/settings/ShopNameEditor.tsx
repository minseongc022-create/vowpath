"use client";

import { useCallback, useEffect, useState } from "react";
import { clientFetch, clientFetchTimeoutMessage } from "@/lib/client-fetch";
import { useSettingsPage } from "@/components/providers/LocaleProvider";

export function ShopNameEditor() {
  const copy = useSettingsPage().shopName;
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientFetch("/api/account/contact", undefined, 8_000);
      const data = (await res.json()) as { shopName?: string; error?: string };
      if (!res.ok) {
        setError(copy.loadError);
        return;
      }
      setName(data.shopName?.trim() ?? "");
    } catch (e) {
      setError(
        e instanceof Error && e.message === "REQUEST_TIMEOUT"
          ? clientFetchTimeoutMessage(copy.loadError)
          : copy.loadError,
      );
    } finally {
      setLoading(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(copy.required);
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await clientFetch(
        "/api/account/contact",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopName: trimmed }),
        },
        12_000,
      );
      const data = (await res.json()) as { ok?: boolean; shopName?: string; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? copy.saveError);
        return;
      }
      if (data.shopName) setName(data.shopName);
      setSaved(true);
      window.dispatchEvent(
        new CustomEvent("vowpath:shop-name-updated", {
          detail: { shopName: data.shopName ?? trimmed },
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error && err.message === "REQUEST_TIMEOUT"
          ? clientFetchTimeoutMessage(copy.saveError)
          : copy.saveError,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">{copy.loading}</p>;
  }

  return (
    <form
      onSubmit={save}
      className="rounded-xl border border-brand-200 bg-white p-5 shadow-sm"
    >
      <label className="block">
        <span className="text-sm font-semibold text-slate-900">{copy.label}</span>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{copy.hint}</p>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          placeholder={copy.placeholder}
          maxLength={80}
          className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>
      {error ? (
        <p className="mt-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {saved ? (
        <p className="mt-2 text-sm font-medium text-emerald-800">{copy.saved}</p>
      ) : null}
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {saving ? copy.saving : copy.save}
      </button>
    </form>
  );
}
