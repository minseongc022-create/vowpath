import type { ManoProvider } from "@/mano/lib/types";
import { getCategory } from "@/mano/lib/categories";

export function ProviderCard({ provider }: { provider: ManoProvider }) {
  return (
    <article className="rounded-2xl border border-mano-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-mano-ink">{provider.name}</h3>
            {provider.verified && (
              <span className="rounded-full bg-mano-primary/10 px-2 py-0.5 text-xs font-medium text-mano-primary">
                Verificado
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-mano-muted line-clamp-2">{provider.bio}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-mano-ink">★ {provider.rating.toFixed(1)}</p>
          <p className="text-xs text-mano-muted">{provider.reviewCount} reseñas</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {provider.categories.slice(0, 3).map((catId) => (
          <span
            key={catId}
            className="rounded-lg bg-mano-surface px-2 py-1 text-xs font-medium text-mano-muted"
          >
            {getCategory(catId).nameShort}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-mano-muted">
        {provider.jobsCompleted} trabajos · {provider.yearsExperience} años exp. ·{" "}
        {provider.colonias.slice(0, 2).join(", ")}
      </p>

      {provider.whatsapp && (
        <a
          href={`https://wa.me/${provider.whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-mano-primary/30 bg-mano-primary/5 py-2 text-sm font-semibold text-mano-primary transition hover:bg-mano-primary/10"
        >
          Contactar por WhatsApp
        </a>
      )}
    </article>
  );
}
