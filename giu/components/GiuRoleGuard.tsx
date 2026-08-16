"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GIU_ROUTES, homePathForRole } from "@/giu/lib/routes";
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
  const href = useGiuHref();
  const { account, loading } = useGiuAuth();
  const { locale } = useGiuLocale();

  useEffect(() => {
    if (loading) return;

    if (requiredRole === "merchant") {
      if (!account) {
        router.replace(`${href(GIU_ROUTES.auth)}?role=merchant&next=${encodeURIComponent(pathname)}`);
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
  }, [account, loading, pathname, requiredRole, router, href]);

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
  const href = useGiuHref();
  const { account, loading } = useGiuAuth();
  const { locale } = useGiuLocale();

  useEffect(() => {
    if (loading || !account) return;
    router.replace(href(homePathForRole(account.role)));
  }, [account, loading, router, href]);

  if (loading) {
    return <GuardMessage text={t(locale, "loading")} />;
  }

  if (account) {
    return <GuardMessage text={t(locale, "loading")} />;
  }

  return <>{children}</>;
}
