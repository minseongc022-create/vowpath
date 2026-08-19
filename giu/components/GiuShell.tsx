"use client";

import { usePathname } from "next/navigation";
import {
  isGiuAuthPath,
  isGiuMerchantAppPath,
  isGiuMerchantLandingPath,
} from "@/giu/lib/routes";
import { GiuAuthShell } from "./GiuAuthShell";
import { GiuCustomerShell } from "./GiuCustomerShell";
import { GiuMerchantShell } from "./GiuMerchantShell";
import { GiuRoleGuard } from "./GiuRoleGuard";

export function GiuShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isGiuAuthPath(pathname)) {
    return <GiuAuthShell>{children}</GiuAuthShell>;
  }

  if (isGiuMerchantLandingPath(pathname)) {
    return <GiuAuthShell>{children}</GiuAuthShell>;
  }

  if (isGiuMerchantAppPath(pathname)) {
    return (
      <GiuRoleGuard requiredRole="merchant">
        <GiuMerchantShell>{children}</GiuMerchantShell>
      </GiuRoleGuard>
    );
  }

  return (
    <GiuRoleGuard requiredRole="customer">
      <GiuCustomerShell>{children}</GiuCustomerShell>
    </GiuRoleGuard>
  );
}
