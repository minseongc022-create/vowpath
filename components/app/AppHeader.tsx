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

const navLink =
  "inline-flex min-h-[44px] items-center text-sm font-medium text-stone-700 transition hover:text-brand-900";

export async function AppHeader({
  badge,
  badgeTone = "default",
  activeNav,
}: AppHeaderProps) {
  const session = await getSession();

  return (
    <header className="vow-site-header">
      <Container className="flex min-h-14 items-center justify-between gap-3 py-2 sm:h-16 sm:py-0">
        <BrandLogo placement="auth-header" href={ROUTES.home} />
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          {session ? (
            <>
              <span className="hidden max-w-[160px] truncate text-sm text-stone-600 sm:inline">
                {session.shopName}
              </span>
              <Link
                href={ROUTES.dashboard}
                className={`hidden sm:inline-flex ${navLink} ${
                  activeNav === "dashboard" ? "font-semibold text-brand-900" : ""
                }`}
              >
                Dashboard
              </Link>
              <Link
                href={ROUTES.missedCallsAnalytics}
                className={`hidden md:inline-flex ${navLink} ${
                  activeNav === "analytics" ? "font-semibold text-brand-900" : ""
                }`}
              >
                Missed calls
              </Link>
              <Link
                href={ROUTES.settings}
                className={`hidden sm:inline-flex ${navLink} ${
                  activeNav === "settings" ? "font-semibold text-brand-900" : ""
                }`}
              >
                Settings
              </Link>
              <LogoutButton className="min-h-[44px] px-2 text-sm text-stone-600 hover:text-brand-900" />
            </>
          ) : (
            <>
              <Link href={ROUTES.login} className={navLink}>
                Sign in
              </Link>
              <Link
                href={ROUTES.signup}
                className="inline-flex min-h-[44px] items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-500"
              >
                Sign up
              </Link>
            </>
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
