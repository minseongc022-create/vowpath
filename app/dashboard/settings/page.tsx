import { Suspense } from "react";
import Link from "next/link";
import { MessagingSetup } from "@/components/settings/MessagingSetup";
import { SettingsView } from "@/components/settings/SettingsView";
import { ROUTES } from "@/lib/constants";
import { settingsPage } from "@/lib/content";

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; section?: string }>;
}) {
  const params = await searchParams;
  const paid = Boolean(params.session_id);

  return (
    <div className="vow-dash-settings mx-auto max-w-3xl space-y-6 lg:max-w-4xl">
      <Link href={ROUTES.dashboard} className="vow-dash-link text-sm">
        ← 대시보드로
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{settingsPage.title}</h1>
        <p className="mt-2 text-sm text-slate-400">{settingsPage.subtitle}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-600">
          Residential HVAC · Jobber · 콜 포워딩
        </p>
      </header>
      <div className="vow-dash-card space-y-6 !p-5 sm:!p-6">
        <MessagingSetup />
        <Suspense fallback={null}>
          <SettingsView paid={paid} />
        </Suspense>
      </div>
    </div>
  );
}
