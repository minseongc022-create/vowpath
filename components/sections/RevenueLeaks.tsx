import { siteRevenueLeaks } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function RevenueLeaks() {
  const s = siteRevenueLeaks;

  return (
    <section id={s.id} className="vow-site-section border-y border-white/[0.06] bg-white/[0.02] py-20 sm:py-24">
      <Container>
        <SectionHeading label={s.label} title={s.title} subtitle={s.subtitle} align="center" />

        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {s.items.map((item) => (
            <article key={item.leak} className="vow-site-card flex flex-col p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                {item.leak}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-white">{item.feature}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
                {item.result}
              </p>
              <p className="mt-5 rounded-xl border border-teal-400/15 bg-teal-500/10 px-3 py-2 text-sm font-semibold text-teal-200">
                {item.money}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
