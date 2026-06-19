import { siteRevenueLeaks } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function RevenueLeaks() {
  const s = siteRevenueLeaks;

  return (
    <section id={s.id} className="vow-site-section border-y border-brand-200/80 bg-brand-50 py-20 sm:py-24">
      <Container>
        <SectionHeading label={s.label} title={s.title} subtitle={s.subtitle} align="center" />

        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {s.items.map((item) => (
            <article key={item.leak} className="vow-site-card flex flex-col p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warm-500">
                {item.leak}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-brand-900">{item.feature}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-stone-700">
                {item.result}
              </p>
              <p className="mt-5 rounded-xl border border-brand-400/15 bg-brand-500/10 px-3 py-2 text-sm font-semibold text-brand-700">
                {item.money}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
