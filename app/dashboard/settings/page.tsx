import { Suspense } from "react";
import Link from "next/link";
import { SettingsView } from "@/components/settings/SettingsView";
import { ROUTES } from "@/lib/constants";
import { settingsPage } from "@/lib/content";

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ transaction_id?: string; section?: string }>;
}) {
  const params = await searchParams;
  const transactionId = params.transaction_id?.trim();

  return (
    <div className="vow-dash-settings mx-auto w-full max-w-4xl space-y-3 pb-2 sm:space-y-5">
      <Link
        href={ROUTES.dashboard}
        className="vow-dash-link hidden min-h-[44px] items-center lg:inline-flex"
      >
        {settingsPage.backDashboardLink}
      </Link>
      <header className="rounded-2xl border border-brand-200/70 bg-white px-3 py-3 shadow-sm sm:px-6 sm:py-5">
        <div className="flex gap-2.5 sm:gap-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg shadow-sm ring-1 ring-brand-200/80 sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl"
            aria-hidden
          >
            🛠️
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 sm:text-sm">
              {settingsPage.badge}
            </p>
            <h1 className="mt-0.5 text-xl font-bold text-brand-950 sm:mt-1 sm:text-3xl">{settingsPage.title}</h1>
            <p className="mt-1 text-sm leading-snug text-stone-600 sm:mt-2 sm:text-lg sm:leading-relaxed">
              {settingsPage.subtitle}
            </p>
          </div>
        </div>
      </header>
      <div className="relative space-y-4 sm:space-y-6">
        <Suspense fallback={null}>
          <SettingsView
            paid={Boolean(transactionId)}
            transactionId={transactionId}
            section={params.section?.trim()}
          />
        </Suspense>
      </div>
    </div>
  );
}
