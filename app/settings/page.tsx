import { Suspense } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { SettingsView } from "@/components/settings/SettingsView";
import { Container } from "@/components/ui/Container";
import { settingsPage } from "@/lib/content";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; section?: string }>;
}) {
  const params = await searchParams;
  const paid = Boolean(params.session_id);

  return (
    <div className="hvac-app-shell">
      <AppHeader
        activeNav="settings"
        badge={paid ? settingsPage.paidBadge : settingsPage.badge}
        badgeTone={paid ? "success" : "warning"}
      />
      <Container className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          <h1 className="text-2xl font-bold text-brand-950 sm:text-3xl">
            {settingsPage.title}
          </h1>
          <p className="mt-2 text-slate-600">{settingsPage.subtitle}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-brand-600">
            Residential HVAC · Jobber · 콜 포워딩
          </p>
          <div className="mt-8">
            <Suspense fallback={null}>
              <SettingsView paid={paid} />
            </Suspense>
          </div>
        </div>
      </Container>
    </div>
  );
}
