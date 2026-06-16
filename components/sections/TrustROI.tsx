import { Container } from "@/components/ui/Container";
import { siteTrustRoi } from "@/lib/site-content";

export function TrustROI() {
  const t = siteTrustRoi;

  return (
    <section className="vow-site-section border-y border-white/[0.06] bg-white/[0.02] py-20 sm:py-24">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t.title}
          </h2>
          <p className="mt-3 text-slate-400">{t.subtitle}</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {t.rows.map((row) => (
            <div key={row.label} className="vow-site-card p-6 text-center">
              <p className="text-3xl font-bold text-amber-300">{row.value}</p>
              <p className="mt-2 text-sm font-medium text-white">{row.label}</p>
              <p className="mt-1 text-xs text-slate-500">{row.hint}</p>
            </div>
          ))}
        </div>
        {t.footnote?.trim() ? (
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-slate-400">
            {t.footnote}
          </p>
        ) : null}
      </Container>
    </section>
  );
}
