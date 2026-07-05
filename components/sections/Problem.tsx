import { siteProblem } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Problem({ content = siteProblem }: { content?: typeof siteProblem }) {
  const id = "id" in content && content.id ? content.id : "problem";

  return (
    <section id={id} className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading title={content.title} subtitle={content.subtitle} />
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {content.stats.map((stat) => (
            <div key={stat.label} className="vow-site-card p-6">
              <p className="text-3xl font-bold tracking-tight text-warm-500">{stat.value}</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{stat.label}</p>
            </div>
          ))}
        </div>
        <p className="vow-site-callout mt-8">{content.callout}</p>
      </Container>
    </section>
  );
}
