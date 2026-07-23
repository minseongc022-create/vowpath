import { siteDataTrust } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";

export function DataTrust({ content = siteDataTrust }: { content?: typeof siteDataTrust }) {
  return (
    <section id={content.id} className="vow-site-section relative overflow-hidden py-16 sm:py-20">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-50/80 via-transparent to-warm-50/40"
        aria-hidden
      />
      <Container className="relative">
        <SectionHeading
          label={content.label}
          title={content.title}
          subtitle={content.subtitle}
          align="center"
        />
        <div className="mx-auto mt-10 grid max-w-5xl gap-6 sm:grid-cols-3">
          {content.points.map((point) => (
            <article key={point.title} className="text-center sm:text-left">
              <h3 className="text-base font-semibold text-brand-950">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{point.description}</p>
            </article>
          ))}
        </div>
        {content.footnote ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-stone-600">
            {content.footnote}{" "}
            <Link href={ROUTES.privacy} className="font-semibold text-brand-800 underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        ) : null}
      </Container>
    </section>
  );
}
