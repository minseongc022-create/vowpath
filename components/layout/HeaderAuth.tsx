"use client";

import Link from "next/link";
import { ROUTES, CHECKOUT_CTA, SITE } from "@/lib/constants";
import { LanguageSettings } from "@/components/settings/LanguageSettings";
import { CheckoutButton } from "@/components/CheckoutButton";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useLocale } from "@/components/providers/LocaleProvider";

type HeaderAuthProps = {
  session: { email: string; shopName: string } | null;
};

function labels(isEnglish: boolean) {
  return isEnglish
    ? { settings: "Settings", dashboard: "Dashboard", login: "Log in", signup: "Sign up", logout: "Sign out" }
    : { settings: "설정", dashboard: "대시보드", login: "로그인", signup: "가입", logout: "로그아웃" };
}

function showShopName(shopName: string): boolean {
  const n = shopName.trim().toLowerCase();
  if (!n) return false;
  if (n === SITE.name.toLowerCase()) return false;
  if (n === "effiroad") return false;
  return true;
}

export function HeaderAuth({ session }: HeaderAuthProps) {
  const { isEnglish } = useLocale();
  const L = labels(isEnglish);

  if (session) {
    const shopLabel = showShopName(session.shopName) ? session.shopName : null;

    return (
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <LanguageSettings compact variant="light" />
        <span className="hidden h-4 w-px bg-brand-200/80 sm:block" aria-hidden />
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account">
          <Link
            href={ROUTES.settings}
            className="whitespace-nowrap text-xs font-medium text-stone-700 hover:text-brand-800 sm:text-sm"
          >
            {L.settings}
          </Link>
          <Link
            href={ROUTES.dashboard}
            className="whitespace-nowrap text-xs font-medium text-stone-700 hover:text-brand-800 sm:text-sm"
          >
            {L.dashboard}
          </Link>
          {shopLabel ? (
            <span
              className="hidden max-w-[7rem] truncate text-xs text-slate-500 lg:inline lg:max-w-[9rem]"
              title={session.email}
            >
              {shopLabel}
            </span>
          ) : null}
          <LogoutButton className="whitespace-nowrap text-xs font-medium text-stone-600 hover:text-brand-800 sm:text-sm" label={L.logout} />
        </nav>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <LanguageSettings compact variant="light" />
      <span className="hidden h-4 w-px bg-brand-200/80 sm:block" aria-hidden />
      <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account">
        <Link
          href={ROUTES.login}
          className="whitespace-nowrap text-xs font-medium text-brand-700 hover:text-brand-600 sm:text-sm"
        >
          {L.login}
        </Link>
        <Link
          href={ROUTES.signup}
          className="hvac-btn-secondary hidden whitespace-nowrap !px-3 !py-1.5 !text-xs sm:inline-flex sm:!text-sm"
        >
          {L.signup}
        </Link>
        <CheckoutButton
          size="md"
          directCheckout
          className="!px-3 !py-1.5 !text-xs sm:!px-4 sm:!py-2 sm:!text-sm"
        >
          {CHECKOUT_CTA}
        </CheckoutButton>
      </nav>
    </div>
  );
}

export function MobileHeaderAuth({
  session,
  onNavigate,
}: {
  session: { email: string; shopName: string } | null;
  onNavigate: () => void;
}) {
  const { isEnglish } = useLocale();
  const L = labels(isEnglish);

  if (session) {
    return (
      <>
        <Link
          href={ROUTES.settings}
          className="text-sm font-medium text-slate-700"
          onClick={onNavigate}
        >
          {L.settings}
        </Link>
        <Link
          href={ROUTES.dashboard}
          className="text-sm font-medium text-slate-700"
          onClick={onNavigate}
        >
          {L.dashboard}
        </Link>
        {showShopName(session.shopName) ? (
          <p className="text-sm text-slate-500">{session.shopName}</p>
        ) : null}
        <LogoutButton className="text-left text-sm font-medium text-slate-700" label={L.logout} />
      </>
    );
  }

  return (
    <>
      <Link
        href={ROUTES.login}
        className="text-sm font-medium text-slate-700"
        onClick={onNavigate}
      >
        {L.login}
      </Link>
      <Link
        href={ROUTES.signup}
        className="text-sm font-medium text-slate-700"
        onClick={onNavigate}
      >
        {L.signup}
      </Link>
      <CheckoutButton size="md" fullWidth directCheckout />
    </>
  );
}
