"use client";

import { useSiteContent } from "@/components/providers/LocaleProvider";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function LandingQuickQA() {
  const { quickFaq } = useSiteContent();

  return (
    <section id={quickFaq.id} className="vow-site-section border-b border-brand-200/50 bg-white py-10 sm:py-14">
      <Container>
        <SectionHeading label={quickFaq.label} title={quickFaq.title} subtitle={quickFaq.subtitle} align="center" />

        <div className="mx-auto mt-6 grid max-w-5xl gap-3 sm:mt-8 sm:grid-cols-2">
          {quickFaq.items.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-brand-200 bg-brand-50/40 px-5 py-4 open:bg-white open:shadow-sm"
            >
              <summary className="flex min-h-[44px] cursor-pointer list-none items-start justify-between gap-3 text-left text-sm font-bold text-brand-950 sm:text-base [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-300/50 bg-white text-brand-800 transition group-open:rotate-45 group-open:bg-brand-600 group-open:text-white">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-stone-700">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
