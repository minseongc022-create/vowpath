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

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-stone-500">
          {c.footnote}
        </p>
      </Container>
    </section>
  );
}
