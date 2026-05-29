"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dashboardPage, settingsPage } from "@/lib/content";
import { ROUTES } from "@/lib/constants";
import { useShopState } from "@/lib/hooks/use-shop-state";
import {
  countComplete,
  getIntegrationItems,
  isFullyLive,
} from "@/lib/integration-status";

export function IntegrationStatusBanner() {
  const { shop, ready } = useShopState();
  const [jobberConnected, setJobberConnected] = useState(false);

  useEffect(() => {
    fetch("/api/jobber/status")
      .then((r) => r.json())
      .then((d: { connected?: boolean }) => setJobberConnected(Boolean(d.connected)))
      .catch(() => setJobberConnected(false));
  }, []);

  const items = getIntegrationItems(shop, { jobberConnected });
  const complete = countComplete(items);
  const live = isFullyLive(shop, jobberConnected);
  const pending = items.filter((item) => !item.done);

  return (
    <div
      className={`rounded-xl border px-5 py-4 text-sm ${
        live
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-amber-200 bg-amber-50 text-amber-900"
      } ${ready ? "" : "animate-pulse"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {live ? dashboardPage.setupComplete : dashboardPage.setupIncomplete}
          </p>
          {!live ? (
            <p className="mt-1">
              {settingsPage.progressSummary
                .replace("{done}", String(complete))
                .replace("{total}", String(items.length))}
              {pending.length > 0
                ? ` · ${pending.map((item) => item.label).join(", ")} 필요`
                : ""}
            </p>
          ) : null}
        </div>
        <Link
          href={ROUTES.settings}
          className="shrink-0 rounded-lg bg-white/80 px-3 py-1.5 text-sm font-semibold text-brand-700 shadow-sm hover:bg-white"
        >
          {live ? settingsPage.manageLink : dashboardPage.backOnboarding}
        </Link>
      </div>
    </div>
  );
}
