"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MANO_COLONIAS } from "@/mano/lib/colonias";
import { MANO_CATEGORIES, getCategory, isManoServiceCategory } from "@/mano/lib/categories";
import type { ManoServiceCategory } from "@/mano/lib/types";

type Props = {
  defaultCategory?: ManoServiceCategory;
};

export function RequestForm({ defaultCategory }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<ManoServiceCategory>(
    defaultCategory ?? "limpieza",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [colonia, setColonia] = useState<string>(MANO_COLONIAS[0]);
  const [urgency, setUrgency] = useState<"hoy" | "esta_semana" | "flexible">("esta_semana");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/mano/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title: title.trim(),
          description: description.trim(),
          colonia,
          urgency,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al enviar");
      router.push(`/mano/mis-solicitudes?id=${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setLoading(false);
    }
  }

  const catMeta = getCategory(category);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-2xl border border-mano-border bg-mano-primary/5 p-4">
        <p className="text-sm font-medium text-mano-primary">
          {catMeta.icon} {catMeta.name}
        </p>
        <p className="text-xs text-mano-muted">Precio típico: {catMeta.avgPriceMxn}</p>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-mano-ink">Categoría</span>
        <select
          value={category}
          onChange={(e) => {
            const v = e.target.value;
            if (isManoServiceCategory(v)) setCategory(v);
          }}
          className="mt-1 w-full rounded-xl border border-mano-border bg-white px-3 py-2.5 text-sm"
        >
          {MANO_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-mano-ink">Título breve</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Fuga en el baño"
          className="mt-1 w-full rounded-xl border border-mano-border px-3 py-2.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-mano-ink">Describe el trabajo</span>
        <textarea
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Cuéntanos detalles: qué pasa, qué tamaño, acceso, etc."
          className="mt-1 w-full rounded-xl border border-mano-border px-3 py-2.5 text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-mano-ink">Colonia</span>
          <select
            value={colonia}
            onChange={(e) => setColonia(e.target.value)}
            className="mt-1 w-full rounded-xl border border-mano-border bg-white px-3 py-2.5 text-sm"
          >
            {MANO_COLONIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-mano-ink">Urgencia</span>
          <select
            value={urgency}
            onChange={(e) =>
              setUrgency(e.target.value as "hoy" | "esta_semana" | "flexible")
            }
            className="mt-1 w-full rounded-xl border border-mano-border bg-white px-3 py-2.5 text-sm"
          >
            <option value="hoy">Hoy / urgente</option>
            <option value="esta_semana">Esta semana</option>
            <option value="flexible">Flexible</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-mano-ink">Presupuesto máximo (MXN, opcional)</span>
        <input
          type="number"
          min={0}
          value={budgetMax}
          onChange={(e) => setBudgetMax(e.target.value)}
          placeholder="800"
          className="mt-1 w-full rounded-xl border border-mano-border px-3 py-2.5 text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-mano-ink">Tu nombre</span>
          <input
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-mano-border px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-mano-ink">WhatsApp / teléfono</span>
          <input
            required
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="+52 33 ..."
            className="mt-1 w-full rounded-xl border border-mano-border px-3 py-2.5 text-sm"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-mano-accent py-3 text-sm font-semibold text-white transition hover:bg-mano-accent-hover disabled:opacity-60"
      >
        {loading ? "Enviando…" : "Enviar solicitud gratis"}
      </button>
    </form>
  );
}
