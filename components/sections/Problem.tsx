import { problem } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Problem() {
  return (
    <section className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading title={problem.title} subtitle={problem.subtitle} />
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {problem.stats.map((stat) => (
            <div key={stat.label} className="vow-site-card p-6">
              <p className="text-3xl font-bold tracking-tight text-violet-300">{stat.value}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
        <p className="vow-site-callout mt-8">{problem.callout}</p>
      </Container>
    </section>
  );
}
