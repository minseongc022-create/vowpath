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
    <div className="vow-dash-settings mx-auto max-w-3xl space-y-5 pb-2 lg:max-w-4xl">
      <Link
        href={ROUTES.dashboard}
        className="vow-dash-link hidden min-h-[44px] items-center lg:inline-flex"
      >
        {settingsPage.backDashboardLink}
      </Link>
      <header className="rounded-2xl border border-brand-200/70 bg-white px-4 py-5 shadow-sm sm:px-6">
        <div className="flex gap-3 sm:gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-xl shadow-sm ring-1 ring-brand-200/80 sm:h-14 sm:w-14 sm:text-2xl"
            aria-hidden
          >
            🛠️
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
              {settingsPage.badge}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-brand-950 sm:text-3xl">{settingsPage.title}</h1>
            <p className="mt-2 text-base leading-relaxed text-stone-600 sm:text-lg">
              {settingsPage.subtitle}
            </p>
          </div>
        </div>
      </header>
      <div className="relative space-y-6">
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
