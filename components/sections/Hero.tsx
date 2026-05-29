import Image from "next/image";
import { hero } from "@/lib/content";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

const TRUST_PILLS = [
  "Residential HVAC 전용",
  "Jobber 연동",
  "야간·주말 콜",
  "긴급(P1) 즉시 알림",
] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hvac-gradient text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-hvac-airflow opacity-60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-brand-400/15 blur-3xl"
        aria-hidden
      />

      <Container className="relative py-16 sm:py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="text-center lg:text-left">
            <p className="hvac-badge-dark mx-auto lg:mx-0">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-300" aria-hidden />
              미국 residential HVAC · Jobber
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1] text-balance">
              {hero.headline}{" "}
              <span className="hvac-text-gradient">{hero.headlineAccent}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-brand-100 lg:mx-0">
              {hero.subhead}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <CheckoutButton size="lg" directCheckout />
              <Button
                href="/#differentiators"
                variant="secondary"
                size="lg"
                className="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20"
              >
                {hero.secondaryCta}
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-2 lg:justify-start">
              {TRUST_PILLS.map((pill) => (
                <li key={pill} className="hvac-badge-dark">
                  {pill}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-brand-200/90">{hero.note}</p>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative rounded-3xl border border-white/15 bg-white/5 p-8 shadow-glow backdrop-blur-md">
              <div className="flex flex-col items-center">
                <Image
                  src="/logo.png"
                  alt="Vowpath"
                  width={200}
                  height={200}
                  className="h-40 w-40 object-contain drop-shadow-lg sm:h-48 sm:w-48"
                  priority
                />
              </div>
              <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-brand-950/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-red-500/90 px-2 py-0.5 text-xs font-bold text-white">
                    긴급
                  </span>
                  <span className="text-xs text-brand-200">야간·주말 콜</span>
                </div>
                <p className="text-sm font-semibold text-white">난방 안 됨 · 주거용</p>
                <p className="text-xs text-brand-200">
                  AI 분류 → Jobber Request · 디스패처 SMS
                </p>
                <div className="flex items-center gap-2 border-t border-white/10 pt-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600/80 text-xs font-bold">
                    J
                  </span>
                  <span className="text-xs text-brand-100">Jobber Job Card 준비됨</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
