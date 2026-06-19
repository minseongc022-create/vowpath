import { siteAgreementKeeper } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function AgreementKeeper() {
  const a = siteAgreementKeeper;

  return (
    <section id={a.id} className="border-y border-brand-200/80 bg-gradient-to-b from-white to-brand-50/40 py-16 sm:py-20">
      <Container>
        <SectionHeading label={a.label} title={a.title} subtitle={a.subtitle} align="center" />

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {a.steps.map((step, i) => (
            <article key={step.title} className="vow-site-card relative p-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-base font-semibold text-brand-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{step.description}</p>
            </article>
          ))}
        </div>

        <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-2">
          {a.bullets.map((bullet) => (
            <li
              key={bullet}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-sm font-medium text-brand-800"
            >
              <svg className="h-3.5 w-3.5 shrink-0 text-brand-600" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                <path d="M10.28 2.28a.75.75 0 00-1.06-1.06L4.5 6.94 2.78 5.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25z" />
              </svg>
              {bullet}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
