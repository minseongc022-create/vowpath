import { siteAbout } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";

export function About() {
  const a = siteAbout;

  return (
    <section id={a.id} className="vow-site-section border-y border-white/[0.06] bg-white/[0.02] py-20 sm:py-24">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex rounded-full border border-teal-300/30 bg-teal-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-teal-200">
            {a.badge}
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl text-balance">
            {a.title}
          </h2>
          <p className="mt-4 text-lg text-teal-100/90">{a.subtitle}</p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-400">
          {a.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
          {a.pillars.map((pillar) => (
            <article key={pillar.label} className="vow-site-card border-l-4 border-l-teal-400 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-200">
                {pillar.label}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{pillar.meaning}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
