import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

/** Secondary strip — phone answering stays the hero; quote/chase are included utilities. */
export function QuoteChaseSpotlight() {
  return (
    <section
      id="quote-chase"
      className="border-y border-brand-100 bg-brand-50/80 py-8 sm:py-10"
    >
      <Container>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
              Included with every plan
            </p>
            <h2 className="mt-1 text-lg font-semibold text-brand-950 sm:text-xl">
              On-site quotes &amp; estimate follow-up
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
              After the phone does its job: build a quick estimate from the truck and optional 48h / 7d / 14d
              SMS nudges. Not a separate product — just built in.
            </p>
          </div>
          <Link
            href={ROUTES.quoteLanding}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-brand-300 bg-white px-5 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50"
          >
            How quotes work
          </Link>
        </div>
      </Container>
    </section>
  );
}
