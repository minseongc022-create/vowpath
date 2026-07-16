import { siteCompetitorWin } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function WhyWeWin({ content = siteCompetitorWin }: { content?: typeof siteCompetitorWin }) {
  const c = content;

  return (
    <section id={c.id} className="vow-site-section bg-gradient-to-b from-brand-50/40 to-white py-20 sm:py-24">
      <Container>
        <SectionHeading label={c.label} title={c.title} subtitle={c.subtitle} />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.pillars.map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-base font-bold text-brand-900">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{pillar.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {c.competitors.map((comp) => (
            <article
              key={comp.name}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-bold text-slate-900">{comp.name}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
                What reviews flag
              </p>
              <ul className="mt-3 space-y-2">
                {comp.pains.map((pain) => (
                  <li key={pain} className="flex gap-2 text-sm text-stone-600">
                    <span className="text-rose-500" aria-hidden>
                      ✕
                    </span>
                    <span>{pain}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Effiroad
              </p>
              <p className="mt-2 text-sm leading-relaxed text-emerald-900">{comp.fix}</p>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-stone-500">
          {c.footnote}
        </p>
      </Container>
    </section>
  );
}
