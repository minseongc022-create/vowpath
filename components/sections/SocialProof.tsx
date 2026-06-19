import { siteSocialProof } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";

export function SocialProof() {
  const s = siteSocialProof;
  const testimonials =
    "testimonials" in s && Array.isArray(s.testimonials) ? s.testimonials : [];

  return (
    <section className="vow-site-section py-16 sm:py-20">
      <Container>
        <h2 className="text-center text-2xl font-bold text-brand-900">{s.title}</h2>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {s.items.map((item) => (
            <div key={item.label} className="vow-site-card p-5 text-center">
              <p className="text-2xl font-bold text-brand-700">{item.stat}</p>
              <p className="mt-1 text-xs text-stone-700">{item.label}</p>
            </div>
          ))}
        </div>
        {testimonials.length > 0 ? (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="vow-site-card p-6">
                <blockquote className="text-sm leading-relaxed text-stone-800">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4">
                  <p className="text-sm font-semibold text-brand-900">{t.name}</p>
                  <p className="text-xs text-stone-600">{t.detail}</p>
                  {"label" in t && t.label ? (
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-stone-500">
                      {t.label}
                    </p>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}
        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {s.badges.map((badge) => (
            <li key={badge} className="hvac-badge-dark text-xs">
              {badge}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
