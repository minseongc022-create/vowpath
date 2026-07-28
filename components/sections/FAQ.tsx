"use client";

import { useSiteContent } from "@/components/providers/LocaleProvider";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function FAQ() {
  const { faq } = useSiteContent();
  return (
    <section id="faq" className="vow-site-section py-12 sm:py-16">
      <Container>
        <SectionHeading title={faq.title} align="center" />
        <div className="vow-site-panel mx-auto mt-8 max-w-2xl divide-y divide-white/[0.08] sm:mt-10">
          {faq.items.map((item) => (
            <details key={item.q} className="group px-4 py-1 sm:px-6 sm:py-4">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 py-2 text-sm font-semibold text-brand-900 sm:text-base [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-brand-500/10 text-brand-800 transition group-open:rotate-45 group-open:border-brand-300/40 group-open:bg-brand-500 group-open:text-slate-950 sm:h-10 sm:w-10">
                  +
                </span>
              </summary>
              <p className="mt-2 pb-2 text-sm leading-relaxed text-stone-700 sm:mt-3">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
