"use client";

import { useSiteContent } from "@/components/providers/LocaleProvider";
import { siteSocialProof } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";

type SocialProofContent = typeof siteSocialProof;

type SocialProofProps = {
  variant?: "trust" | "default";
  content?: SocialProofContent;
};

export function SocialProof({ variant = "default", content }: SocialProofProps) {
  const { socialProof: localized } = useSiteContent();
  const s = content ?? localized;
  const testimonials = "testimonials" in s && Array.isArray(s.testimonials) ? s.testimonials : [];

  if (variant === "trust") {
    return (
      <section id="trust" className="border-b border-brand-200/70 bg-brand-50/90 py-8 sm:py-10">
        <Container>
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-brand-700">{s.title}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {s.items.map((item) => (
              <div key={item.label} className="vow-site-card px-3 py-4 text-center sm:p-5">
                <p className="text-xl font-bold text-brand-700 sm:text-2xl">{item.stat}</p>
                <p className="mt-1 text-[11px] leading-snug text-stone-700 sm:text-xs">{item.label}</p>
              </div>
            ))}
          </div>
          <ul className="mt-5 flex flex-wrap justify-center gap-2">
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

  return (
    <section id="social-proof" className="vow-site-section py-20 sm:py-24">
      <Container>
        <h2 className="text-center text-2xl font-bold tracking-tight text-brand-900 sm:text-3xl">{s.title}</h2>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {s.items.map((item) => (
            <div key={item.label} className="vow-site-card p-5 text-center sm:p-6">
              <p className="text-2xl font-bold text-brand-700 sm:text-3xl">{item.stat}</p>
              <p className="mt-1 text-xs text-stone-700 sm:text-sm">{item.label}</p>
            </div>
          ))}
        </div>
        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {s.badges.map((badge) => (
            <li key={badge} className="hvac-badge-dark">
              {badge}
            </li>
          ))}
        </ul>
        {testimonials.length > 0 ? (
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {testimonials.map((t) => (
              <blockquote key={t.name} className="vow-site-card p-6">
                <p className="text-sm leading-relaxed text-stone-700">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 text-sm font-semibold text-brand-900">
                  {t.name}
                  <span className="mt-0.5 block text-xs font-normal text-stone-600">{t.detail}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        ) : null}
      </Container>
    </section>
  );
}
