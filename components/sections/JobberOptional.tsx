import { siteJobber } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function JobberOptional() {
  const j = siteJobber;

  return (
    <section id={j.id} className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading label={j.label} title={j.title} subtitle={j.subtitle} />

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {j.points.map((point) => (
            <article key={point.title} className="vow-site-card p-5">
              <h3 className="font-semibold text-brand-900">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{point.description}</p>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-500">{j.footnote}</p>
      </Container>
    </section>
  );
}
