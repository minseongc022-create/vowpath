import { siteAbout } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";

export function About() {
  const a = siteAbout;

  return (
    <section id={a.id} className="vow-site-section border-y border-brand-200/80 bg-brand-50 py-20 sm:py-24">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex rounded-full border border-brand-300/30 bg-brand-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
            {a.badge}
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl text-balance">
            {a.title}
          </h2>
          <p className="mt-4 text-lg text-brand-800/90">{a.subtitle}</p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-5 text-center text-base leading-relaxed text-stone-700">
          {a.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
          {a.pillars.map((pillar) => (
            <article key={pillar.label} className="vow-site-card border-l-4 border-l-brand-400 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                {pillar.label}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-stone-800">{pillar.meaning}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
