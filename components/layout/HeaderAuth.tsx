"use client";

import Link from "next/link";
import { ROUTES, CHECKOUT_CTA } from "@/lib/constants";
import { CheckoutButton } from "@/components/CheckoutButton";
import { LogoutButton } from "@/components/auth/LogoutButton";

type HeaderAuthProps = {
  session: { email: string; shopName: string } | null;
};

export function HeaderAuth({ session }: HeaderAuthProps) {
  if (session) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        <Link
          href={ROUTES.settings}
          className="whitespace-nowrap text-xs font-medium text-slate-300 hover:text-brand-200 sm:text-sm"
        >
          연동 설정
        </Link>
        <Link
          href={ROUTES.dashboard}
          className="whitespace-nowrap text-xs font-medium text-slate-300 hover:text-brand-200 sm:text-sm"
        >
          대시보드
        </Link>
        <span
          className="hidden max-w-[120px] truncate text-xs text-slate-500 sm:inline sm:text-sm"
          title={session.email}
        >
          {session.shopName}
        </span>
        <LogoutButton className="whitespace-nowrap text-xs font-medium text-slate-400 hover:text-white sm:text-sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      <Link
        href={ROUTES.login}
        className="whitespace-nowrap text-xs font-medium text-brand-700 hover:text-brand-600 sm:text-sm"
      >
        로그인
      </Link>
      <Link
        href={ROUTES.signup}
        className="hvac-btn-secondary whitespace-nowrap !px-2.5 !py-1.5 !text-xs sm:!px-4 sm:!py-2 sm:!text-sm"
      >
        회원가입
      </Link>
      <CheckoutButton
        size="md"
        directCheckout
        className="!px-2.5 !py-1.5 !text-xs sm:!px-4 sm:!py-2 sm:!text-sm"
      >
        {CHECKOUT_CTA}
      </CheckoutButton>
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
  if (session) {
    return (
      <>
        <Link
          href={ROUTES.settings}
          className="text-sm font-medium text-slate-700"
          onClick={onNavigate}
        >
          연동 설정
        </Link>
        <Link
          href={ROUTES.dashboard}
          className="text-sm font-medium text-slate-700"
          onClick={onNavigate}
        >
          대시보드
        </Link>
        <p className="text-sm text-slate-500">{session.shopName}</p>
        <LogoutButton className="text-left text-sm font-medium text-slate-700" />
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
        로그인
      </Link>
      <Link
        href={ROUTES.signup}
        className="text-sm font-medium text-slate-700"
        onClick={onNavigate}
      >
        회원가입
      </Link>
      <CheckoutButton size="md" fullWidth directCheckout />
    </>
  );
}
