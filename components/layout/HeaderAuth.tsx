"use client";

import Link from "next/link";
import { ROUTES, CHECKOUT_CTA } from "@/lib/constants";
import { CheckoutButton } from "@/components/CheckoutButton";
import { LogoutButton } from "@/components/auth/LogoutButton";

type HeaderAuthProps = {
  session: { email: string; shopName: string } | null;
};

const LABELS = {
  settings: "Settings",
  dashboard: "Dashboard",
  login: "Log in",
  signup: "Sign up",
  logout: "Sign out",
} as const;

const linkClass =
  "inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg px-3 text-sm font-medium transition";

function showShopName(shopName: string): boolean {
  const n = shopName.trim().toLowerCase();
  if (!n) return false;
  if (n === "effiroad") return false;
  return true;
}

export function HeaderAuth({ session }: HeaderAuthProps) {
  if (session) {
    const shopLabel = showShopName(session.shopName) ? session.shopName : null;

    return (
      <nav
        className="flex shrink-0 items-center gap-1 sm:gap-2"
        aria-label="Account"
      >
        <Link
          href={ROUTES.dashboard}
          className={`${linkClass} text-stone-800 hover:bg-brand-50 hover:text-brand-900`}
        >
          {LABELS.dashboard}
        </Link>
        <Link
          href={ROUTES.settings}
          className={`${linkClass} text-stone-700 hover:bg-brand-50 hover:text-brand-900`}
        >
          {LABELS.settings}
        </Link>
        {shopLabel ? (
          <span
            className="hidden max-w-[8rem] truncate text-sm text-stone-500 xl:inline xl:max-w-[10rem]"
            title={session.email}
          >
            {shopLabel}
          </span>
        ) : null}
        <span className="hidden h-4 w-px bg-brand-200/80 sm:block" aria-hidden />
        <LogoutButton
          className={`${linkClass} text-stone-600 hover:bg-brand-50 hover:text-brand-900`}
          label={LABELS.logout}
        />
      </nav>
    );
  }

  return (
    <nav className="flex shrink-0 items-center gap-2 sm:gap-3" aria-label="Account">
      <Link
        href={ROUTES.login}
        className={`${linkClass} text-stone-700 hover:bg-brand-50 hover:text-brand-900`}
      >
        {LABELS.login}
      </Link>
      <CheckoutButton
        size="md"
        directCheckout
        className="!min-h-[44px] !px-4 !py-2.5 !text-sm sm:!px-4"
      >
        {CHECKOUT_CTA}
      </CheckoutButton>
    </nav>
  );
}

export function MobileHeaderAuth({
  session,
  onNavigate,
}: {
  session: { email: string; shopName: string } | null;
  onNavigate: () => void;
}) {
  const mobileLink =
    "flex min-h-[44px] items-center text-base font-medium text-brand-900";

  if (session) {
    return (
      <div className="mt-2 flex flex-col border-t border-brand-200/80 pt-2">
        <Link href={ROUTES.dashboard} className={mobileLink} onClick={onNavigate}>
          {LABELS.dashboard}
        </Link>
        <Link href={ROUTES.settings} className={mobileLink} onClick={onNavigate}>
          {LABELS.settings}
        </Link>
        {showShopName(session.shopName) ? (
          <p className="px-0 py-2 text-sm text-stone-500">{session.shopName}</p>
        ) : null}
        <LogoutButton
          className={`${mobileLink} text-left text-stone-700`}
          label={LABELS.logout}
        />
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-brand-200/80 pt-2">
      <Link href={ROUTES.login} className={mobileLink} onClick={onNavigate}>
        {LABELS.login}
      </Link>
      <CheckoutButton size="md" fullWidth directCheckout className="!min-h-[44px]" />
    </div>
  );
}
