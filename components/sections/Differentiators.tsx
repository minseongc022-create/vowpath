import { differentiators } from "@/lib/content";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Differentiators() {
  return (
    <section id="differentiators" className="py-20 sm:py-24">
      <Container>
        <SectionHeading
          title={differentiators.title}
          subtitle={differentiators.subtitle}
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {differentiators.items.map((item) => (
            <article
              key={item.title}
              className="hvac-card border-l-4 border-l-brand-500 p-5"
            >
              <h3 className="font-semibold text-brand-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.description}
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
