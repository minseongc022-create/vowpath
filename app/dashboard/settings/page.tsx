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
    <div className="vow-dash-settings mx-auto max-w-3xl space-y-6 pb-8 lg:max-w-4xl">
      <Link href={ROUTES.dashboard} className="vow-dash-link">
        {settingsPage.backDashboardLink}
      </Link>
      <header>
        <h1 className="text-3xl font-bold text-brand-950 sm:text-4xl">{settingsPage.title}</h1>
        <p className="mt-3 text-lg text-stone-600">{settingsPage.subtitle}</p>
      </header>
      <div className="vow-dash-card relative space-y-6 !p-5 sm:!p-6">
        <Suspense fallback={null}>
          <SettingsView paid={Boolean(sessionId)} sessionId={sessionId} />
        </Suspense>
      </div>
    </div>
  );
}
