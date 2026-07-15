"use client";

import { useSiteContent } from "@/components/providers/LocaleProvider";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function NumberChoice() {
  const { numberChoice: content } = useSiteContent();

  return (
    <section id="number-choice" className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading title={content.title} subtitle={content.subtitle} align="center" />

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {content.options.map((o) => (
            <article key={o.id} className="vow-site-card flex flex-col p-6 sm:p-7">
              <span className="w-fit rounded-full border border-brand-300 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
                {o.badge}
              </span>
              <h3 className="mt-4 text-xl font-bold text-brand-900">{o.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-stone-700">{o.description}</p>
              <ul className="mt-5 space-y-2">
                {o.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-stone-700">
                    <span className="mt-0.5 text-brand-600" aria-hidden>
                      ✓
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center gap-3 rounded-2xl border border-brand-300/70 bg-brand-50/80 px-6 py-6 text-center sm:flex-row sm:text-left">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-400/30 bg-brand-500/10 text-xl"
            aria-hidden
          >
            🛟
          </span>
          <p className="text-base leading-relaxed text-brand-900">{content.footer}</p>
        </div>
      </Container>
    </section>
  );
}
