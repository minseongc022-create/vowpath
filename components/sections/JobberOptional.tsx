import { siteJobber } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function JobberOptional({ content = siteJobber }: { content?: typeof siteJobber }) {
  return (
    <section id={content.id} className="vow-site-section py-16 sm:py-20">
      <Container>
        <SectionHeading
          label={content.label}
          title={content.title}
          subtitle={content.subtitle}
          align="center"
        />
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {content.points.map((point) => (
            <article key={point.title} className="vow-site-card p-5">
              <h3 className="text-sm font-semibold text-brand-950">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{point.description}</p>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-stone-600">{content.footnote}</p>
      </Container>
    </section>
  );
}
