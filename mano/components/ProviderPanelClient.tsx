"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCategory } from "@/mano/lib/categories";
import type { ManoProvider, ManoQuote, ManoServiceRequest } from "@/mano/lib/types";

type Props = { providerId: string };

export function ProviderPanelClient({ providerId }: Props) {
  const [provider, setProvider] = useState<ManoProvider | null>(null);
  const [requests, setRequests] = useState<ManoServiceRequest[]>([]);
  const [quotes, setQuotes] = useState<ManoQuote[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const [pRes, rRes] = await Promise.all([
        fetch(`/api/mano/providers?id=${providerId}`),
        fetch("/api/mano/requests"),
      ]);
      const pData = (await pRes.json()) as { provider?: ManoProvider };
      const rData = (await rRes.json()) as { requests?: ManoServiceRequest[] };
      setProvider(pData.provider ?? null);
      setRequests(rData.requests ?? []);
      setLoading(false);
    }
    void load();
  }, [providerId]);

  async function submitQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/mano/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest,
          providerId,
          amountMxn: Number(amount),
          message: message.trim(),
        }),
      });
      if (!res.ok) throw new Error("Error");
      const data = (await res.json()) as { quote: ManoQuote };
      setQuotes((prev) => [...prev, data.quote]);
      setSelectedRequest(null);
      setAmount("");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="p-8 text-center text-mano-muted">Cargando panel…</p>;
  }

  if (!provider) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <p className="text-mano-muted">Profesional no encontrado.</p>
        <Link href="/mano/profesional" className="mt-4 inline-block text-mano-primary">
          Registrarse
        </Link>
      </div>
    );
  }

  const openForProvider = requests.filter(
    (r) => provider.categories.includes(r.category) && ["abierta", "con_ofertas"].includes(r.status),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-mano-ink">Panel profesional</h1>
      <p className="mt-1 text-mano-muted">Hola, {provider.name}</p>

      <div className="mt-6 rounded-2xl border border-mano-border bg-white p-5">
        <p className="text-sm text-mano-muted">
          ★ {provider.rating.toFixed(1)} · {provider.jobsCompleted} trabajos ·{" "}
          {provider.verified ? "Verificado" : "Pendiente verificación"}
        </p>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Solicitudes abiertas en tu zona</h2>
      {openForProvider.length === 0 ? (
        <p className="mt-4 text-sm text-mano-muted">No hay solicitudes nuevas por ahora.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {openForProvider.map((req) => {
            const cat = getCategory(req.category);
            return (
              <li
                key={req.id}
                className="rounded-xl border border-mano-border bg-white p-4"
              >
                <p className="text-xs text-mano-muted">
                  {cat.nameShort} · {req.colonia} · {req.urgency}
                </p>
                <p className="font-medium text-mano-ink">{req.title}</p>
                <p className="mt-1 text-sm text-mano-muted line-clamp-2">{req.description}</p>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(req.id)}
                  className="mt-3 text-sm font-semibold text-mano-primary"
                >
                  Enviar cotización →
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selectedRequest && (
        <form
          onSubmit={submitQuote}
          className="mt-8 rounded-2xl border border-mano-primary/30 bg-mano-primary/5 p-5"
        >
          <h3 className="font-semibold text-mano-ink">Tu cotización</h3>
          <label className="mt-4 block">
            <span className="text-sm font-medium">Precio (MXN)</span>
            <input
              required
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-mano-border px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-sm font-medium">Mensaje al cliente</span>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full rounded-xl border border-mano-border px-3 py-2 text-sm"
            />
          </label>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedRequest(null)}
              className="rounded-xl border border-mano-border px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-mano-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Enviando…" : "Enviar cotización"}
            </button>
          </div>
        </form>
      )}

      {quotes.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Cotizaciones enviadas</h2>
          <ul className="mt-3 space-y-2">
            {quotes.map((q) => (
              <li key={q.id} className="rounded-lg bg-mano-surface px-3 py-2 text-sm">
                ${q.amountMxn.toLocaleString("es-MX")} MXN — {q.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
