import { siteSignupFlow } from "@/lib/site-content";
import { SECTION_LABELS } from "@/lib/constants";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function SignupFlow() {
  return (
    <section id="get-started" className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading
          label={SECTION_LABELS.signup}
          title={siteSignupFlow.title}
          subtitle={siteSignupFlow.subtitle}
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {siteSignupFlow.steps.map((s) => (
            <article
              key={s.step}
              className="vow-site-card relative border-t-4 border-t-violet-500 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-violet-300">{s.step}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs font-medium text-brand-200">
                  {s.time}
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.description}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <CheckoutButton size="lg" directCheckout />
        </div>
      </Container>
    </section>
  );
}
