import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ROUTES } from "@/lib/constants";
import { getSession } from "@/lib/session";
import { Container } from "@/components/ui/Container";

type AppHeaderProps = {
  badge?: string;
  badgeTone?: "default" | "success" | "warning";
  activeNav?: "dashboard" | "settings";
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
    <header className="border-b border-surface-border bg-white/95 shadow-nav backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <BrandLogo />
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <span className="hidden max-w-[160px] truncate text-sm text-brand-700 sm:inline">
                {session.shopName}
              </span>
              <Link
                href={ROUTES.dashboard}
                className={`hidden text-sm sm:inline ${
                  activeNav === "dashboard"
                    ? "font-semibold text-brand-950"
                    : "text-brand-700 hover:text-brand-600"
                }`}
              >
                대시보드
              </Link>
              <Link
                href={ROUTES.settings}
                className={`hidden text-sm sm:inline ${
                  activeNav === "settings"
                    ? "font-semibold text-brand-950"
                    : "text-brand-700 hover:text-brand-600"
                }`}
              >
                연동 설정
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link
              href={ROUTES.login}
              className="text-sm font-medium text-brand-700 hover:text-brand-600"
            >
              로그인
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
