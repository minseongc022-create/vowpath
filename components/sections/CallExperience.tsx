import { siteCallExperience } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function CallExperience({ content = siteCallExperience }: { content?: typeof siteCallExperience }) {
  const c = content;

  return (
    <section id={c.id} className="vow-site-section bg-gradient-to-b from-white to-brand-50/30 py-20 sm:py-24">
      <Container>
        <SectionHeading label={c.label} title={c.title} subtitle={c.subtitle} />

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {c.points.map((point) => (
            <article
              key={point.title}
              className="rounded-2xl border border-brand-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-bold text-brand-900">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{point.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h3 className="text-center text-lg font-bold text-slate-900">{c.contrast.title}</h3>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Elsewhere</p>
              <ul className="mt-3 space-y-2">
                {c.contrast.theirs.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-stone-600">
                    <span className="text-rose-500" aria-hidden>
                      ✕
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Effiroad</p>
              <ul className="mt-3 space-y-2">
                {c.contrast.ours.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-emerald-900">
                    <span className="text-emerald-600" aria-hidden>
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
