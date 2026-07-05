import { siteAiDispatcher } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function AiDispatcher({ content = siteAiDispatcher }: { content?: typeof siteAiDispatcher }) {
  const s = content;

  return (
    <section
      id={s.id}
      className="vow-site-section border-y border-brand-200/80 bg-brand-50 py-20 sm:py-24"
    >
      <Container>
        <SectionHeading label={s.label} title={s.title} subtitle={s.subtitle} align="center" />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {s.cards.map((card) => (
            <article key={card.title} className="vow-site-card flex flex-col p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                {card.title}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-stone-700">{card.description}</p>
              <ul className="mt-4 flex-1 space-y-2 border-t border-brand-200/80 pt-4">
                {card.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-stone-800">
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
