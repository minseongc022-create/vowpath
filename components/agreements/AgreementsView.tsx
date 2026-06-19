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
    active: "bg-emerald-500/15 text-emerald-300",
    draft: "bg-slate-500/15 text-slate-300",
    expired: "bg-amber-500/15 text-amber-300",
    cancelled: "bg-rose-500/15 text-rose-300",
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
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">{a.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{a.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{a.subtitle}</p>
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
        <div className="vow-dash-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{a.kpiActive}</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {agreements.filter((x) => x.status === "active").length}
          </p>
        </div>
        <div className="vow-dash-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{a.kpiRenewing}</p>
          <p className="mt-2 text-3xl font-bold text-amber-300">{data?.renewingCount ?? 0}</p>
        </div>
        <div className="vow-dash-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{a.kpiMrr}</p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">{formatAgreementPrice(Math.round(mrrCents))}</p>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-sm text-brand-200">
          {message}
        </p>
      ) : null}

      <div className="vow-dash-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="flex gap-1">
            {(["all", "active", "renewing"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  filter === id ? "bg-brand-500/20 text-brand-200" : "text-slate-400 hover:text-white"
                }`}
              >
                {a.filters[id]}
              </button>
            ))}
          </div>
          <label className="cursor-pointer text-xs font-semibold text-brand-300 hover:text-brand-200">
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
          <p className="px-4 py-8 text-sm text-slate-500">{a.loading}</p>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-slate-300">{a.emptyTitle}</p>
            <p className="mt-2 text-sm text-slate-500">{a.emptyBody}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">{a.colCustomer}</th>
                  <th className="px-4 py-3 font-semibold">{a.colPlan}</th>
                  <th className="px-4 py-3 font-semibold">{a.colRenewal}</th>
                  <th className="px-4 py-3 font-semibold">{a.colStatus}</th>
                  <th className="px-4 py-3 font-semibold text-right">{a.colPrice}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const days = daysUntilRenewal(row.renewalDate);
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.03]"
                      onClick={() => setSelected(row)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{row.customerName}</p>
                        <p className="text-xs text-slate-500">{row.serviceAddress}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.planName}</td>
                      <td className="px-4 py-3">
                        <span className="text-slate-300">{row.renewalDate}</span>
                        {row.status === "active" && days >= 0 && days <= 30 ? (
                          <span className="ml-2 text-xs text-amber-400">{a.daysLeft(days)}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-200">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleCreate}
            className="vow-dash-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
          >
            <h2 className="text-lg font-bold text-white">{a.addTitle}</h2>
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
                  <span className="text-slate-400">{label}</span>
                  <input
                    className="vow-dash-input mt-1 w-full"
                    value={String(form[key as keyof typeof form] ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    required={key !== "serviceAddress"}
                  />
                </label>
              ))}
              <label className="block text-sm">
                <span className="text-slate-400">{a.fieldPrice}</span>
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
                <span className="text-slate-400">{a.fieldVisits}</span>
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
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="vow-dash-card h-full w-full max-w-md overflow-y-auto p-6">
            <button type="button" className="text-sm text-slate-400" onClick={() => setSelected(null)}>
              {a.close}
            </button>
            <h2 className="mt-2 text-xl font-bold text-white">{selected.customerName}</h2>
            <p className="text-sm text-slate-400">{selected.customerPhone}</p>
            <dl className="mt-6 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">{a.fieldPlan}</dt>
                <dd className="text-white">{selected.planName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{a.fieldRenewal}</dt>
                <dd className="text-white">{selected.renewalDate}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{a.fieldPrice}</dt>
                <dd className="text-white">{formatAgreementPrice(selected.annualPriceCents)}/yr</dd>
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
