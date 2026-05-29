import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export function BetaBanner() {
  return (
    <div className="border-b border-brand-700/30 bg-brand-900 px-4 py-2 text-center text-sm text-brand-100">
      <span className="font-semibold text-white">퍼블릭 베타</span>
      <span className="mx-2 text-brand-300">·</span>
      미국 HVAC(Jobber) — 통화 메모 붙여넣기 → 배차용 Job Card
      <Link
        href={ROUTES.signup}
        className="ml-2 font-semibold text-brand-200 underline underline-offset-2 hover:text-white"
      >
        무료 시작
      </Link>
    </div>
  );
}
