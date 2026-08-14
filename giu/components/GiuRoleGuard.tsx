"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GIU_ROUTES, homePathForRole } from "@/giu/lib/routes";
import { useGiuAuth } from "./GiuAuthProvider";

export function GiuRoleGuard({
  requiredRole,
  children,
}: {
  requiredRole: "customer" | "merchant";
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { account, loading } = useGiuAuth();

  useEffect(() => {
    if (loading) return;

    if (requiredRole === "merchant") {
      if (!account) {
        router.replace(`${GIU_ROUTES.auth}?role=merchant&next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (account.role !== "merchant") {
        router.replace(GIU_ROUTES.customer.home);
      }
      return;
    }

    if (account?.role === "merchant") {
      router.replace(GIU_ROUTES.merchant.home);
    }
  }, [account, loading, pathname, requiredRole, router]);

  if (loading) {
    return <p className="giu-page text-sm text-giu-muted">불러오는 중...</p>;
  }

  if (requiredRole === "merchant" && (!account || account.role !== "merchant")) {
    return null;
  }

  if (requiredRole === "customer" && account?.role === "merchant") {
    return null;
  }

  return <>{children}</>;
}

export function GiuAuthRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { account, loading } = useGiuAuth();

  useEffect(() => {
    if (loading || !account) return;
    router.replace(homePathForRole(account.role));
  }, [account, loading, router]);

  if (loading) {
    return <p className="giu-page text-sm text-giu-muted">불러오는 중...</p>;
  }

  if (account) return null;

  return <>{children}</>;
}
