import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ROUTES } from "@/lib/constants";
import { getSession } from "@/lib/session";
import { Container } from "@/components/ui/Container";

type AppHeaderProps = {
  badge?: string;
  badgeTone?: "default" | "success" | "warning";
  activeNav?: "dashboard" | "analytics" | "settings";
};

const badgeStyles = {
  default: "bg-brand-100 text-brand-800",
  success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  warning: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
};

export async function AppHeader({
  badge,
  badgeTone = "default",
  activeNav,
}: AppHeaderProps) {
  const session = await getSession();

  return (
    <header className="vow-site-header">
      <Container className="flex h-16 items-center justify-between">
        <BrandLogo placement="auth-header" href={ROUTES.dashboard} />
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <span className="hidden max-w-[160px] truncate text-sm text-slate-300 sm:inline">
                {session.shopName}
              </span>
              <Link
                href={ROUTES.dashboard}
                className={`hidden text-sm sm:inline ${
                  activeNav === "dashboard"
                    ? "font-semibold text-white"
                    : "text-slate-300 hover:text-brand-200"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href={ROUTES.missedCallsAnalytics}
                className={`hidden text-sm sm:inline ${
                  activeNav === "analytics"
                    ? "font-semibold text-white"
                    : "text-slate-300 hover:text-brand-200"
                }`}
              >
                Missed call analytics
              </Link>
              <Link
                href={ROUTES.settings}
                className={`hidden text-sm sm:inline ${
                  activeNav === "settings"
                    ? "font-semibold text-white"
                    : "text-slate-300 hover:text-brand-200"
                }`}
              >
                Settings
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link
              href={ROUTES.login}
              className="text-sm font-medium text-slate-300 hover:text-brand-200"
            >
              Sign in
            </Link>
          )}
          {badge ? (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeStyles[badgeTone]}`}
            >
              {badge}
            </span>
          ) : null}
        </div>
      </Container>
    </header>
  );
}
