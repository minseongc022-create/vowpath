import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { siteDataTrust } from "@/lib/site-content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function DataTrust() {
  const d = siteDataTrust;

  return (
    <section id={d.id} className="border-y border-brand-200/80 bg-white py-16 sm:py-20">
      <Container>
        <SectionHeading label={d.label} title={d.title} subtitle={d.subtitle} align="center" />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {d.points.map((point) => (
            <article key={point.title} className="vow-site-card p-6">
              <h3 className="text-base font-semibold text-brand-900">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{point.description}</p>
            </article>
          ))}
        </div>

        {d.footnote?.trim() ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-stone-700">
            {d.footnote}{" "}
            <Link href={ROUTES.privacy} className="font-medium text-brand-800 underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        ) : null}
      </Container>
    </section>
  );
}
