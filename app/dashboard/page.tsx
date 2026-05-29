import { DashboardView } from "@/components/dashboard/DashboardView";
import { AppHeader } from "@/components/app/AppHeader";
import { dashboardPage } from "@/lib/content";
import { getSession } from "@/lib/session";
import { Container } from "@/components/ui/Container";

export default async function DashboardPage() {
  const session = await getSession();

  return (
    <div className="hvac-app-shell">
      <AppHeader badge="대시보드" activeNav="dashboard" />
      <Container className="py-10 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-brand-950 sm:text-3xl">
            {dashboardPage.title}
          </h1>
          <p className="mt-2 text-slate-600">
            {session?.shopName ? `${session.shopName} · ` : ""}
            {dashboardPage.subtitle}
          </p>
          <div className="mt-8">
            <DashboardView />
          </div>
        </div>
      </Container>
    </div>
  );
}
