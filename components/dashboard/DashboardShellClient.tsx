"use client";

import { useEffect, useMemo, useState } from "react";
import { useShopState } from "@/lib/hooks/use-shop-state";
import {
  DashboardDataProvider,
  useDashboardData,
} from "@/lib/hooks/use-dashboard-data";
import { buildDashboardHomeMetrics } from "@/lib/dashboard-home-metrics";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SmsFailureAlert } from "@/components/dashboard/SmsFailureAlert";

type DashboardShellClientProps = {
  children: React.ReactNode;
};

function DashboardShellInner({ children }: DashboardShellClientProps) {
  const [shopName, setShopName] = useState("My shop");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { shopName?: string; email?: string } | null) => {
        if (d?.shopName?.trim()) setShopName(d.shopName.trim());
        else if (d?.email) setShopName(d.email.split("@")[0] ?? "My shop");
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const { shop } = useShopState();
  const {
    heroCalls,
    heroJobs,
    heroJobberBookings,
    jobberConnected,
    requestStatuses,
    tenantEvents,
  } = useDashboardData();

  const pendingReviewCount = useMemo(() => {
    const m = buildDashboardHomeMetrics(
      heroCalls,
      heroJobs,
      heroJobberBookings,
      shop,
      requestStatuses,
      jobberConnected,
    );
    return m.pendingReviewCount;
  }, [heroCalls, heroJobs, heroJobberBookings, shop, requestStatuses, jobberConnected]);

  const [renewingAgreementsCount, setRenewingAgreementsCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/shop/agreements", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { renewingCount?: number } | null) => {
        if (typeof d?.renewingCount === "number") setRenewingAgreementsCount(d.renewingCount);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <DashboardShell shopName={shopName} pendingReviewCount={pendingReviewCount} renewingAgreementsCount={renewingAgreementsCount}>
      {children}
      <SmsFailureAlert tenantEvents={tenantEvents} />
    </DashboardShell>
  );
}

export function DashboardShellClient(props: DashboardShellClientProps) {
  return (
    <DashboardDataProvider>
      <DashboardShellInner {...props} />
    </DashboardDataProvider>
  );
}
