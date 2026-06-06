import { howItWorks } from "@/lib/content";
import { SECTION_LABELS } from "@/lib/constants";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading
          label={SECTION_LABELS.process}
          title={howItWorks.title}
          subtitle={howItWorks.subtitle}
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {howItWorks.steps.map((step) => (
            <article key={step.step} className="vow-site-card relative p-6">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
                {step.step.replace(/\D/g, "") || step.step}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
