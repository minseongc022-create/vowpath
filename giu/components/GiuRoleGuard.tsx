"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { t } from "@/giu/lib/i18n";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";

function GuardMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <p className="text-sm text-giu-muted">{text}</p>
    </div>
  );
}

export function GiuRoleGuard({
  requiredRole,
  children,
}: {
  requiredRole: "customer" | "merchant";
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const href = useGiuHref();
  const { account, loading } = useGiuAuth();
  const { locale } = useGiuLocale();

  useEffect(() => {
    if (loading) return;

    if (requiredRole === "merchant") {
      if (!account) {
        const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
        router.replace(`${href(GIU_ROUTES.auth)}?role=merchant&next=${encodeURIComponent(nextPath)}`);
        return;
      }
      if (account.role !== "merchant") {
        router.replace(href(GIU_ROUTES.customer.home));
      }
      return;
    }

    if (account?.role === "merchant") {
      router.replace(href(GIU_ROUTES.merchant.home));
    }
  }, [account, loading, pathname, searchParams, requiredRole, router, href]);

  if (requiredRole === "merchant") {
    if (loading) {
      return <GuardMessage text={t(locale, "loading")} />;
    }
    if (!account || account.role !== "merchant") {
      return <GuardMessage text={t(locale, "loading")} />;
    }
    return <>{children}</>;
  }

  if (!loading && account?.role === "merchant") {
    return <GuardMessage text={t(locale, "loading")} />;
  }

  return <>{children}</>;
}

export function GiuAuthRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const href = useGiuHref();
  const { account, loading } = useGiuAuth();
  const { locale } = useGiuLocale();
  const requestedRole =
    searchParams.get("role") === "merchant"
      ? "merchant"
      : searchParams.get("role") === "customer"
        ? "customer"
        : null;
  const forceLogin = searchParams.get("reauth") === "1";

  useEffect(() => {
    if (loading || !account || forceLogin) return;
    if (requestedRole && account.role !== requestedRole) return;
    router.replace(
      href(account.role === "merchant" ? GIU_ROUTES.merchant.home : GIU_ROUTES.customer.home),
    );
  }, [account, loading, requestedRole, forceLogin, router, href]);

  if (loading) {
    return <GuardMessage text={t(locale, "loading")} />;
  }

  if (account && !forceLogin && (!requestedRole || account.role === requestedRole)) {
    return <GuardMessage text={t(locale, "loading")} />;
  }

  return <>{children}</>;
}
