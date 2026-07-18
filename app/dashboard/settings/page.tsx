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
    <div className="vow-dash-settings mx-auto w-full max-w-none pb-2 lg:max-w-4xl">
      <Link
        href={ROUTES.dashboard}
        className="vow-dash-link mb-3 hidden min-h-[44px] items-center lg:inline-flex"
      >
        {settingsPage.backDashboardLink}
      </Link>

      <Suspense fallback={null}>
        <SettingsView
          paid={Boolean(transactionId)}
          transactionId={transactionId}
          section={params.section?.trim()}
        />
      </Suspense>
    </div>
  );
}
