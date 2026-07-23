import { siteDifferentiators } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Differentiators({
  content = siteDifferentiators,
}: {
  content?: typeof siteDifferentiators;
}) {
  return (
    <section id={content.id ?? "differentiators"} className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading title={content.title} subtitle={content.subtitle} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {content.items.map((item) => (
            <article key={item.title} className="vow-site-card p-6">
              <h3 className="text-base font-semibold text-brand-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{item.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
