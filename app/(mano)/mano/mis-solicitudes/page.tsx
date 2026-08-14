import Link from "next/link";
import { getCategory } from "@/mano/lib/categories";
import { listQuotes, listRequests } from "@/mano/lib/store";

type Props = { searchParams: Promise<{ id?: string; phone?: string }> };

const STATUS_LABEL: Record<string, string> = {
  abierta: "Abierta",
  con_ofertas: "Con cotizaciones",
  asignada: "Profesional asignado",
  en_progreso: "En progreso",
  completada: "Completada",
  cancelada: "Cancelada",
};

export default async function MisSolicitudesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const requests = await listRequests(sp.phone ? { phone: sp.phone } : undefined);
  const highlightId = sp.id;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-mano-ink">Mis solicitudes</h1>
      <p className="mt-2 text-sm text-mano-muted">
        Estado de tus cotizaciones en Guadalajara.
      </p>

      {requests.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-mano-border p-8 text-center">
          <p className="text-mano-muted">Aún no tienes solicitudes.</p>
          <Link
            href="/mano/solicitar"
            className="mt-4 inline-block text-sm font-semibold text-mano-primary"
          >
            Solicitar servicio →
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {await Promise.all(
            requests.map(async (req) => {
              const quotes = await listQuotes({ requestId: req.id });
              const cat = getCategory(req.category);
              const isNew = req.id === highlightId;
              return (
                <li
                  key={req.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm ${
                    isNew ? "border-mano-accent ring-2 ring-mano-accent/20" : "border-mano-border"
                  }`}
                >
                  {isNew && (
                    <p className="mb-2 text-xs font-semibold uppercase text-mano-accent">
                      ✓ Solicitud enviada
                    </p>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-mano-muted">
                        {cat.icon} {cat.nameShort} · {req.colonia}
                      </p>
                      <h2 className="mt-1 font-semibold text-mano-ink">{req.title}</h2>
                    </div>
                    <span className="shrink-0 rounded-full bg-mano-surface px-2 py-1 text-xs font-medium text-mano-muted">
                      {STATUS_LABEL[req.status] ?? req.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-mano-muted line-clamp-2">{req.description}</p>
                  {quotes.length > 0 && (
                    <div className="mt-4 border-t border-mano-border pt-4">
                      <p className="text-xs font-semibold uppercase text-mano-muted">
                        Cotizaciones ({quotes.length})
                      </p>
                      <ul className="mt-2 space-y-2">
                        {quotes.map((q) => (
                          <li
                            key={q.id}
                            className="flex items-center justify-between rounded-lg bg-mano-surface px-3 py-2 text-sm"
                          >
                            <span>${q.amountMxn.toLocaleString("es-MX")} MXN</span>
                            <span className="text-mano-muted">{q.status}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            }),
          )}
        </ul>
      )}
    </div>
  );
}
