import { siteProductStack } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const tierStyles = {
  core: "border-brand-400/40 ring-1 ring-brand-400/20",
  sub: "border-brand-200/80",
} as const;

export function ProductStack({ content = siteProductStack }: { content?: typeof siteProductStack }) {
  const s = content;

  return (
    <section id={s.id} className="vow-site-section py-16 sm:py-20">
      <Container>
        <SectionHeading label={s.label} title={s.title} subtitle={s.subtitle} align="center" />

        <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
          {s.layers.map((layer) => (
            <article
              key={layer.id}
              className={`vow-site-card relative flex flex-col p-6 ${tierStyles[layer.tier]}`}
            >
              {layer.badge ? (
                <span className="absolute -top-3 left-5 rounded-full bg-brand-700 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {layer.badge}
                </span>
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                {layer.label}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-brand-900">{layer.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-stone-700">
                {layer.description}
              </p>
              <ul className="mt-4 space-y-2 border-t border-brand-200/80 pt-4">
                {layer.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-stone-800">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                      aria-hidden
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-stone-600">{s.footnote}</p>
      </Container>
    </section>
  );
}
