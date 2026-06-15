import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export function BetaBanner() {
  return (
    <div className="border-b border-brand-700/30 bg-brand-900 px-4 py-2 text-center text-sm text-brand-100">
      <span className="font-semibold text-white">Public beta</span>
      <span className="mx-2 text-brand-300">·</span>
      US HVAC (Jobber) — paste call notes into dispatch-ready Job Cards
      <Link
        href={ROUTES.signup}
        className="ml-2 font-semibold text-brand-200 underline underline-offset-2 hover:text-white"
      >
        Start free
      </Link>
    </div>
  );
}
