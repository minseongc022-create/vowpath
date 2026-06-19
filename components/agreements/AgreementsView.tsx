"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { useVowDashboard } from "@/components/providers/LocaleProvider";
import {
  daysUntilRenewal,
  formatAgreementPrice,
  type MaintenanceAgreement,
} from "@/lib/agreements/types";

type Filter = "all" | "active" | "renewing";

type AgreementsResponse = {
  agreements: MaintenanceAgreement[];
  renewingCount: number;
};

const emptyForm = {
  customerName: "",
  customerPhone: "",
  serviceAddress: "",
  planName: "Annual HVAC Maintenance",
  annualPriceCents: 19900,
  visitsPerYear: 2,
  startDate: new Date().toISOString().slice(0, 10),
  renewalDate: (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  })(),
  notes: "",
};

function statusBadge(status: MaintenanceAgreement["status"]) {
  const map = {
    active: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    draft: "bg-stone-100 text-stone-700 ring-1 ring-stone-200",
    expired: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    cancelled: "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
  };
  return map[status] ?? map.draft;
}

export function AgreementsView() {
  const vow = useVowDashboard();
  const a = vow.agreements;
  const [data, setData] = useState<AgreementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<MaintenanceAgreement | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shop/agreements");
      if (!res.ok) throw new Error("load failed");
      const json = (await res.json()) as AgreementsResponse;
      setData(json);
    } catch {
      setMessage(a.loadError);
    } finally {
      setLoading(false);
    }
  }, [a.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const agreements = data?.agreements ?? [];
  const filtered = useMemo(() => {
    if (filter === "active") return agreements.filter((x) => x.status === "active");
    if (filter === "renewing") {
      return agreements.filter((x) => {
        if (x.status !== "active") return false;
        const d = daysUntilRenewal(x.renewalDate);
        return d >= 0 && d <= 30;
      });
    }
    return agreements;
  }, [agreements, filter]);

  const mrrCents = useMemo(
    () =>
      agreements
        .filter((x) => x.status === "active")
        .reduce((sum, x) => sum + x.annualPriceCents, 0) / 12,
    [agreements],
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/shop/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("save failed");
      setShowForm(false);
      setForm(emptyForm);
      setMessage(a.saved);
      await load();
    } catch {
      setMessage(a.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function handleImport(file: File) {
    setImporting(true);
    setMessage(null);
    try {
      const csv = await file.text();
      const res = await fetch("/api/shop/agreements/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "import failed");
      setMessage(a.importDone(json.imported, json.skipped));
      await load();
    } catch {
      setMessage(a.importError);
    } finally {
      setImporting(false);
    }
  }

  async function handleUpdate(agreement: MaintenanceAgreement, patch: Partial<MaintenanceAgreement>) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/shop/agreements/${agreement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("update failed");
      setMessage(a.saved);
      setSelected(null);
      await load();
    } catch {
      setMessage(a.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="vow-settings-eyebrow">{a.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold text-brand-950 sm:text-3xl">{a.title}</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-600">{a.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`${ROUTES.settings}#agreements`} className="vow-dash-btn-secondary text-sm">
            {a.settingsLink}
          </Link>
          <button type="button" className="vow-dash-btn-primary text-sm" onClick={() => setShowForm(true)}>
            {a.addButton}
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="vow-dash-kpi">
          <p className="vow-dash-kpi-label">{a.kpiActive}</p>
          <p className="vow-dash-kpi-value mt-2 !text-4xl">
            {agreements.filter((x) => x.status === "active").length}
          </p>
        </div>
        <div className="vow-dash-kpi">
          <p className="vow-dash-kpi-label">{a.kpiRenewing}</p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-amber-700">{data?.renewingCount ?? 0}</p>
        </div>
        <div className="vow-dash-kpi">
          <p className="vow-dash-kpi-label">{a.kpiMrr}</p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-emerald-700">
            {formatAgreementPrice(Math.round(mrrCents))}
          </p>
        </div>
      </div>

      {message ? (
        <p className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-base text-brand-900">
          {message}
        </p>
      ) : null}

      <div className="vow-dash-card overflow-hidden !p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap gap-2">
            {(["all", "active", "renewing"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`vow-settings-chip !min-h-[40px] !px-3 !py-2 !text-sm ${
                  filter === id ? "vow-settings-chip-active" : "vow-settings-chip-inactive"
                }`}
              >
                {a.filters[id]}
              </button>
            ))}
          </div>
          <label className="cursor-pointer text-sm font-semibold text-brand-800 hover:text-brand-900">
            {importing ? a.importing : a.importCsv}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImport(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {loading ? (
          <p className="px-5 py-8 text-base text-stone-600">{a.loading}</p>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-base font-semibold text-brand-950">{a.emptyTitle}</p>
            <p className="mt-2 text-base text-stone-600">{a.emptyBody}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200/80 text-xs uppercase tracking-wide text-stone-600">
                  <th className="px-5 py-3 font-semibold">{a.colCustomer}</th>
                  <th className="px-5 py-3 font-semibold">{a.colPlan}</th>
                  <th className="px-5 py-3 font-semibold">{a.colRenewal}</th>
                  <th className="px-5 py-3 font-semibold">{a.colStatus}</th>
                  <th className="px-5 py-3 font-semibold text-right">{a.colPrice}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const days = daysUntilRenewal(row.renewalDate);
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-stone-100 hover:bg-brand-50/50"
                      onClick={() => setSelected(row)}
                    >
                      <td className="px-5 py-3">
                        <p className="font-semibold text-brand-950">{row.customerName}</p>
                        <p className="text-sm text-stone-500">{row.serviceAddress}</p>
                      </td>
                      <td className="px-5 py-3 text-stone-700">{row.planName}</td>
                      <td className="px-5 py-3">
                        <span className="text-stone-700">{row.renewalDate}</span>
                        {row.status === "active" && days >= 0 && days <= 30 ? (
                          <span className="ml-2 text-sm font-medium text-amber-700">{a.daysLeft(days)}</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-brand-900">
                        {formatAgreementPrice(row.annualPriceCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreate}
            className="vow-dash-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
          >
            <h2 className="text-xl font-bold text-brand-950">{a.addTitle}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["customerName", a.fieldName],
                  ["customerPhone", a.fieldPhone],
                  ["serviceAddress", a.fieldAddress],
                  ["planName", a.fieldPlan],
                  ["startDate", a.fieldStart],
                  ["renewalDate", a.fieldRenewal],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  <span className="vow-settings-label !text-sm">{label}</span>
                  <input
                    className="vow-dash-input mt-1 w-full"
                    value={String(form[key as keyof typeof form] ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    required={key !== "serviceAddress"}
                  />
                </label>
              ))}
              <label className="block text-sm">
                <span className="vow-settings-label !text-sm">{a.fieldPrice}</span>
                <input
                  type="number"
                  className="vow-dash-input mt-1 w-full"
                  value={form.annualPriceCents / 100}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      annualPriceCents: Math.round(Number(e.target.value) * 100) || 0,
                    }))
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="vow-settings-label !text-sm">{a.fieldVisits}</span>
                <input
                  type="number"
                  min={1}
                  className="vow-dash-input mt-1 w-full"
                  value={form.visitsPerYear}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, visitsPerYear: Math.max(1, Number(e.target.value) || 2) }))
                  }
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="vow-dash-btn-secondary" onClick={() => setShowForm(false)}>
                {a.cancel}
              </button>
              <button type="submit" className="vow-dash-btn-primary" disabled={saving}>
                {saving ? a.saving : a.save}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-sm">
          <div className="vow-dash-card h-full w-full max-w-md overflow-y-auto p-6 shadow-2xl">
            <button type="button" className="text-sm font-medium text-stone-600 hover:text-brand-900" onClick={() => setSelected(null)}>
              {a.close}
            </button>
            <h2 className="mt-2 text-xl font-bold text-brand-950">{selected.customerName}</h2>
            <p className="text-base text-stone-600">{selected.customerPhone}</p>
            <dl className="mt-6 space-y-3 text-base">
              <div>
                <dt className="text-sm font-medium text-stone-500">{a.fieldPlan}</dt>
                <dd className="font-semibold text-brand-950">{selected.planName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-stone-500">{a.fieldRenewal}</dt>
                <dd className="font-semibold text-brand-950">{selected.renewalDate}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-stone-500">{a.fieldPrice}</dt>
                <dd className="font-semibold text-brand-950">{formatAgreementPrice(selected.annualPriceCents)}/yr</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className="vow-dash-btn-secondary text-sm"
                disabled={saving}
                onClick={() => handleUpdate(selected, { status: "cancelled" })}
              >
                {a.cancelAgreement}
              </button>
              <button
                type="button"
                className="vow-dash-btn-primary text-sm"
                disabled={saving}
                onClick={() => {
                  const d = new Date(selected.renewalDate);
                  d.setFullYear(d.getFullYear() + 1);
                  void handleUpdate(selected, {
                    renewalDate: d.toISOString().slice(0, 10),
                    lastVisitDate: new Date().toISOString().slice(0, 10),
                  });
                }}
              >
                {a.renewOneYear}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
