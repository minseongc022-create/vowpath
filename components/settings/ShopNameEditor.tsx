"use client";

import { useCallback, useEffect, useState } from "react";
import { clientFetch, clientFetchTimeoutMessage } from "@/lib/client-fetch";
import { useSettingsPage } from "@/components/providers/LocaleProvider";
import { useSettingsSaveRegistration } from "@/components/settings/SettingsSaveContext";

export function ShopNameEditor() {
  const copy = useSettingsPage().shopName;
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const persist = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(copy.required);
      return false;
    }
    setError(null);
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
        return false;
      }
      if (data.shopName) setName(data.shopName);
      window.dispatchEvent(
        new CustomEvent("vowroad:shop-name-updated", {
          detail: { shopName: data.shopName ?? trimmed },
        }),
      );
      return true;
    } catch (err) {
      setError(
        err instanceof Error && err.message === "REQUEST_TIMEOUT"
          ? clientFetchTimeoutMessage(copy.saveError)
          : copy.saveError,
      );
      return false;
    }
  }, [copy.required, copy.saveError, name]);

  useSettingsSaveRegistration("shop-name", persist, !loading);

  if (loading) {
    return <p className="vow-settings-muted">{copy.loading}</p>;
  }

  return (
    <div className="vow-settings-block rounded-xl border border-brand-200 bg-white p-5 shadow-sm">
      <label className="block">
        <span className="vow-settings-label">{copy.label}</span>
        <p className="vow-settings-hint mt-1">{copy.hint}</p>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder={copy.placeholder}
          maxLength={80}
          className="vow-settings-input mt-3"
        />
      </label>
      {error ? <p className="mt-2 text-base text-rose-700">{error}</p> : null}
    </div>
  );
}
