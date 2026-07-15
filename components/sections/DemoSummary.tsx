"use client";

import { useSiteContent } from "@/components/providers/LocaleProvider";
import { Container } from "@/components/ui/Container";

export function DemoSummary() {
  const { demoSummary } = useSiteContent();

  return (
    <section className="border-b border-brand-200/40 bg-brand-50 py-14 sm:py-16">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-xl font-bold tracking-tight text-brand-900 sm:text-2xl">{demoSummary.title}</h2>
          <p className="mt-2 text-sm text-stone-600 sm:text-base">{demoSummary.subtitle}</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
          {demoSummary.steps.map((step, i) => (
            <article key={step.title} className="rounded-xl border border-brand-200/80 bg-white p-5 shadow-sm">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-slate-950">
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold text-brand-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{step.body}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
