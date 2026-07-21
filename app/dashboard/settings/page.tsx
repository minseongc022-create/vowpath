import { SettingsView } from "@/components/settings/SettingsView";
import { AppPage } from "@/components/ui/AppPage";
import { Suspense } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { getSettingsPageCopy } from "@/lib/content";
import { resolveServerUiLocale } from "@/lib/locale";

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    transaction_id?: string;
    checkout?: string;
    plan?: string;
    subscription_id?: string;
    section?: string;
  }>;
}) {
  const params = await searchParams;
  const checkoutSuccess =
    params.checkout === "success" || Boolean(params.transaction_id?.trim());
  const planHint = params.plan?.trim();
  const subscriptionId = params.subscription_id?.trim();
  const locale = await resolveServerUiLocale();
  const settingsPage = getSettingsPageCopy(locale);

  return (
    <AppPage width="fluid" className="vow-dash-settings pb-2">
      <Link
        href={ROUTES.dashboard}
        className="vow-dash-link mb-3 hidden min-h-[44px] items-center lg:inline-flex"
      >
        {settingsPage.backDashboardLink}
      </Link>

      <Suspense fallback={null}>
        <SettingsView
          paid={checkoutSuccess}
          checkoutSuccess={checkoutSuccess}
          planHint={planHint}
          subscriptionId={subscriptionId}
          section={params.section?.trim()}
        />
      </Suspense>
    </AppPage>
  );
}
