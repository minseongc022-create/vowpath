import { problem } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Problem() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <SectionHeading title={problem.title} subtitle={problem.subtitle} />
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {problem.stats.map((stat) => (
            <div key={stat.label} className="hvac-card p-6">
              <p className="text-3xl font-bold tracking-tight text-brand-700">
                {stat.value}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-8 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white px-5 py-4 text-sm font-medium text-brand-900">
          {problem.callout}
        </p>
      </Container>
    </section>
  );
}
