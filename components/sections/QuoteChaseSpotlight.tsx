import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export function QuoteChaseSpotlight() {
  return (
    <section
      id="quote-chase"
      className="border-y border-brand-200/80 bg-gradient-to-r from-brand-800 to-brand-700 py-10 text-white sm:py-12"
    >
      <Container>
        <div className="flex flex-col items-center gap-6 text-center lg:flex-row lg:text-left">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-200">New in Effiroad</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Quote on-site. Chase until they book.</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-brand-100 sm:text-base">
              Finish estimates from the truck and stop losing follow-ups in your notes — 48h, 7d, and 14d auto SMS
              built in.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Link
              href={ROUTES.quoteLanding}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50"
            >
              See Quote + Chase
            </Link>
            <Link
              href={ROUTES.signup}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
