import { Suspense } from "react";
import Link from "next/link";
import { SettingsView } from "@/components/settings/SettingsView";
import { ROUTES } from "@/lib/constants";
import { settingsPage } from "@/lib/content";

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; section?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id?.trim();

  return (
    <div className="vow-dash-settings mx-auto max-w-3xl space-y-5 pb-2 lg:max-w-4xl">
      <Link
        href={ROUTES.dashboard}
        className="vow-dash-link hidden min-h-[44px] items-center lg:inline-flex"
      >
        {settingsPage.backDashboardLink}
      </Link>
      <header className="rounded-2xl border border-brand-200/70 bg-white px-4 py-5 shadow-sm sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
          {settingsPage.badge}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-brand-950 sm:text-3xl">{settingsPage.title}</h1>
        <p className="mt-2 text-base leading-relaxed text-stone-600 sm:text-lg">
          {settingsPage.subtitle}
        </p>
      </header>
      <div className="relative space-y-6">
        <Suspense fallback={null}>
          <SettingsView paid={Boolean(sessionId)} sessionId={sessionId} />
        </Suspense>
      </div>
    </div>
  );
}
