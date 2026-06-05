import dynamic from "next/dynamic";
import { HeroFlowSkeleton } from "@/components/brand/HeroFlowSkeleton";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

const HeroFlowVisual = dynamic(
  () =>
    import("@/components/brand/HeroFlowVisual").then((m) => ({
      default: m.HeroFlowVisual,
    })),
  { loading: () => <HeroFlowSkeleton /> },
);

const TRUST_PILLS = [
  "메인 번호 그대로",
  "조건부 착신전환",
  "SMS · 1·2 승인",
  "승인 후 Jobber",
] as const;

export function Hero() {
  return (
    <section className="vow-hero relative overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 bg-hvac-airflow opacity-50" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[min(100%,52rem)] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl"
        aria-hidden
      />

      <Container className="relative py-10 sm:py-14 lg:py-20">
        <HeroFlowVisual />

        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <CheckoutButton size="lg" directCheckout />
          <Button
            href="/#how-it-works"
            variant="secondary"
            size="lg"
            className="!border-white/25 !bg-white/10 !text-white hover:!bg-white/15"
          >
            작동 방식 보기
          </Button>
        </div>

        <ul className="mx-auto mt-8 flex max-w-6xl flex-wrap justify-center gap-2">
          {TRUST_PILLS.map((pill) => (
            <li key={pill} className="hvac-badge-dark text-xs">
              {pill}
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-4 max-w-6xl text-center text-sm text-slate-500">
          무료 베타 · 번호 바꾸지 않고 착신전환만 설정
        </p>
      </Container>
    </section>
  );
}
