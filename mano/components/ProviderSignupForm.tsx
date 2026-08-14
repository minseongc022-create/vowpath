"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MANO_COLONIAS } from "@/mano/lib/colonias";
import { MANO_CATEGORIES, isManoServiceCategory } from "@/mano/lib/categories";
import type { ManoServiceCategory } from "@/mano/lib/types";

export function ProviderSignupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("3");
  const [categories, setCategories] = useState<ManoServiceCategory[]>(["manitas"]);
  const [colonias, setColonias] = useState<string[]>([MANO_COLONIAS[0]]);

  function toggleCategory(id: ManoServiceCategory) {
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function toggleColonia(c: string) {
    setColonias((prev) =>
      prev.includes(c) ? (prev.length > 1 ? prev.filter((x) => x !== c) : prev) : [...prev, c],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (categories.length === 0) {
      setError("Selecciona al menos una categoría");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/mano/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          whatsapp: phone.trim(),
          bio: bio.trim(),
          yearsExperience: Number(yearsExperience),
          categories,
          colonias,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al registrar");
      router.push(`/mano/profesional/panel?id=${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium">Nombre completo o negocio</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-mano-border px-3 py-2.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">WhatsApp / teléfono</span>
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+52 33 ..."
          className="mt-1 w-full rounded-xl border border-mano-border px-3 py-2.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Años de experiencia</span>
        <input
          type="number"
          min={0}
          max={50}
          value={yearsExperience}
          onChange={(e) => setYearsExperience(e.target.value)}
          className="mt-1 w-full rounded-xl border border-mano-border px-3 py-2.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Cuéntanos sobre tu servicio</span>
        <textarea
          required
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-1 w-full rounded-xl border border-mano-border px-3 py-2.5 text-sm"
        />
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Servicios que ofreces</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {MANO_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCategory(c.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                categories.includes(c.id)
                  ? "bg-mano-primary text-white"
                  : "bg-mano-surface text-mano-muted hover:bg-mano-border/50"
              }`}
            >
              {c.icon} {c.nameShort}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Colonias donde trabajas</legend>
        <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-mano-border p-2">
          <div className="flex flex-wrap gap-2">
            {MANO_COLONIAS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleColonia(c)}
                className={`rounded-lg px-2 py-1 text-xs font-medium ${
                  colonias.includes(c)
                    ? "bg-mano-primary/15 text-mano-primary"
                    : "bg-mano-surface text-mano-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-mano-primary py-3 text-sm font-semibold text-white hover:bg-mano-primary-hover disabled:opacity-60"
      >
        {loading ? "Registrando…" : "Unirme como profesional"}
      </button>
    </form>
  );
}
