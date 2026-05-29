import { signupFlow } from "@/lib/content";
import { SECTION_LABELS } from "@/lib/constants";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function SignupFlow() {
  return (
    <section id="get-started" className="hvac-section-alt py-20 sm:py-24">
      <Container>
        <SectionHeading
          label={SECTION_LABELS.signup}
          title={signupFlow.title}
          subtitle={signupFlow.subtitle}
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {signupFlow.steps.map((s) => (
            <article
              key={s.step}
              className="hvac-card relative border-t-4 border-t-brand-500 bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-brand-600">{s.step}</span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {s.time}
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-brand-950">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {s.description}
              </p>
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
