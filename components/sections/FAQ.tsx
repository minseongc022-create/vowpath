import { faq } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-24">
      <Container>
        <SectionHeading title={faq.title} align="center" />
        <div className="mx-auto mt-12 max-w-2xl divide-y divide-surface-border overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card">
          {faq.items.map((item) => (
            <details key={item.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-brand-950 [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition group-open:rotate-45 group-open:bg-brand-600 group-open:text-white">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
