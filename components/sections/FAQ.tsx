import { siteFaq } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function FAQ() {
  return (
    <section id="faq" className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading title={siteFaq.title} align="center" />
        <div className="vow-site-panel mx-auto mt-12 max-w-2xl divide-y divide-white/[0.08]">
          {siteFaq.items.map((item) => (
            <details key={item.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-teal-500/10 text-teal-100 transition group-open:rotate-45 group-open:border-teal-300/40 group-open:bg-teal-500 group-open:text-slate-950">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
