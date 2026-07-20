"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { useVowDashboard } from "@/components/providers/LocaleProvider";

export function DashboardViewLandingFooter() {
  const { upgrade } = useVowDashboard();

  return (
    <footer className="mt-6 border-t border-brand-200/60 pt-4 pb-2 text-center lg:mt-8">
      <Link
        href={ROUTES.site}
        className="text-xs font-medium text-stone-500 underline-offset-2 hover:text-stone-700 hover:underline"
      >
        {upgrade.viewLanding}
      </Link>
    </footer>
  );
}
