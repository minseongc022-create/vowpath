"use client";

import { useLocale, useSiteContent } from "@/components/providers/LocaleProvider";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function HowItWorks() {
  const { locale } = useLocale();
  const { howItWorks } = useSiteContent();
  const processLabel = locale === "es" ? "Proceso" : "Process";

  return (
    <section id="how-it-works" className="vow-site-section py-12 sm:py-16">
      <Container>
        <SectionHeading
          label={processLabel}
          title={howItWorks.title}
          subtitle={howItWorks.subtitle}
        />
        <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:grid-cols-3">
          {howItWorks.steps.map((step) => (
            <article key={step.step} className="vow-site-card relative p-5 sm:p-6">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-slate-950">
                {step.step.replace(/\D/g, "") || step.step}
              </span>
              <h3 className="mt-3 text-base font-semibold text-brand-900 sm:mt-4 sm:text-lg">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{step.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
