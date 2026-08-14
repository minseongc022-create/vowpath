import { ProviderCard } from "@/mano/components/ProviderCard";
import { MANO_CATEGORIES } from "@/mano/lib/categories";
import { listProviders } from "@/mano/lib/store";

type Props = { searchParams: Promise<{ categoria?: string }> };

export default async function ProfesionalesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const providers = await listProviders(
    sp.categoria ? { category: sp.categoria } : undefined,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-mano-ink">Profesionales en Guadalajara</h1>
      <p className="mt-2 text-sm text-mano-muted">
        {providers.length} profesionales disponibles
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <a
          href="/mano/profesionales"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            !sp.categoria ? "bg-mano-primary text-white" : "bg-mano-surface text-mano-muted"
          }`}
        >
          Todos
        </a>
        {MANO_CATEGORIES.map((c) => (
          <a
            key={c.id}
            href={`/mano/profesionales?categoria=${c.id}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              sp.categoria === c.id
                ? "bg-mano-primary text-white"
                : "bg-mano-surface text-mano-muted"
            }`}
          >
            {c.nameShort}
          </a>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => (
          <ProviderCard key={p.id} provider={p} />
        ))}
      </div>
    </div>
  );
}
