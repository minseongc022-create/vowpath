"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_ESTIMATE_EXCLUSIONS,
  DEFAULT_ESTIMATE_NOTES,
  DEFAULT_ESTIMATE_PAYMENT_TERMS,
} from "@/lib/estimate-document";
import { useSettingsSaveRegistration } from "@/components/settings/SettingsSaveContext";

type ProfileEstimateFields = {
  businessAddress?: string;
  licenseNumber?: string;
  iicrcFirmNumber?: string;
  defaultTaxRatePercent?: number;
  estimateValidityDays?: number;
  estimateNotes?: string;
  estimateExclusions?: string;
  defaultLaborRateCents?: number;
  estimatePaymentTerms?: string;
};

export function EstimateDefaultsPanel() {
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<ProfileEstimateFields>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/profile");
      const data = (await res.json()) as { profile?: ProfileEstimateFields };
      if (!res.ok) {
        setError("Could not load estimate defaults.");
        return;
      }
      setFields(data.profile ?? {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    const res = await fetch("/api/shop/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Could not save estimate defaults.");
    }
    const data = (await res.json()) as { profile?: ProfileEstimateFields };
    if (data.profile) setFields(data.profile);
    return true;
  }, [fields]);

  useSettingsSaveRegistration("estimate-defaults", save);

  if (loading) {
    return (
      <div className="vow-settings-block vow-settings-panel p-4 text-sm text-stone-500">
        Loading estimate defaults…
      </div>
    );
  }

  return (
    <div className="vow-settings-block vow-settings-panel space-y-4 p-4 sm:p-5">
      <div>
        <h3 className="text-base font-semibold text-brand-950">Estimate & proposal defaults</h3>
        <p className="mt-1 text-sm text-stone-600">
          Same fields you put on paper quotes — saved once, pre-filled on every new field worksheet.
          Matches how ServiceTitan / Jobber proposals start.
        </p>
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-stone-800">Shop address (prints on estimate)</span>
          <input
            value={fields.businessAddress ?? ""}
            onChange={(e) => setFields((f) => ({ ...f, businessAddress: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
            placeholder="123 Main St, Austin TX"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-800">Contractor license #</span>
          <input
            value={fields.licenseNumber ?? ""}
            onChange={(e) => setFields((f) => ({ ...f, licenseNumber: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-800">IICRC firm # (restoration)</span>
          <input
            value={fields.iicrcFirmNumber ?? ""}
            onChange={(e) => setFields((f) => ({ ...f, iicrcFirmNumber: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-800">Default tax rate %</span>
          <input
            type="number"
            min={0}
            max={30}
            step={0.1}
            value={fields.defaultTaxRatePercent ?? 0}
            onChange={(e) =>
              setFields((f) => ({
                ...f,
                defaultTaxRatePercent: Number(e.target.value) || 0,
              }))
            }
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-800">Default labor rate ($/hr)</span>
          <input
            type="number"
            min={0}
            step={1}
            value={
              fields.defaultLaborRateCents
                ? (fields.defaultLaborRateCents / 100).toFixed(0)
                : ""
            }
            onChange={(e) =>
              setFields((f) => ({
                ...f,
                defaultLaborRateCents: Math.round((Number(e.target.value) || 0) * 100),
              }))
            }
            placeholder="125"
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-800">Estimate valid (days)</span>
          <input
            type="number"
            min={1}
            max={90}
            value={fields.estimateValidityDays ?? 14}
            onChange={(e) =>
              setFields((f) => ({
                ...f,
                estimateValidityDays: Math.round(Number(e.target.value) || 14),
              }))
            }
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-stone-800">Payment terms</span>
        <textarea
          value={fields.estimatePaymentTerms ?? DEFAULT_ESTIMATE_PAYMENT_TERMS}
          onChange={(e) => setFields((f) => ({ ...f, estimatePaymentTerms: e.target.value }))}
          rows={2}
          className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-stone-800">Standard notes</span>
          <textarea
            value={fields.estimateNotes ?? DEFAULT_ESTIMATE_NOTES}
            onChange={(e) => setFields((f) => ({ ...f, estimateNotes: e.target.value }))}
            rows={4}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-xs"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-800">Standard exclusions</span>
          <textarea
            value={fields.estimateExclusions ?? DEFAULT_ESTIMATE_EXCLUSIONS}
            onChange={(e) => setFields((f) => ({ ...f, estimateExclusions: e.target.value }))}
            rows={4}
            className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-xs"
          />
        </label>
      </div>
    </div>
  );
}
