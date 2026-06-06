"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dashboardPage, settingsPage } from "@/lib/content";
import { ROUTES } from "@/lib/constants";
import { useShopState } from "@/lib/hooks/use-shop-state";
import {
  countRequiredComplete,
  countRequiredTotal,
  getIntegrationItems,
  isFullyLive,
} from "@/lib/integration-status";

type IntegrationStatusBannerProps = {
  theme?: "light" | "dark";
};

export function IntegrationStatusBanner({ theme = "light" }: IntegrationStatusBannerProps) {
  const { shop, ready } = useShopState();
  const [jobberConnected, setJobberConnected] = useState(false);
  const [contactComplete, setContactComplete] = useState(false);

  useEffect(() => {
    fetch("/api/jobber/status")
      .then((r) => r.json())
      .then((d: { connected?: boolean }) => setJobberConnected(Boolean(d.connected)))
      .catch(() => setJobberConnected(false));
    fetch("/api/account/contact")
      .then((r) => r.json())
      .then((d: { contactComplete?: boolean }) =>
        setContactComplete(Boolean(d.contactComplete)),
      )
      .catch(() => setContactComplete(false));
  }, []);

  const items = getIntegrationItems(shop, { jobberConnected, contactComplete });
  const requiredTotal = countRequiredTotal(items);
  const requiredDone = countRequiredComplete(items);
  const live = isFullyLive(shop, { jobberConnected, contactComplete });
  const pending = items.filter((item) => !item.optional && !item.done);

  const tone =
    theme === "dark"
      ? live
        ? "vow-dash-integration-banner vow-dash-integration-banner-live"
        : "vow-dash-integration-banner vow-dash-integration-banner-pending"
      : live
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className={`rounded-xl border px-5 py-4 text-sm ${tone} ${ready ? "" : "animate-pulse"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {live ? dashboardPage.setupComplete : dashboardPage.setupIncomplete}
          </p>
          {!live ? (
            <p className="mt-1">
              {settingsPage.progressSummary
                .replace("{done}", String(requiredDone))
                .replace("{total}", String(requiredTotal))}
              {pending.length > 0
                ? ` · 남은 항목: ${pending.map((item) => item.label).join(", ")}`
                : ""}
            </p>
          ) : null}
        </div>
        <Link
          href={ROUTES.settings}
          className={`relative z-10 shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm ${
            theme === "dark"
              ? "bg-white/10 text-brand-200 hover:bg-white/15"
              : "bg-white/80 text-brand-700 hover:bg-white"
          }`}
        >
          {live ? settingsPage.manageLink : dashboardPage.backOnboarding}
        </Link>
      </div>
    </div>
  );
}
