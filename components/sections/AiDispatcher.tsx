import { siteAiDispatcher } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function AiDispatcher() {
  const s = siteAiDispatcher;

  return (
    <section
      id={s.id}
      className="vow-site-section border-y border-white/[0.06] bg-white/[0.02] py-20 sm:py-24"
    >
      <Container>
        <SectionHeading label={s.label} title={s.title} subtitle={s.subtitle} align="center" />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {s.cards.map((card) => (
            <article key={card.title} className="vow-site-card flex flex-col p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-200">
                {card.title}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{card.description}</p>
              <ul className="mt-4 flex-1 space-y-2 border-t border-white/[0.06] pt-4">
                {card.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
