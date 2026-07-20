"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  categoryLabel,
  computeEstimateTotals,
  formatUsdFromCents,
  newLineItem,
  unitLabel,
  type EstimateDocument,
  type EstimateLineCategory,
  type EstimateLineItem,
  type EstimateLineUnit,
} from "@/lib/estimate-document";
import { lineFromPreset, presetsForVertical, type EstimatePreset } from "@/lib/estimate-catalog";
import type { ShopVertical } from "@/lib/shop-vertical";

type Totals = ReturnType<typeof computeEstimateTotals>;

const CATEGORIES: EstimateLineCategory[] = [
  "labor",
  "materials",
  "equipment",
  "fees",
  "other",
];
const UNITS: EstimateLineUnit[] = ["ea", "hr", "day", "sf", "lf", "ls"];

function dollarsFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function centsFromDollars(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function OnSiteEstimateBuilder({
  bookingId,
  vertical,
  onSaved,
}: {
  bookingId: string;
  vertical?: ShopVertical | null;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<EstimateDocument | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const presets = useMemo(() => presetsForVertical(vertical), [vertical]);
  const totals = useMemo(
    () => (estimate ? computeEstimateTotals(estimate) : null),
    [estimate],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/estimate-doc?id=${encodeURIComponent(bookingId)}`);
      const data = (await res.json()) as {
        estimate?: EstimateDocument;
        error?: string;
      };
      if (!res.ok || !data.estimate) {
        setError(data.error ?? "Could not load estimate.");
        return;
      }
      setEstimate(data.estimate);
      if (data.estimate.shareToken) {
        setShareUrl(`${window.location.origin}/e/${data.estimate.shareToken}`);
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (open && !estimate && !loading) {
      void load();
    }
  }, [open, estimate, loading, load]);

  function updateLine(id: string, patch: Partial<EstimateLineItem>) {
    setEstimate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lineItems: prev.lineItems.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      };
    });
  }

  function addBlankLine() {
    setEstimate((prev) =>
      prev ? { ...prev, lineItems: [...prev.lineItems, newLineItem()] } : prev,
    );
  }

  function addPreset(preset: EstimatePreset) {
    setEstimate((prev) =>
      prev ? { ...prev, lineItems: [...prev.lineItems, lineFromPreset(preset)] } : prev,
    );
  }

  function removeLine(id: string) {
    setEstimate((prev) =>
      prev
        ? { ...prev, lineItems: prev.lineItems.filter((l) => l.id !== id) }
        : prev,
    );
  }

  async function handleSave() {
    if (!estimate) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/jobs/estimate-doc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bookingId,
          estimate,
          saveShopDefaults: true,
        }),
      });
      const data = (await res.json()) as {
        estimate?: EstimateDocument;
        error?: string;
      };
      if (!res.ok || !data.estimate) {
        setError(data.error ?? "Could not save.");
        return;
      }
      setEstimate(data.estimate);
      setOkMsg("Estimate saved. Shop defaults (license, tax, notes) updated for next time.");
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!estimate) return;
    setSending(true);
    setError(null);
    setOkMsg(null);
    try {
      // Persist latest edits first
      const saveRes = await fetch("/api/jobs/estimate-doc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bookingId, estimate, saveShopDefaults: true }),
      });
      const saveData = (await saveRes.json()) as {
        estimate?: EstimateDocument;
        error?: string;
      };
      if (!saveRes.ok || !saveData.estimate) {
        setError(saveData.error ?? "Save failed before send.");
        return;
      }
      setEstimate(saveData.estimate);

      const res = await fetch("/api/jobs/estimate-doc/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bookingId }),
      });
      const data = (await res.json()) as {
        estimate?: EstimateDocument;
        shareUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not send.");
        return;
      }
      if (data.estimate) setEstimate(data.estimate);
      if (data.shareUrl) setShareUrl(data.shareUrl);
      setOkMsg("Estimate texted to customer with a review link.");
      onSaved?.();
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="booking-detail-card overflow-visible rounded-2xl border border-brand-200/70 bg-white shadow-[0_1px_2px_rgb(61_50_40/0.05),0_8px_28px_rgb(61_50_40/0.08)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-brand-950">On-site estimate builder</h3>
          <p className="mt-0.5 text-xs text-stone-600">
            Line items · tax · insurance fields · text a share link (truck-ready)
          </p>
        </div>
        <span className="text-stone-400">{open ? "▴" : "▾"}</span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-brand-100 px-4 pb-5 pt-4 sm:px-5">
          {loading || !estimate ? (
            <p className="text-sm text-stone-500">Loading estimate…</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Estimate #">
                  <input
                    value={estimate.number}
                    readOnly
                    className="w-full rounded-lg border border-brand-200 bg-stone-50 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Tax rate %">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.1}
                    value={estimate.taxRatePercent}
                    onChange={(e) =>
                      setEstimate({
                        ...estimate,
                        taxRatePercent: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Customer">
                  <input
                    value={estimate.customerName}
                    onChange={(e) =>
                      setEstimate({ ...estimate, customerName: e.target.value })
                    }
                    className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Customer phone">
                  <input
                    value={estimate.customerPhone ?? ""}
                    onChange={(e) =>
                      setEstimate({ ...estimate, customerPhone: e.target.value })
                    }
                    className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Job site address" className="sm:col-span-2">
                  <input
                    value={estimate.customerAddress ?? ""}
                    onChange={(e) =>
                      setEstimate({ ...estimate, customerAddress: e.target.value })
                    }
                    className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Insurance carrier">
                  <input
                    value={estimate.insuranceCarrier ?? ""}
                    onChange={(e) =>
                      setEstimate({ ...estimate, insuranceCarrier: e.target.value })
                    }
                    placeholder="State Farm…"
                    className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Claim #">
                  <input
                    value={estimate.claimNumber ?? ""}
                    onChange={(e) =>
                      setEstimate({ ...estimate, claimNumber: e.target.value })
                    }
                    className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Adjuster">
                  <input
                    value={estimate.adjusterName ?? ""}
                    onChange={(e) =>
                      setEstimate({ ...estimate, adjusterName: e.target.value })
                    }
                    className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Scope summary" className="sm:col-span-2">
                  <textarea
                    value={estimate.scopeSummary ?? ""}
                    onChange={(e) =>
                      setEstimate({ ...estimate, scopeSummary: e.target.value })
                    }
                    rows={2}
                    className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm"
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-brand-100 bg-stone-50/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  Your company (prints on estimate)
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    value={estimate.shop.shopName}
                    onChange={(e) =>
                      setEstimate({
                        ...estimate,
                        shop: { ...estimate.shop, shopName: e.target.value },
                      })
                    }
                    placeholder="Shop name"
                    className="rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm"
                  />
                  <input
                    value={estimate.shop.phone ?? ""}
                    onChange={(e) =>
                      setEstimate({
                        ...estimate,
                        shop: { ...estimate.shop, phone: e.target.value },
                      })
                    }
                    placeholder="Shop phone"
                    className="rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm"
                  />
                  <input
                    value={estimate.shop.businessAddress ?? ""}
                    onChange={(e) =>
                      setEstimate({
                        ...estimate,
                        shop: { ...estimate.shop, businessAddress: e.target.value },
                      })
                    }
                    placeholder="Business address"
                    className="rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm sm:col-span-2"
                  />
                  <input
                    value={estimate.shop.licenseNumber ?? ""}
                    onChange={(e) =>
                      setEstimate({
                        ...estimate,
                        shop: { ...estimate.shop, licenseNumber: e.target.value },
                      })
                    }
                    placeholder="Contractor license #"
                    className="rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm"
                  />
                  <input
                    value={estimate.shop.iicrcFirmNumber ?? ""}
                    onChange={(e) =>
                      setEstimate({
                        ...estimate,
                        shop: { ...estimate.shop, iicrcFirmNumber: e.target.value },
                      })
                    }
                    placeholder="IICRC firm # (restoration)"
                    className="rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  Quick-add common items
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addPreset(p)}
                      className="rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-brand-50"
                    >
                      + {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {estimate.lineItems.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-brand-200 px-3 py-4 text-center text-xs text-stone-500">
                    No line items yet — tap a quick-add above or add a blank row.
                  </p>
                ) : null}
                {estimate.lineItems.map((line) => (
                  <div
                    key={line.id}
                    className="rounded-xl border border-brand-100 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <input
                        value={line.description}
                        onChange={(e) => updateLine(line.id, { description: e.target.value })}
                        placeholder="Description"
                        className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="shrink-0 text-xs text-rose-600"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <select
                        value={line.category}
                        onChange={(e) =>
                          updateLine(line.id, {
                            category: e.target.value as EstimateLineCategory,
                          })
                        }
                        className="rounded-lg border border-brand-200 px-2 py-1.5 text-xs"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {categoryLabel(c)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={line.unit}
                        onChange={(e) =>
                          updateLine(line.id, { unit: e.target.value as EstimateLineUnit })
                        }
                        className="rounded-lg border border-brand-200 px-2 py-1.5 text-xs"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {unitLabel(u)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.qty}
                        onChange={(e) =>
                          updateLine(line.id, { qty: Number(e.target.value) || 0 })
                        }
                        placeholder="Qty"
                        className="rounded-lg border border-brand-200 px-2 py-1.5 text-xs"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={dollarsFromCents(line.unitPriceCents)}
                        onChange={(e) =>
                          updateLine(line.id, {
                            unitPriceCents: centsFromDollars(e.target.value),
                          })
                        }
                        placeholder="Rate $"
                        className="rounded-lg border border-brand-200 px-2 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addBlankLine}
                  className="text-xs font-semibold text-brand-700 hover:underline"
                >
                  + Add blank line
                </button>
              </div>

              {totals ? (
                <div className="ml-auto w-full max-w-xs space-y-1 rounded-xl bg-stone-50 px-3 py-3 text-sm">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal</span>
                    <span className="tabular-nums">
                      {formatUsdFromCents(totals.subtotalCents)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Tax</span>
                    <span className="tabular-nums">{formatUsdFromCents(totals.taxCents)}</span>
                  </div>
                  <div className="flex justify-between border-t border-stone-200 pt-2 font-semibold text-stone-900">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {formatUsdFromCents(totals.totalCents)}
                    </span>
                  </div>
                  {estimate.status === "sent" ? (
                    <p className="pt-1 text-[11px] text-emerald-700">
                      Sent {estimate.sentAt ? new Date(estimate.sentAt).toLocaleString() : ""}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Notes">
                  <textarea
                    value={estimate.notes ?? ""}
                    onChange={(e) => setEstimate({ ...estimate, notes: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-xs"
                  />
                </Field>
                <Field label="Exclusions">
                  <textarea
                    value={estimate.exclusions ?? ""}
                    onChange={(e) =>
                      setEstimate({ ...estimate, exclusions: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-xs"
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving || sending}
                  onClick={() => void handleSave()}
                  className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save draft"}
                </button>
                <button
                  type="button"
                  disabled={saving || sending}
                  onClick={() => void handleSend()}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Text estimate to customer"}
                </button>
                {shareUrl ? (
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-800 hover:bg-brand-50"
                  >
                    Open customer view
                  </a>
                ) : null}
              </div>

              {okMsg ? <p className="text-xs text-emerald-800">{okMsg}</p> : null}
              {error ? <p className="text-xs text-rose-700">{error}</p> : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
